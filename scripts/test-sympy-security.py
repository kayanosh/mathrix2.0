"""
Security regression tests for api/sympy_solver.py.

    python3 scripts/test-sympy-security.py

Standard library only — SymPy does not need to be installed, because these test
the two controls that sit IN FRONT of SymPy: the shared-secret check and the
input allow-list. If either of these tests fails, the endpoint can run
attacker-supplied code again. See the SECURITY note at the top of that file.

This lives in scripts/ and not in api/ on purpose: Vercel deploys every .py file
under api/ as a public function.
"""

import ast
import importlib.util
import json
import os
import random
import threading
import unittest
from http.client import HTTPConnection
from http.server import HTTPServer
from pathlib import Path

SOLVER_PATH = Path(__file__).resolve().parent.parent / "api" / "sympy_solver.py"
spec = importlib.util.spec_from_file_location("sympy_solver", SOLVER_PATH)
solver = importlib.util.module_from_spec(spec)
spec.loader.exec_module(solver)

validate = solver.validate_expression

# The only shapes a validated expression may contain once Python parses it.
# Notably absent: Attribute (x.y), Subscript (x[0]), Lambda, strings, keywords.
SAFE_NODES = (
    ast.Expression, ast.BinOp, ast.UnaryOp, ast.Call, ast.Name, ast.Constant,
    ast.Load, ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Pow, ast.BitXor,
    ast.UAdd, ast.USub,
)


def is_allowed_name(name):
    return (
        len(name) == 1
        or name in solver.ALLOWED_NAMES
        or solver._SUBSCRIPTED_VARIABLE.fullmatch(name) is not None
    )


def assert_only_plain_maths(test, expression):
    """If Python can parse it, it must be nothing but arithmetic on safe names."""
    try:
        tree = ast.parse(expression, mode="eval")
    except SyntaxError:
        return  # e.g. "2x" — implicit multiplication, which only SymPy understands
    for node in ast.walk(tree):
        test.assertIsInstance(node, SAFE_NODES, "%r produced %s" % (expression, node))
        if isinstance(node, ast.Name):
            test.assertTrue(is_allowed_name(node.id), "%r names %r" % (expression, node.id))
        if isinstance(node, ast.Constant):
            test.assertIsInstance(node.value, (int, float, complex))
        if isinstance(node, ast.Call):
            test.assertEqual(node.keywords, [])
            test.assertLessEqual(len(node.args), 1)


class AcceptsOrdinaryMaths(unittest.TestCase):
    def test_expressions_the_app_sends(self):
        for expression in [
            "x**2 - 5*x + 6",
            "2*x + 3",
            "(3)/(4)",
            "sqrt(16)",
            "2*pi",
            "3.5*2",
            "0.25 + .5",
            "x**(1/2)",
            "sin(30) + cos(60)",
            "x**4 + x**3 + x**2 - x",
            "(x + 2)**8",
            "3*(x+1)",
        ]:
            self.assertEqual(validate(expression), expression)

    def test_unknown_words_become_single_letter_variables(self):
        self.assertEqual(validate("2*xy"), "2*x*y")
        self.assertEqual(validate("ab + c"), "a*b + c")

    def test_subscripted_variables_survive(self):
        self.assertEqual(validate("x1 + x2"), "x1 + x2")


class RefusesCodeExecution(unittest.TestCase):
    def test_rejected_outright(self):
        for attack in [
            "__import__('os').system('id')",
            "open('/etc/passwd').read()",
            "x.__class__",
            "x.real",
            "(1).real",
            "1 .real",
            "1.0.real",
            "().__class__",
            "getattr(x, y)",
            "N(pi, 999999)",
            "x[0]",
            "{1}",
            "'a'",
            '"a"',
            "lambda: 1",
            "x; y",
            "x = 1",
            "x == 1",
            "x\ny",
            "x\\y",
            "f'{x}'",
            "()",
            "S()",
            "7//2",
            "S(*x)",
            "S(**x)",
            "*x",
            "ab12",
            "",
            "   ",
        ]:
            with self.assertRaises(ValueError, msg=attack):
                validate(attack)

    def test_non_strings_are_rejected(self):
        for value in [None, 1, ["x"], {"x": 1}, b"x"]:
            with self.assertRaises(ValueError):
                validate(value)

    def test_builtin_names_are_neutralised(self):
        # These contain only allowed characters, so they are not rejected — but
        # the name is broken into single letters and can never be looked up.
        for name in ["exec", "eval", "open", "chr", "str", "dir", "vars", "globals"]:
            result = validate("%s(x)" % name)
            self.assertNotIn(name, result)
            assert_only_plain_maths(self, result)
        # S() would sympify (eval) a string — make sure nothing can build one.
        self.assertNotIn("chr", validate("S(chr(111))"))
        # Keywords go the same way: no conditional, loop or lambda survives.
        self.assertEqual(validate("x if y else z"), "x i*f y e*l*s*e z")
        self.assertEqual(validate("lambda x"), "l*a*m*b*d*a x")

    def test_fuzz_never_lets_anything_but_arithmetic_through(self):
        rng = random.Random(20261118)
        alphabet = list("0123456789xyzeEISNOQ+-*/^(). _'\"[]{},:;=\\\n") + [
            "**", "__", "import", "open", "exec", "eval", "getattr", "lambda",
            "sqrt", "pi", "sin", ".real", "class", "os", "chr", "S(", "N(",
        ]
        passed = 0
        for _ in range(40000):
            candidate = "".join(rng.choice(alphabet) for _ in range(rng.randint(1, 14)))
            try:
                result = validate(candidate)
            except ValueError:
                continue
            passed += 1
            self.assertNotIn("_", result)
            self.assertNotIn("'", result)
            assert_only_plain_maths(self, result)
        self.assertGreater(passed, 500, "fuzz should exercise the accept path too")


class RefusesRunawayComputation(unittest.TestCase):
    def test_huge_powers(self):
        for attack in [
            "9**9**9",
            "9**(9**9)",
            "2**99999",
            "2**(999*999)",
            "((9**999)**999)**999",
            "x**-99999",
        ]:
            with self.assertRaises(ValueError, msg=attack):
                validate(attack)

    def test_size_limits(self):
        with self.assertRaises(ValueError):
            validate("1+" * 150 + "1")
        with self.assertRaises(ValueError):
            validate("(" * 30 + "1" + ")" * 30)
        with self.assertRaises(ValueError):
            validate("1" * 40)
        with self.assertRaises(ValueError):
            validate("((1)")


class VariableNames(unittest.TestCase):
    def test_variable(self):
        self.assertEqual(solver.validate_variable("x"), "x")
        for bad in ["", "x.y", "__class__", "x y", None, 3, "a" * 20]:
            with self.assertRaises(ValueError):
                solver.validate_variable(bad)


class SharedSecret(unittest.TestCase):
    def setUp(self):
        self._saved = os.environ.pop(solver.SECRET_ENV, None)

    def tearDown(self):
        os.environ.pop(solver.SECRET_ENV, None)
        if self._saved is not None:
            os.environ[solver.SECRET_ENV] = self._saved

    def test_fails_closed_when_not_configured(self):
        self.assertEqual(solver.authorise("anything"), 503)
        self.assertEqual(solver.authorise(None), 503)
        self.assertEqual(solver.authorise(""), 503)

    def test_requires_the_exact_secret(self):
        os.environ[solver.SECRET_ENV] = "correct-horse"
        self.assertEqual(solver.authorise("correct-horse"), 0)
        for wrong in [None, "", "correct-hors", "correct-horse ", "CORRECT-HORSE"]:
            self.assertEqual(solver.authorise(wrong), 401)


class OverHttp(unittest.TestCase):
    """The real handler, on a real socket, exactly as an outsider would reach it."""

    @classmethod
    def setUpClass(cls):
        cls.server = HTTPServer(("127.0.0.1", 0), solver.handler)
        cls.port = cls.server.server_address[1]
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def setUp(self):
        self._saved = os.environ.pop(solver.SECRET_ENV, None)

    def tearDown(self):
        os.environ.pop(solver.SECRET_ENV, None)
        if self._saved is not None:
            os.environ[solver.SECRET_ENV] = self._saved

    def request(self, method, body=None, secret=None):
        headers = {"Content-Type": "application/json"}
        if secret is not None:
            headers[solver.SECRET_HEADER] = secret
        connection = HTTPConnection("127.0.0.1", self.port, timeout=10)
        try:
            connection.request(method, "/api/sympy_solver", body=body, headers=headers)
            response = connection.getresponse()
            return response.status, dict(response.getheaders()), response.read()
        finally:
            connection.close()

    def test_refuses_everyone_when_secret_is_not_configured(self):
        status, _, _ = self.request("POST", json.dumps({"expression": "1+1"}), secret="x")
        self.assertEqual(status, 503)

    def test_refuses_callers_without_the_secret(self):
        os.environ[solver.SECRET_ENV] = "s3cret"
        payload = json.dumps({"expression": "__import__('os').system('id')"})
        for secret in [None, "", "wrong"]:
            status, _, body = self.request("POST", payload, secret=secret)
            self.assertEqual(status, 401)
            self.assertEqual(json.loads(body)["success"], False)

    def test_no_cors_and_no_preflight(self):
        os.environ[solver.SECRET_ENV] = "s3cret"
        status, headers, _ = self.request("OPTIONS")
        self.assertEqual(status, 501)
        _, headers, _ = self.request("POST", "{}", secret="s3cret")
        self.assertNotIn("access-control-allow-origin", {k.lower() for k in headers})

    def test_rejects_oversized_and_malformed_bodies(self):
        os.environ[solver.SECRET_ENV] = "s3cret"
        big = json.dumps({"expression": "1" * (solver.MAX_BODY_BYTES + 10)})
        self.assertEqual(self.request("POST", big, secret="s3cret")[0], 413)
        self.assertEqual(self.request("POST", "not json", secret="s3cret")[0], 400)
        self.assertEqual(self.request("POST", "[1, 2]", secret="s3cret")[0], 400)

    def test_authorised_caller_gets_through_to_the_solver(self):
        os.environ[solver.SECRET_ENV] = "s3cret"
        payload = json.dumps({"expression": "__import__('os').system('id')", "type": "simplify"})
        status, _, body = self.request("POST", payload, secret="s3cret")
        # 200 with success:false either way: refused by the allow-list where
        # SymPy is installed, or "SymPy not available" where it is not.
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body)["success"], False)


if __name__ == "__main__":
    unittest.main(verbosity=2)
