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
"""

from http.server import BaseHTTPRequestHandler
import json

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

    # Local helpers ────────────────────────────────────────────────────────────

    def sym(name: str):
        return sp.Symbol(name)

    def safe_parse(s: str):
        """Parse with implicit-multiplication support."""
        return parse_expr(s, transformations=transforms)

    def latex_list(items):
        return [sp.latex(i) for i in items]

    def str_list(items):
        return [str(i) for i in items]

    # Dispatch ─────────────────────────────────────────────────────────────────

    try:
        v = sym(var_name)

        if task == "solve":
            expr = safe_parse(expr_str)
            # If the expression contains an = sign we treat it as an equation
            if "=" in expr_str:
                lhs_str, rhs_str = expr_str.split("=", 1)
                lhs = safe_parse(lhs_str.strip())
                rhs = safe_parse(rhs_str.strip())
                solutions = sp.solve(lhs - rhs, v)
            else:
                solutions = sp.solve(expr, v)

            if not solutions:
                return {"success": False, "error": "No solutions found"}

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
            result = sp.N(safe_parse(expr_str))
            return {
                "success": True,
                "answers": [str(result)],
                "answersLatex": [sp.latex(result)],
            }

        elif task == "simultaneous":
            expressions = body.get("expressions", [])
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

        else:
            return {"success": False, "error": f"Unknown task type: {task}"}

    except Exception as e:
        return {"success": False, "error": str(e)}


# ─────────────────────────────────────────────────────────────────────────────
# Vercel Python handler
# ─────────────────────────────────────────────────────────────────────────────

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            raw_body = self.rfile.read(content_length)
            body = json.loads(raw_body)
        except Exception as e:
            self._respond(400, {"success": False, "error": f"Bad request: {e}"})
            return

        result = dispatch(body)
        self._respond(200, result)

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors_headers()
        self.end_headers()

    def _cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _respond(self, status: int, data: dict):
        payload = json.dumps(data).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self._cors_headers()
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, format, *args):
        pass  # suppress default access logs
