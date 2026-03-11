import { readFileSync } from "fs";
import { join } from "path";
import Link from "next/link";
import { Sparkles, ArrowLeft } from "lucide-react";
import SvgDiagramPlayer from "@/components/SvgDiagramPlayer";
import type { DiagramData } from "@/components/SvgDiagramPlayer";

// Read at build/request time from public folder
function loadDiagram(): DiagramData {
  const filePath = join(process.cwd(), "public", "svg-steps-3x7.json");
  const raw = readFileSync(filePath, "utf8");
  return JSON.parse(raw) as DiagramData;
}

export const metadata = {
  title: "Visual Algebra — Mathrix",
  description: "Step-by-step animated diagrams showing terms moving across the equals sign.",
};

export default function AlgebraPage() {
  const data = loadDiagram();

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#07070e" }}
    >
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <Link
          href="/"
          className="flex items-center gap-2 text-gray-500 hover:text-gray-200 transition-colors text-sm"
        >
          <ArrowLeft size={15} />
          Back
        </Link>

        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
          >
            <Sparkles size={13} className="text-white" />
          </div>
          <span className="text-sm font-bold text-white">Visual Algebra</span>
        </div>

        <Link
          href="/chat"
          className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Ask tutor →
        </Link>
      </header>

      {/* Label */}
      <div className="text-center pt-4 pb-2 flex-shrink-0">
        <p className="text-xs text-gray-600 uppercase tracking-widest mb-1">
          Worked example
        </p>
        <h1
          className="text-lg font-bold"
          style={{
            background: "linear-gradient(135deg, #818cf8, #c084fc)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Solve: 3x + 7 = 19
        </h1>
        <p className="text-xs text-gray-600 mt-1">
          Use ← → keys or tap Next to step through
        </p>
      </div>

      {/* Player — takes remaining height */}
      <div className="flex-1 overflow-hidden">
        <SvgDiagramPlayer data={data} equation="3x + 7 = 19" />
      </div>
    </div>
  );
}
