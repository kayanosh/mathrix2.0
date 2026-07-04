"use client";

import type { CurriculumStage } from "@/lib/curriculum";

const KS_STYLES: Record<string, string> = {
  KS2: "from-sky-500 to-blue-600",
  KS3: "from-violet-500 to-indigo-600",
  KS4: "from-amber-500 to-orange-600",
  KS5: "from-emerald-500 to-teal-600",
};

export default function YearCard({
  stage,
  active,
  onClick,
}: {
  stage: CurriculumStage;
  active: boolean;
  onClick: () => void;
}) {
  const gradient = KS_STYLES[stage.keyStage] || "from-gray-500 to-gray-700";
  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl p-4 text-left transition-all border ${
        active
          ? "border-indigo-500 ring-2 ring-indigo-300 shadow-md"
          : "border-gray-200 hover:border-indigo-300 hover:shadow-sm"
      } bg-white`}
    >
      <div className={`inline-grid place-items-center rounded-xl bg-gradient-to-br ${gradient} text-white px-3 py-1.5 text-sm font-bold`}>
        {stage.shortLabel}
      </div>
      <div className="mt-2 font-semibold text-gray-900">{stage.label}</div>
      <div className="text-xs text-gray-400">{stage.ages}</div>
      <div className="text-[11px] text-gray-400 mt-1">{stage.blurb}</div>
      {stage.hasExamBoards && (
        <span className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wide text-indigo-500 bg-indigo-50 rounded-full px-2 py-0.5">
          Boards
        </span>
      )}
    </button>
  );
}
