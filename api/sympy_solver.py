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

            simplified = sp.simplify(result)
            decimal_val = sp.N(simplified, 6)
            return {
                "success": True,
                "answers": [str(simplified), str(decimal_val)],
                "answersLatex": [sp.latex(simplified), sp.latex(decimal_val)],
                "label": label,
            }

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

            simplified = sp.simplify(result)
            decimal_val = sp.N(simplified, 6)
            return {
                "success": True,
                "answers": [str(simplified), str(decimal_val)],
                "answersLatex": [sp.latex(simplified), sp.latex(decimal_val)],
            }

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

            simplified = sp.simplify(result)
            decimal_val = sp.N(simplified, 6)
            return {
                "success": True,
                "answers": [str(simplified), str(decimal_val)],
                "answersLatex": [sp.latex(simplified), sp.latex(decimal_val)],
            }

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

            simplified = sp.simplify(result)
            decimal_val = sp.N(simplified, 6)
            return {
                "success": True,
                "answers": [str(simplified), str(decimal_val)],
                "answersLatex": [sp.latex(simplified), sp.latex(decimal_val)],
            }

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

            simplified = sp.simplify(result)
            decimal_val = sp.N(simplified, 6)
            return {
                "success": True,
                "answers": [str(simplified), str(decimal_val)],
                "answersLatex": [sp.latex(simplified), sp.latex(decimal_val)],
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
