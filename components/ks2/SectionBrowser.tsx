"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  KS2_YEARS,
  getKS2Content,
  sectionUsesYear,
  type KS2Year,
  type KS2Section,
} from "@/lib/ks2";
import { getSkillData, syncSkillsFromServer, type SkillData } from "@/lib/skills";
import TopicCard from "@/components/ks2/TopicCard";

interface Props {
  section: KS2Section;
}

export default function SectionBrowser({ section }: Props) {
  const [year, setYear] = useState<KS2Year>("Year 5");
  const [activeSubject, setActiveSubject] = useState<string>("maths");
  const [skillData, setSkillData] = useState<SkillData>({});

  useEffect(() => {
    setSkillData(getSkillData());
    syncSkillsFromServer().then((merged) => {
      if (merged) setSkillData(merged);
    });
  }, []);

  const subjects = useMemo(() => getKS2Content(section, year), [section, year]);

  useEffect(() => {
    if (!subjects.some((s) => s.id === activeSubject)) {
      setActiveSubject(subjects[0]?.id ?? "maths");
    }
  }, [subjects, activeSubject]);

  const current = subjects.find((s) => s.id === activeSubject) ?? subjects[0];

  return (
    <>
      {/* Year toggle (curriculum only) */}
      {sectionUsesYear(section) && (
        <div className="flex items-center gap-1 bg-white ring-1 ring-gray-200 rounded-xl p-0.5 w-fit mb-5">
          {KS2_YEARS.map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                year === y ? "bg-indigo-600 text-white shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      )}

      {/* Subject tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-7">
        {subjects.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSubject(s.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all ${
              activeSubject === s.id
                ? "bg-indigo-50 text-indigo-700 ring-2 ring-indigo-300 scale-105"
                : "bg-white text-gray-500 ring-1 ring-gray-200 hover:bg-gray-50"
            }`}
          >
            <span className="text-lg">{s.icon}</span>
            {s.name}
          </button>
        ))}
      </div>

      {/* Topic cards */}
      {current && (
        <motion.div
          key={`${current.id}-${year}`}
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.05 } } }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {current.topics.map((topic) => (
            <motion.div
              key={topic.id}
              variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
            >
              <TopicCard
                topic={topic}
                subjectId={current.id}
                href={`/ks2/topic/${topic.id}`}
                skillData={skillData}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </>
  );
}
