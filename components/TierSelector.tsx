"use client";

import type { ExamLevel } from "@/types";

const TIERS: { value: ExamLevel; label: string }[] = [
  { value: "KS1", label: "KS1" },
  { value: "KS2", label: "KS2" },
  { value: "KS3", label: "KS3" },
  { value: "GCSE", label: "GCSE" },
  { value: "A-Level", label: "A-Level" },
];

interface Props {
  value: ExamLevel;
  onChange: (tier: ExamLevel) => void;
}

export default function TierSelector({ value, onChange }: Props) {
  return (
    <>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as ExamLevel)}
        className="sm:hidden max-w-[5.5rem] rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        aria-label="Exam level"
      >
        {TIERS.map((t) => (
          <option key={t.value} value={t.value}>
            {t.label}
          </option>
        ))}
      </select>

      <div className="hidden sm:flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
        {TIERS.map((t) => (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all duration-150 whitespace-nowrap ${
              value === t.value
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </>
  );
}
