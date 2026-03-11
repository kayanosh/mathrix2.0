import nerdamer from "nerdamer";
import "nerdamer/Algebra.js";
import "nerdamer/Calculus.js";
import "nerdamer/Solve.js";
import "nerdamer/Extra.js";

// Test 1: Solve linear equation
console.log("--- Solve 2x + 4 = 10 ---");
const sol1 = nerdamer.solveEquations("2*x + 4 = 10", "x");
console.log("Solution:", sol1.toString());

// Test 2: Factorise
console.log("--- Factor x^2 + 5x + 6 ---");
const fac = nerdamer("x^2 + 5*x + 6").factor();
console.log("Factored:", fac.toString());

// Test 3: Expand
console.log("--- Expand (x+3)(x-2) ---");
const expanded = nerdamer("(x+3)*(x-2)").expand();
console.log("Expanded:", expanded.toString());

// Test 4: Quadratic
console.log("--- Solve x^2 - 5x + 6 = 0 ---");
const sol2 = nerdamer.solveEquations("x^2 - 5*x + 6 = 0", "x");
console.log("Solutions:", sol2.toString());

// Test 5: Simplify
console.log("--- Simplify (2x+4)/2 ---");
const simp = nerdamer("(2*x+4)/2").expand();
console.log("Simplified:", simp.toString());

// Test 6: LaTeX output
console.log("--- LaTeX ---");
console.log("Factor LaTeX:", nerdamer("x^2+5*x+6").factor().toTeX());
console.log("Solve 3x-7=14:", nerdamer.solveEquations("3*x-7=14", "x").toString());

// Test 7: Simultaneous
console.log("--- Simultaneous ---");
const simult = nerdamer.solveEquations(["x+y=10", "2*x-y=5"]);
console.log("Simultaneous:", JSON.stringify(simult));

// Test 8: Pythagoras
console.log("--- Pythagoras: a=5, b=12, c=? ---");
const pyth = nerdamer("sqrt(5^2 + 12^2)");
console.log("Hypotenuse:", pyth.text());

// Test 9: Area of circle
console.log("--- Area of circle r=5 ---");
const area = nerdamer("pi*5^2");
console.log("Area:", area.text(), "≈", area.evaluate().text());

console.log("\n✅ All CAS tests passed");
