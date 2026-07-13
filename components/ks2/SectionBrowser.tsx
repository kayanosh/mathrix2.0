"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  KS2_YEARS,
  KS2_TERMS,
  getKS2Content,
  sectionUsesYear,
  yearHasTerms,
  type KS2Year,
  type KS2Term,
  type KS2Section,
} from "@/lib/ks2";
import { getSkillData, syncSkillsFromServer, type SkillData } from "@/lib/skills";
import TopicCard from "@/components/ks2/TopicCard";

interface Props {
  section: KS2Section;
}

export default function SectionBrowser({ section }: Props) {
  const [year, setYear] = useState<KS2Year>("Year 5");
  const [term, setTerm] = useState<KS2Term>("Autumn");
  const [activeSubject, setActiveSubject] = useState<string>("maths");
  const [skillData, setSkillData] = useState<SkillData>({});

  useEffect(() => {
    let active = true;
    const local = getSkillData();
    queueMicrotask(() => {
      if (active) setSkillData(local);
    });
    syncSkillsFromServer().then((merged) => {
      if (active && merged) setSkillData(merged);
    });
    return () => {
      active = false;
    };
  }, []);

  const subjects = useMemo(() => getKS2Content(section, year), [section, year]);
  const showTerms = section === "curriculum" && yearHasTerms(year);

  const effectiveActiveSubject = subjects.some((s) => s.id === activeSubject)
    ? activeSubject
    : subjects[0]?.id ?? "maths";
  const current = subjects.find((s) => s.id === effectiveActiveSubject) ?? subjects[0];

  // Subjects with at least one topic in the selected term, plus any year-long
  // (no-term) topics gathered into an "ongoing" group.
  const termSubjects = useMemo(
    () =>
      subjects
        .map((s) => ({ subject: s, topics: s.topics.filter((t) => t.term === term) }))
        .filter((g) => g.topics.length > 0),
    [subjects, term]
  );
  const ongoing = useMemo(
    () =>
      subjects
        .map((s) => ({ subject: s, topics: s.topics.filter((t) => !t.term) }))
        .filter((g) => g.topics.length > 0),
    [subjects]
  );

  const yearToggle = (
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
  );

  // ── Term-first view (curriculum years that are organised into terms) ──────────
  if (showTerms) {
    return (
      <>
        {sectionUsesYear(section) && yearToggle}

        {/* Term tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-7">
          {KS2_TERMS.map((t) => (
            <button
              key={t}
              onClick={() => setTerm(t)}
              className={`px-5 py-2.5 rounded-2xl text-sm font-bold transition-all ${
                term === t
                  ? "bg-indigo-600 text-white shadow-md scale-105"
                  : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50"
              }`}
            >
              {t} term
            </button>
          ))}
        </div>

        {/* Subject groups for the selected term */}
        <motion.div
          key={`${year}-${term}`}
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.04 } } }}
          className="space-y-8"
        >
          {termSubjects.map(({ subject, topics }) => (
            <div key={subject.id}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{subject.icon}</span>
                <h2 className="font-bold text-gray-800">{subject.name}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {topics.map((topic) => (
                  <motion.div
                    key={topic.id}
                    variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
                  >
                    <TopicCard
                      topic={topic}
                      subjectId={subject.id}
                      href={`/ks2/topic/${topic.id}`}
                      skillData={skillData}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Ongoing (year-long) units */}
        {ongoing.length > 0 && (
          <div className="mt-10">
            <p className="text-[12px] font-bold uppercase tracking-wide text-gray-400 mb-3">
              Ongoing through the year
            </p>
            <div className="space-y-6">
              {ongoing.map(({ subject, topics }) => (
                <div key={subject.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{subject.icon}</span>
                    <h2 className="font-bold text-gray-800">{subject.name}</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {topics.map((topic) => (
                      <TopicCard
                        key={topic.id}
                        topic={topic}
                        subjectId={subject.id}
                        href={`/ks2/topic/${topic.id}`}
                        skillData={skillData}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  }

  // ── Subject-first view (no terms: Year 5, SATs, 11+) ─────────────────────────
  return (
    <>
      {sectionUsesYear(section) && yearToggle}

      {/* Subject tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-7">
        {subjects.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSubject(s.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all ${
              effectiveActiveSubject === s.id
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
