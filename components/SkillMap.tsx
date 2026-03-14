"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { SUBJECTS } from "@/lib/subjects";
import { getSkillData, getMastery, type MasteryLevel } from "@/lib/skills";

interface Props {
  onClose: () => void;
  onPractise: (topic: string) => void;
}

const MASTERY_STYLE: Record<MasteryLevel, { bg: string; text: string; border: string; label: string }> = {
  unseen:    { bg: "bg-gray-50",     text: "text-gray-400",   border: "border-gray-200",   label: "Not started" },
  learning:  { bg: "bg-yellow-50",   text: "text-yellow-700", border: "border-yellow-200", label: "Learning" },
  practiced: { bg: "bg-blue-50",     text: "text-blue-700",   border: "border-blue-200",   label: "Practiced" },
  mastered:  { bg: "bg-emerald-50",  text: "text-emerald-700",border: "border-emerald-200",label: "Mastered" },
};

export default function SkillMap({ onClose, onPractise }: Props) {
  const skillData = useMemo(() => getSkillData(), []);

  // Flatten all subtopics across all subjects for the skill map
  // Match against skill keys using "TopicName — subtopic" format
  const allTopics = SUBJECTS.flatMap((subject) =>
    subject.topics.flatMap((topic) =>
      topic.subtopics.map((sub) => ({
        key: `${topic.name} — ${sub}`,
        subtopic: sub,
        topicName: topic.name,
        subjectName: subject.name,
        subjectIcon: subject.icon,
      }))
    )
  );

  // Count mastered/practiced/learning
  const totalAttempted = Object.keys(skillData).length;
  const masteredCount = Object.values(skillData).filter((r) => getMastery(r.attempts) === "mastered").length;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div>
            <h2 className="font-bold text-lg text-gray-900">My Progress</h2>
            <p className="text-[12px] text-gray-400 mt-0.5">
              {totalAttempted === 0
                ? "No topics attempted yet — start solving!"
                : `${masteredCount} mastered · ${totalAttempted} attempted`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 flex-shrink-0 overflow-x-auto">
          {(["unseen", "learning", "practiced", "mastered"] as MasteryLevel[]).map((m) => (
            <div key={m} className="flex items-center gap-1.5 whitespace-nowrap">
              <div className={`w-2.5 h-2.5 rounded-full ${MASTERY_STYLE[m].bg} border ${MASTERY_STYLE[m].border}`} />
              <span className="text-[11px] text-gray-500">{MASTERY_STYLE[m].label}</span>
            </div>
          ))}
        </div>

        {/* Topic grid */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {SUBJECTS.slice(0, 1).map((subject) => (
            <div key={subject.id} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-base">{subject.icon}</span>
                <span className="font-semibold text-sm text-gray-700">{subject.name}</span>
              </div>
              {subject.topics.map((topic) => (
                <div key={topic.id} className="mb-4">
                  <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    {topic.name}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {topic.subtopics.map((sub) => {
                      const key = `${topic.name} — ${sub}`;
                      const record = skillData[key];
                      const mastery = getMastery(record?.attempts ?? 0);
                      const style = MASTERY_STYLE[mastery];
                      return (
                        <button
                          key={sub}
                          onClick={() => onPractise(key)}
                          className={`text-left px-3 py-2.5 rounded-xl border text-[12px] font-medium transition-all hover:scale-[1.02] active:scale-[0.98] ${style.bg} ${style.text} ${style.border}`}
                        >
                          <span className="line-clamp-2">{sub}</span>
                          {record && (
                            <span className="block text-[10px] opacity-60 mt-0.5">
                              {record.attempts} attempt{record.attempts !== 1 ? "s" : ""}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
