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
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
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
  );
}
