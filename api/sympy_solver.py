"""
SymPy solver — Vercel Python serverless function.

Endpoint: POST /api/sympy_solver
Body: {
  "expression": "x**2 - 5*x + 6",
  "type": "solve" | "simplify" | "expand" | "factorise" | "diff" | "integrate" | "evaluate" | "simultaneous",
  "variable": "x",           // optional, default "x"
  "expressions": ["...", "..."]  // for "simultaneous" type only
}

Response: {
  "success": true,
  "answers": ["3", "2"],
  "answersLatex": ["3", "2"]   // SymPy LaTeX strings
}
or:
{
  "success": false,
  "error": "Could not parse expression"
}

SECURITY — this endpoint is internal. Read before changing it.

SymPy's parse_expr() runs Python's eval() on its input. This file used to pass
the request body straight to it with no login and CORS open to every origin, so
anyone on the internet could run their own code on this server and read its
environment (Supabase service-role key, Stripe key, AI keys). Two independent
controls now stand in the way, and both must stay:

  1. Shared secret. Every request must carry the X-Internal-Secret header equal
     to the SYMPY_INTERNAL_SECRET environment variable. Only the Next.js server
     (lib/sympy-solver.ts) knows it. If the variable is not set the endpoint
     refuses everything — it fails closed, and the app falls back to Nerdamer.

  2. Input allow-list. The secret alone is not enough, because the expression
     is still text a pupil typed, relayed by our own server. validate_expression()
     only lets through digits, arithmetic operators, single-letter variables and
     a fixed list of maths functions. No dots next to names (attribute access),
     no underscores, no quotes, no other identifiers — so nothing that reaches
     eval() can name a builtin or reach an object's internals.
"""

from http.server import BaseHTTPRequestHandler
import hmac
import json
import os
import re

SECRET_ENV = "SYMPY_INTERNAL_SECRET"
SECRET_HEADER = "X-Internal-Secret"

MAX_BODY_BYTES = 10_000
MAX_EXPRESSION_CHARS = 200
MAX_EXPRESSIONS = 6
MAX_PAREN_DEPTH = 20
MAX_DIGIT_RUN = 15
# Powers are the one way a short expression becomes an enormous computation
# (9**9**9). Each numeric exponent is capped, and so is their combined product,
# because nested brackets multiply exponents together: ((9**999)**999)**999.
MAX_EXPONENT = 999
MAX_EXPONENT_PRODUCT = 1_000_000

# Multi-letter names that may reach the parser. Anything else made of letters is
# split into single-letter variables ("xy" -> "x*y"), which is what SymPy's
# implicit multiplication would do anyway — and guarantees that no other name
# (open, exec, getattr, chr, ...) is ever evaluated.
ALLOWED_NAMES = frozenset({
    "pi", "sqrt", "sin", "cos", "tan", "asin", "acos", "atan",
    "log", "ln", "exp", "Abs",
})

# No comma: the geometry tasks split on commas before parsing, so a value never
# needs one, and without it nothing can be called with a second argument (for
# example a precision of a million digits).
_ALLOWED_CHARS = re.compile(r"[0-9A-Za-z \t+\-*/^().]*")
_IDENTIFIER = re.compile(r"[A-Za-z][A-Za-z0-9]*")
_SUBSCRIPTED_VARIABLE = re.compile(r"[A-Za-z][0-9]{1,3}")
_VARIABLE_NAME = re.compile(r"[A-Za-z][A-Za-z0-9]{0,7}")
# A dot is only ever a decimal point: it must touch a digit, and must never sit
# next to a name or a bracket, which is how attribute access is written.
_LONE_DOT = re.compile(r"(?<![0-9])\.(?![0-9])")
_DOT_BESIDE_NAME = re.compile(r"[A-Za-z)]\s*\.|\.\s*[A-Za-z(]")


def _exponent_operand(s: str, start: int):
    """Return (operand_text, index_after) for the exponent that begins at start."""
    i = start
    n = len(s)
    while i < n and s[i].isspace():
        i += 1
    if i < n and s[i] in "+-":
        i += 1
    if i < n and s[i] == "(":
        depth = 0
        j = i
        while j < n:
            if s[j] == "(":
                depth += 1
            elif s[j] == ")":
                depth -= 1
                if depth == 0:
                    return s[i + 1:j], j + 1
            j += 1
        raise ValueError("Expression has unbalanced brackets")
    j = i
    while j < n and (s[j].isalnum() or s[j] == "."):
        j += 1
    return s[i:j], j


def _check_powers(s: str) -> None:
    product = 1
    pos = s.find("**")
    while pos != -1:
        operand, after = _exponent_operand(s, pos + 2)
        if "**" in operand:
            raise ValueError("Nested powers are not allowed")
        rest = s[after:].lstrip()
        if rest.startswith("**"):
            raise ValueError("Stacked powers are not allowed")
        # A symbolic exponent (x**n) stays symbolic, so only numbers can blow up.
        size = 1
        for literal in re.findall(r"[0-9]+", operand):
            size *= max(int(literal), 1)
        if size > MAX_EXPONENT:
            raise ValueError("Exponent is too large")
        product *= size
        if product > MAX_EXPONENT_PRODUCT:
            raise ValueError("Powers are too large in combination")
        pos = s.find("**", pos + 2)


def validate_expression(raw) -> str:
    """
    Return a version of `raw` that is safe to hand to parse_expr(), or raise
    ValueError. This is the only thing between pupil-typed text and eval(), so it
    is an allow-list: anything not recognised as plain maths is refused.
    """
    if not isinstance(raw, str):
        raise ValueError("Expression must be text")
    s = raw.strip()
    if not s:
        raise ValueError("Expression is empty")
    if len(s) > MAX_EXPRESSION_CHARS:
        raise ValueError("Expression is too long")
    if not _ALLOWED_CHARS.fullmatch(s):
        raise ValueError("Expression contains characters that are not allowed")
    if _LONE_DOT.search(s) or _DOT_BESIDE_NAME.search(s):
        raise ValueError("A dot is only allowed as a decimal point")
    if re.search(r"[0-9]{%d,}" % (MAX_DIGIT_RUN + 1), s):
        raise ValueError("Number is too long")
    if re.search(r"\([ \t]*\)", s):
        raise ValueError("Empty brackets are not allowed")
    # Python-only spellings that are not maths: floor division (//), and an
    # operator straight after an opening bracket, which is how argument
    # unpacking is written — f(*x), f(**x).
    if "//" in s or re.search(r"(?:^|\()[ \t]*[*/^]", s):
        raise ValueError("Operator is not allowed there")

    depth = 0
    for ch in s:
        if ch == "(":
            depth += 1
            if depth > MAX_PAREN_DEPTH:
                raise ValueError("Expression is nested too deeply")
        elif ch == ")":
            depth -= 1
            if depth < 0:
                raise ValueError("Expression has unbalanced brackets")
    if depth != 0:
        raise ValueError("Expression has unbalanced brackets")

    def _rewrite(match):
        name = match.group(0)
        if len(name) == 1 or name in ALLOWED_NAMES:
            return name
        if _SUBSCRIPTED_VARIABLE.fullmatch(name):
            return name
        if name.isalpha():
            return "*".join(name)
        raise ValueError("Name is not allowed: %s" % name)

    s = _IDENTIFIER.sub(_rewrite, s)
    _check_powers(s)
    return s


def validate_variable(raw) -> str:
    if not isinstance(raw, str) or not _VARIABLE_NAME.fullmatch(raw):
        raise ValueError("Variable name is not allowed")
    return raw


def authorise(provided) -> int:
    """Return 0 when the caller may proceed, otherwise the HTTP status to send."""
    expected = os.environ.get(SECRET_ENV, "")
    if not expected:
        return 503  # not configured: refuse everyone rather than serve everyone
    if not isinstance(provided, str) or not hmac.compare_digest(
        provided.encode("utf-8"), expected.encode("utf-8")
    ):
        return 401
    return 0

# ─────────────────────────────────────────────────────────────────────────────
# Lazy import so that Vercel can load the module without crashing even if
# sympy is not yet available in the cold-start worker.
# ─────────────────────────────────────────────────────────────────────────────

def _import_sympy():
    import sympy as sp
    from sympy.parsing.sympy_parser import (
        parse_expr,
        standard_transformations,
        implicit_multiplication_application,
    )
    return sp, parse_expr, (standard_transformations + (implicit_multiplication_application,))


def dispatch(body: dict) -> dict:
    try:
        sp, parse_expr, transforms = _import_sympy()
    except ImportError as e:
        return {"success": False, "error": f"SymPy not available: {e}"}

    task = body.get("type", "solve")
    var_name = body.get("variable", "x")
    expr_str = body.get("expression", "")

    # Every branch below splits and inspects these as text before parsing.
    if not isinstance(task, str) or not isinstance(expr_str, str):
        return {"success": False, "error": "Invalid request"}
    if len(expr_str) > MAX_EXPRESSION_CHARS:
        return {"success": False, "error": "Expression is too long"}

    # Local helpers ────────────────────────────────────────────────────────────

    def sym(name: str):
        return sp.Symbol(validate_variable(name))

    def safe_parse(s: str):
        """
        Parse with implicit-multiplication support.

        Every string that reaches parse_expr() — and therefore eval() — goes
        through here. Do not call parse_expr() anywhere else in this file.
        """
        return parse_expr(validate_expression(s), transformations=transforms)

    def latex_list(items):
        return [sp.latex(i) for i in items]

    def numeric_result(value):
        """
        One answer for a numeric result, and whether it is exact.

        A whole number or fraction is returned exactly ("5/4"), so the caller
        can compare it exactly. Anything involving pi or a root is returned as
        a 15-significant-figure decimal and flagged inexact, so the caller
        knows to accept a correct rounding of it and nothing else. This used to
        return both forms as two "answers", and a 6-figure decimal that a
        correctly rounded answer could not be told apart from a wrong one.
        """
        value = sp.nsimplify(value, rational=True) if value.is_Float else value
        if value.is_Rational:
            return {
                "success": True,
                "answers": [str(value)],
                "answersLatex": [sp.latex(value)],
                "exact": True,
            }
        approx = sp.N(value, 15)
        if not approx.is_real or approx.has(sp.zoo, sp.nan, sp.oo):
            return {"success": False, "error": "No real value"}
        return {
            "success": True,
            "answers": [str(approx)],
            "answersLatex": [sp.latex(value)],
            "exact": False,
        }

    def str_list(items):
        return [str(i) for i in items]

    # Dispatch ─────────────────────────────────────────────────────────────────

    try:
        v = sym(var_name)

        if task == "solve":
            # An equation is split on "=" BEFORE parsing. The whole string used
            # to be parsed first, and "2*x + 4 = 10" is not an expression — so
            # every equation raised a syntax error and SymPy never solved one.
            if "=" in expr_str:
                lhs_str, rhs_str = expr_str.split("=", 1)
                lhs = safe_parse(lhs_str.strip())
                rhs = safe_parse(rhs_str.strip())
                solutions = sp.solve(lhs - rhs, v)
            else:
                solutions = sp.solve(safe_parse(expr_str), v)

            if not solutions:
                return {"success": False, "error": "No solutions found"}
            # At school level "x = i" is not an answer; "no real solutions" is.
            if any(not sol.is_real for sol in solutions):
                return {"success": False, "error": "No real solutions"}

            return {
                "success": True,
                "answers": str_list(solutions),
                "answersLatex": latex_list(solutions),
            }

        elif task == "simplify":
            result = sp.simplify(safe_parse(expr_str))
            return {
                "success": True,
                "answers": [str(result)],
                "answersLatex": [sp.latex(result)],
            }

        elif task == "expand":
            result = sp.expand(safe_parse(expr_str))
            return {
                "success": True,
                "answers": [str(result)],
                "answersLatex": [sp.latex(result)],
            }

        elif task == "factorise":
            result = sp.factor(safe_parse(expr_str))
            return {
                "success": True,
                "answers": [str(result)],
                "answersLatex": [sp.latex(result)],
            }

        elif task == "diff":
            expr = safe_parse(expr_str)
            result = sp.diff(expr, v)
            return {
                "success": True,
                "answers": [str(result)],
                "answersLatex": [sp.latex(result)],
            }

        elif task == "integrate":
            expr = safe_parse(expr_str)
            result = sp.integrate(expr, v)
            return {
                "success": True,
                "answers": [f"{result} + C"],
                "answersLatex": [sp.latex(result) + " + C"],
            }

        elif task == "evaluate":
            return numeric_result(safe_parse(expr_str))

        elif task == "simultaneous":
            expressions = body.get("expressions", [])
            if (
                not isinstance(expressions, list)
                or len(expressions) > MAX_EXPRESSIONS
                or not all(isinstance(e, str) for e in expressions)
            ):
                return {"success": False, "error": "Invalid request"}
            if len(expressions) < 2:
                return {"success": False, "error": "Need at least 2 expressions for simultaneous"}

            equations = []
            for eq_str in expressions:
                if "=" in eq_str:
                    lhs_str, rhs_str = eq_str.split("=", 1)
                    lhs = safe_parse(lhs_str.strip())
                    rhs = safe_parse(rhs_str.strip())
                    equations.append(lhs - rhs)
                else:
                    equations.append(safe_parse(eq_str))

            # Detect all variables across all equations
            all_vars = set()
            for eq in equations:
                all_vars.update(eq.free_symbols)
            sorted_vars = sorted(all_vars, key=lambda s: s.name)

            solutions = sp.solve(equations, sorted_vars)

            if isinstance(solutions, dict):
                answer_strs = [f"{k} = {v}" for k, v in solutions.items()]
                answer_latex = [f"{sp.latex(k)} = {sp.latex(v)}" for k, v in solutions.items()]
            elif isinstance(solutions, list) and solutions and isinstance(solutions[0], tuple):
                answer_strs = [
                    ", ".join(f"{var} = {val}" for var, val in zip(sorted_vars, sol))
                    for sol in solutions
                ]
                answer_latex = [
                    ", ".join(f"{sp.latex(var)} = {sp.latex(val)}" for var, val in zip(sorted_vars, sol))
                    for sol in solutions
                ]
            else:
                return {"success": False, "error": "Could not solve simultaneous equations"}

            return {
                "success": True,
                "answers": answer_strs,
                "answersLatex": answer_latex,
            }

        # ── Geometry tasks ─────────────────────────────────────────────────

        elif task == "pythagoras":
            # expression: "a=3,b=4" or "a=3,c=5" — solve for the missing side
            parts = {}
            for pair in expr_str.split(","):
                k, val = pair.strip().split("=")
                parts[k.strip()] = safe_parse(val.strip())

            a = parts.get("a")
            b = parts.get("b")
            c = parts.get("c")  # hypotenuse

            if a is not None and b is not None:
                result = sp.sqrt(a**2 + b**2)
                label = "c (hypotenuse)"
            elif a is not None and c is not None:
                result = sp.sqrt(c**2 - a**2)
                label = "b"
            elif b is not None and c is not None:
                result = sp.sqrt(c**2 - b**2)
                label = "a"
            else:
                return {"success": False, "error": "Need exactly 2 of a, b, c for Pythagoras"}

            answer = numeric_result(sp.simplify(result))
            if answer.get("success"):
                answer["label"] = label
            return answer

        elif task == "triangle_angles":
            # expression: "A=40,B=60" — solve for missing angle(s)
            # OR "A=40,B=60,C=?" — explicit unknown
            parts = {}
            for pair in expr_str.split(","):
                k, val = pair.strip().split("=")
                k = k.strip().upper()
                val = val.strip()
                if val != "?":
                    parts[k] = safe_parse(val)

            known_sum = sum(parts.values())
            unknown_count = 3 - len(parts)

            if unknown_count == 1:
                missing = sp.Integer(180) - known_sum
                # Determine which angle is missing
                all_labels = {"A", "B", "C"}
                missing_label = (all_labels - set(parts.keys())).pop()
                return {
                    "success": True,
                    "answers": [str(missing)],
                    "answersLatex": [sp.latex(missing)],
                    "label": missing_label,
                }
            elif unknown_count == 2:
                # Can only solve if one unknown is expressed in terms of another
                return {"success": False, "error": "Need at least 2 known angles"}
            else:
                return {"success": False, "error": "Need at least 1 known angle"}

        elif task == "area":
            # expression: "shape=triangle,base=5,height=3"
            # OR "shape=circle,radius=7"
            # OR "shape=rectangle,length=4,width=6"
            # OR "shape=trapezium,a=4,b=6,height=3"
            params = {}
            for pair in expr_str.split(","):
                k, val = pair.strip().split("=")
                params[k.strip().lower()] = val.strip()

            shape = params.get("shape", "rectangle")

            if shape == "triangle":
                base = safe_parse(params["base"])
                height = safe_parse(params["height"])
                result = sp.Rational(1, 2) * base * height
            elif shape == "rectangle":
                length = safe_parse(params.get("length", params.get("l", "0")))
                width = safe_parse(params.get("width", params.get("w", "0")))
                result = length * width
            elif shape == "circle":
                r = safe_parse(params.get("radius", params.get("r", "0")))
                result = sp.pi * r**2
            elif shape == "trapezium":
                a = safe_parse(params["a"])
                b = safe_parse(params["b"])
                h = safe_parse(params["height"])
                result = sp.Rational(1, 2) * (a + b) * h
            elif shape == "parallelogram":
                base = safe_parse(params["base"])
                height = safe_parse(params["height"])
                result = base * height
            elif shape == "sector":
                r = safe_parse(params.get("radius", params.get("r", "0")))
                theta = safe_parse(params.get("angle", params.get("theta", "0")))
                result = (theta / sp.Integer(360)) * sp.pi * r**2
            else:
                return {"success": False, "error": f"Unknown shape: {shape}"}

            return numeric_result(sp.simplify(result))

        elif task == "volume":
            # expression: "shape=cuboid,length=4,width=3,height=5"
            # OR "shape=cylinder,radius=3,height=10"
            # OR "shape=sphere,radius=5"
            # OR "shape=cone,radius=3,height=8"
            # OR "shape=prism,area=12,length=6"
            params = {}
            for pair in expr_str.split(","):
                k, val = pair.strip().split("=")
                params[k.strip().lower()] = val.strip()

            shape = params.get("shape", "cuboid")

            if shape == "cuboid":
                l = safe_parse(params.get("length", params.get("l", "0")))
                w = safe_parse(params.get("width", params.get("w", "0")))
                h = safe_parse(params.get("height", params.get("h", "0")))
                result = l * w * h
            elif shape == "cylinder":
                r = safe_parse(params.get("radius", params.get("r", "0")))
                h = safe_parse(params.get("height", params.get("h", "0")))
                result = sp.pi * r**2 * h
            elif shape == "sphere":
                r = safe_parse(params.get("radius", params.get("r", "0")))
                result = sp.Rational(4, 3) * sp.pi * r**3
            elif shape == "cone":
                r = safe_parse(params.get("radius", params.get("r", "0")))
                h = safe_parse(params.get("height", params.get("h", "0")))
                result = sp.Rational(1, 3) * sp.pi * r**2 * h
            elif shape == "prism":
                area = safe_parse(params.get("area", params.get("a", "0")))
                length = safe_parse(params.get("length", params.get("l", "0")))
                result = area * length
            elif shape == "pyramid":
                area = safe_parse(params.get("area", params.get("a", "0")))
                h = safe_parse(params.get("height", params.get("h", "0")))
                result = sp.Rational(1, 3) * area * h
            else:
                return {"success": False, "error": f"Unknown shape: {shape}"}

            return numeric_result(sp.simplify(result))

        elif task == "trig_solve":
            # expression: "func=sin,angle=30" → evaluate sin(30°)
            # OR "func=sin,opposite=3,hypotenuse=5" → find angle
            # OR "func=cos,adjacent=4,hypotenuse=5" → find angle
            params = {}
            for pair in expr_str.split(","):
                k, val = pair.strip().split("=")
                params[k.strip().lower()] = val.strip()

            func = params.get("func", "sin")

            if "angle" in params:
                # Evaluate trig function at given angle (degrees)
                angle_deg = safe_parse(params["angle"])
                angle_rad = sp.rad(angle_deg)
                if func == "sin":
                    result = sp.sin(angle_rad)
                elif func == "cos":
                    result = sp.cos(angle_rad)
                elif func == "tan":
                    result = sp.tan(angle_rad)
                else:
                    return {"success": False, "error": f"Unknown trig function: {func}"}
            elif "opposite" in params and "hypotenuse" in params:
                opp = safe_parse(params["opposite"])
                hyp = safe_parse(params["hypotenuse"])
                result = sp.deg(sp.asin(opp / hyp))
            elif "adjacent" in params and "hypotenuse" in params:
                adj = safe_parse(params["adjacent"])
                hyp = safe_parse(params["hypotenuse"])
                result = sp.deg(sp.acos(adj / hyp))
            elif "opposite" in params and "adjacent" in params:
                opp = safe_parse(params["opposite"])
                adj = safe_parse(params["adjacent"])
                result = sp.deg(sp.atan(opp / adj))
            else:
                return {"success": False, "error": "Need angle or two side lengths"}

            return numeric_result(sp.simplify(result))

        elif task == "circle_property":
            # expression: "property=circumference,radius=7"
            # OR "property=arc_length,radius=5,angle=72"
            # OR "property=sector_area,radius=5,angle=72"
            params = {}
            for pair in expr_str.split(","):
                k, val = pair.strip().split("=")
                params[k.strip().lower()] = val.strip()

            prop = params.get("property", "circumference")
            r = safe_parse(params.get("radius", params.get("r", "0")))

            if prop == "circumference":
                result = 2 * sp.pi * r
            elif prop == "diameter":
                result = 2 * r
            elif prop == "area":
                result = sp.pi * r**2
            elif prop == "arc_length":
                theta = safe_parse(params.get("angle", params.get("theta", "0")))
                result = (theta / sp.Integer(360)) * 2 * sp.pi * r
            elif prop == "sector_area":
                theta = safe_parse(params.get("angle", params.get("theta", "0")))
                result = (theta / sp.Integer(360)) * sp.pi * r**2
            else:
                return {"success": False, "error": f"Unknown property: {prop}"}

            return numeric_result(sp.simplify(result))

        else:
            return {"success": False, "error": f"Unknown task type: {task}"}

    except Exception as e:
        return {"success": False, "error": str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# Vercel Python handler
# ─────────────────────────────────────────────────────────────────────────────

class handler(BaseHTTPRequestHandler):
    # No CORS headers and no OPTIONS handler, deliberately: this is called
    # server-to-server by lib/sympy-solver.ts and never from a browser.

    def do_POST(self):
        # Authorise before reading the body, so an outsider cannot make the
        # function parse or allocate anything.
        denied = authorise(self.headers.get(SECRET_HEADER))
        if denied:
            message = "Solver is not configured" if denied == 503 else "Unauthorised"
            self._respond(denied, {"success": False, "error": message})
            return

        try:
            content_length = int(self.headers.get("Content-Length", 0))
        except ValueError:
            content_length = -1
        if content_length < 0 or content_length > MAX_BODY_BYTES:
            self._respond(413, {"success": False, "error": "Request is too large"})
            return

        try:
            body = json.loads(self.rfile.read(content_length))
        except Exception:
            self._respond(400, {"success": False, "error": "Bad request"})
            return
        if not isinstance(body, dict):
            self._respond(400, {"success": False, "error": "Bad request"})
            return

        result = dispatch(body)
        self._respond(200, result)

    def _respond(self, status: int, data: dict):
        payload = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, format, *args):
        pass  # suppress default access logs
