"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Lock, Star } from "lucide-react";
import {
  getKS2TopicById,
  getNextKS2Topic,
  ks2SkillKey,
  ks2SectionPath,
  sectionUsesYear,
} from "@/lib/ks2";
import {
  KS2_TIERS,
  PATHWAY_STAGES,
  type KS2Target,
  type KS2Tier,
  type KS2StageId,
} from "@/lib/ks2-pathway";
import {
  getSkillData,
  syncSkillsFromServer,
  getMastery,
  recordSkillAttempt,
  type SkillData,
  type SkillMeta,
} from "@/lib/skills";
import { getTopicVisual } from "@/lib/ks2-visuals";
import MasteryQuiz from "@/components/ks2/MasteryQuiz";
import LessonPanel from "@/components/ks2/LessonPanel";
import PracticePanel from "@/components/ks2/PracticePanel";

const TIER_EMOJI: Record<KS2Tier, string> = {
  developing: "🌱",
  secure: "💪",
  greater_depth: "🚀",
};

const springPop = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.97 },
  transition: { type: "spring", stiffness: 400, damping: 22 },
} as const;

export default function KS2TopicPage({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = use(params);
  const ctx = useMemo(() => getKS2TopicById(topicId), [topicId]);

  const [tier, setTier] = useState<KS2Tier>("secure");
  const [skillData, setSkillData] = useState<SkillData>({});
  const [showQuiz, setShowQuiz] = useState(false);
  const [activeStage, setActiveStage] = useState<KS2StageId | null>(null);
  const [skillSelection, setSkillSelection] = useState<{
    topicId: string;
    skill: string;
  }>(() => ({
    topicId,
    skill: ctx?.topic.subtopics[0] || "",
  }));

  useEffect(() => {
    let active = true;
    const localSkills = getSkillData();
    let storedTier: KS2Tier | null = null;
    try {
      storedTier = localStorage.getItem("ks2_tier") as KS2Tier | null;
    } catch {
      /* ignore */
    }
    queueMicrotask(() => {
      if (!active) return;
      setSkillData(localSkills);
      if (storedTier) setTier(storedTier);
    });
    syncSkillsFromServer().then((m) => {
      if (active && m) setSkillData(m);
    });
    return () => {
      active = false;
    };
  }, []);

  if (!ctx) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mascot.png" alt="" className="w-28 opacity-90" />
        <p className="text-gray-600 text-lg">Sorry, that topic could not be found.</p>
        <Link href="/ks2" className="text-indigo-600 font-bold flex items-center gap-1">
          <ArrowLeft size={16} /> Back to KS2
        </Link>
      </div>
    );
  }

  const { topic, subject, section, year } = ctx;
  const selectedSkill =
    skillSelection.topicId === topicId &&
    topic.subtopics.includes(skillSelection.skill)
      ? skillSelection.skill
      : topic.subtopics[0] || topic.name;
  // The framework ("working towards") is determined by the section the topic
  // belongs to — KS2Section and KS2Target share the same string union.
  const target: KS2Target = section;
  const { Icon, accent } = getTopicVisual(topic.id, topic.name, subject.id);
  const next = getNextKS2Topic(topic.id);

  const meta: SkillMeta = {
    section,
    subject: subject.id,
    year: sectionUsesYear(section) ? year : undefined,
    target,
    tier,
  };

  // Topic mastery: derived from the mastery-quiz skill record.
  const masteryKey = ks2SkillKey(topic.name, selectedSkill);
  const masteryRec = skillData[masteryKey];
  const isMastered = getMastery(masteryRec) === "mastered";

  const masteredCount = topic.subtopics.filter(
    (sub) => getMastery(skillData[ks2SkillKey(topic.name, sub)]) === "mastered",
  ).length;

  function setTierPersist(t: KS2Tier) {
    setTier(t);
    try {
      localStorage.setItem("ks2_tier", t);
    } catch {
      /* ignore */
    }
  }

  function chooseSkill(skill: string) {
    setSkillSelection({ topicId, skill });
    setActiveStage(null);
    setShowQuiz(false);
  }

  function openStage(stage: KS2StageId) {
    if (stage === "quiz") {
      setShowQuiz(true);
      return;
    }
    const nextStage = activeStage === stage ? null : stage;
    setActiveStage(nextStage);
    if (nextStage) {
      recordSkillAttempt(ks2SkillKey(topic.name, selectedSkill), meta);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-indigo-50/40 to-white text-gray-900">
      <nav className="flex items-center justify-between px-6 py-4 max-w-4xl mx-auto">
        <Link
          href={ks2SectionPath(section)}
          className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-bold text-indigo-600 shadow-sm ring-1 ring-indigo-100 hover:ring-indigo-300 transition-all"
        >
          <ArrowLeft size={16} /> All topics
        </Link>
        <span className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-gray-500">
          {subject.name} · {sectionUsesYear(section) ? year : section === "sats" ? "SATs" : "11+"}
        </span>
      </nav>

      <main className="max-w-3xl mx-auto px-6 pb-16">
        {/* Hero header */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
          className={`relative overflow-hidden rounded-[2rem] bg-gradient-to-br ${accent.gradient} p-6 sm:p-8 mb-6 text-white shadow-lg`}
        >
          <div className="absolute -top-8 -right-8 h-36 w-36 rounded-full bg-white/15" aria-hidden />
          <div className="absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-white/10" aria-hidden />
          <div className="relative flex items-center gap-4 sm:gap-5">
            <div className="flex h-18 w-18 sm:h-20 sm:w-20 items-center justify-center rounded-3xl bg-white/25 backdrop-blur-sm shrink-0 shadow-inner">
              <Icon size={40} className="text-white drop-shadow" strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight drop-shadow-sm">
                {topic.name}
              </h1>
              <p className="text-white/85 font-medium">
                {topic.subtopics.length} skills to learn
              </p>
            </div>
            {isMastered && (
              <motion.span
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 15 }}
                className="flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-extrabold text-amber-500 shadow"
              >
                <Star size={16} className="fill-amber-400 text-amber-400" /> Mastered!
              </motion.span>
            )}
          </div>
          {/* Topic progress bar */}
          <div className="relative mt-5">
            <div className="flex items-center justify-between text-[13px] font-bold text-white/90 mb-1.5">
              <span>Your stars</span>
              <span>{masteredCount} / {topic.subtopics.length}</span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={masteredCount}
              aria-valuemin={0}
              aria-valuemax={topic.subtopics.length}
              aria-label="Skills mastered in this topic"
              className="h-3.5 rounded-full bg-white/25 overflow-hidden"
            >
              <motion.div
                className="h-full rounded-full bg-white"
                initial={{ width: 0 }}
                animate={{
                  width: `${topic.subtopics.length ? (masteredCount / topic.subtopics.length) * 100 : 0}%`,
                }}
                transition={{ type: "spring", stiffness: 60, damping: 18 }}
              />
            </div>
          </div>
        </motion.div>

        {/* Challenge level — big chunky choices */}
        <p className="text-[12px] font-bold uppercase tracking-wide text-gray-400 mb-2">
          Challenge level
        </p>
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-8">
          {KS2_TIERS.map((t) => {
            const active = tier === t.id;
            return (
              <motion.button
                key={t.id}
                type="button"
                {...springPop}
                onClick={() => setTierPersist(t.id)}
                aria-pressed={active}
                className={`rounded-3xl p-3 sm:p-4 text-center transition-colors ${
                  active
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200"
                    : "bg-white ring-2 ring-gray-100 hover:ring-indigo-200 text-gray-700"
                }`}
              >
                <span className="block text-2xl sm:text-3xl mb-1" aria-hidden>
                  {TIER_EMOJI[t.id]}
                </span>
                <span className="block font-extrabold text-sm sm:text-base">{t.label}</span>
                <span className={`block text-[11px] font-medium ${active ? "text-indigo-100" : "text-gray-400"}`}>
                  {t.standard}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Skill picker — big tappable chips, no dropdowns */}
        <p className="text-[12px] font-bold uppercase tracking-wide text-gray-400 mb-2">
          Pick a skill
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-8">
          {topic.subtopics.map((sub) => {
            const rec = skillData[ks2SkillKey(topic.name, sub)];
            const m = getMastery(rec);
            const selected = selectedSkill === sub;
            return (
              <motion.button
                key={sub}
                type="button"
                {...springPop}
                onClick={() => chooseSkill(sub)}
                aria-pressed={selected}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-colors ${
                  selected
                    ? "bg-indigo-50 ring-2 ring-indigo-400 shadow-sm"
                    : "bg-white ring-1 ring-gray-100 hover:ring-indigo-200"
                }`}
              >
                <span
                  aria-hidden
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white ${
                    m === "mastered"
                      ? "bg-emerald-500"
                      : m === "unseen"
                        ? "bg-gray-200"
                        : "bg-amber-400"
                  }`}
                >
                  {m === "mastered" ? (
                    <Check size={14} strokeWidth={3} />
                  ) : (
                    <span className="h-2 w-2 rounded-full bg-white/90" />
                  )}
                </span>
                <span className={`text-[15px] font-semibold ${selected ? "text-indigo-900" : "text-gray-700"}`}>
                  {sub}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* Learning journey — connected steps with state */}
        <p className="text-[12px] font-bold uppercase tracking-wide text-gray-400 mb-2">
          Your learning journey
        </p>
        <div className="relative">
          {PATHWAY_STAGES.map((stage, i) => {
            const isQuiz = stage.id === "quiz";
            const isOpen = activeStage === stage.id;
            const stageDone = isQuiz ? isMastered : false;
            const isLast = i === PATHWAY_STAGES.length - 1;
            return (
              <div key={stage.id} className="relative flex gap-4">
                {/* Connector line */}
                {!isLast && (
                  <span
                    aria-hidden
                    className="absolute left-[26px] top-[60px] bottom-0 w-1 rounded-full bg-indigo-100"
                  />
                )}
                <div className="flex-1 mb-4">
                  <motion.button
                    type="button"
                    {...springPop}
                    onClick={() => openStage(stage.id)}
                    aria-expanded={!isQuiz ? isOpen : undefined}
                    className={`w-full flex items-center gap-4 rounded-3xl p-4 text-left transition-colors ${
                      isOpen
                        ? "bg-white ring-2 ring-indigo-400 shadow-lg shadow-indigo-100"
                        : "bg-white ring-1 ring-gray-100 shadow-sm hover:ring-indigo-200"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl text-2xl shadow-inner ${
                        isOpen ? "bg-indigo-100" : "bg-gray-50"
                      }`}
                    >
                      {stage.emoji}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-extrabold text-gray-900 text-lg">
                        {stage.label}
                      </span>
                      <span className="block text-[13px] text-gray-500">{stage.blurb}</span>
                    </span>
                    {isQuiz ? (
                      stageDone ? (
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 shrink-0">
                          <Check size={20} className="text-emerald-600" strokeWidth={3} />
                        </span>
                      ) : (
                        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 shrink-0">
                          <Star size={18} className="text-amber-500" />
                        </span>
                      )
                    ) : (
                      <motion.span
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        className="text-gray-300 shrink-0 text-xl font-bold"
                        aria-hidden
                      >
                        ⌄
                      </motion.span>
                    )}
                  </motion.button>

                  <AnimatePresence initial={false}>
                    {isOpen && !isQuiz && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 120, damping: 22 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 rounded-3xl bg-white ring-1 ring-indigo-100 p-4 sm:p-5 shadow-sm">
                          {stage.id === "practise" ? (
                            <PracticePanel
                              subjectId={subject.id}
                              subjectName={subject.name}
                              topicName={topic.name}
                              subtopics={[selectedSkill]}
                              target={target}
                              tier={tier}
                            />
                          ) : (
                            <LessonPanel
                              subjectId={subject.id}
                              subjectName={subject.name}
                              topicId={topic.id}
                              topicName={topic.name}
                              skillName={selectedSkill}
                              subtopics={[selectedSkill]}
                              target={target}
                              tier={tier}
                              kind={stage.id === "guided" ? "guided" : "lesson"}
                              accentHex={accent.hex}
                            />
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
        </div>

        {/* Next topic */}
        {next && (
          <motion.div {...springPop}>
            <Link
              href={`/ks2/topic/${next.topic.id}`}
              className="mt-6 flex items-center justify-between rounded-3xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white p-5 shadow-lg shadow-indigo-200 hover:shadow-xl transition-shadow"
            >
              <span>
                <span className="block text-[12px] font-semibold text-indigo-200">Next topic</span>
                <span className="text-lg font-extrabold">{next.topic.name}</span>
              </span>
              {isMastered ? (
                <ArrowRight size={22} />
              ) : (
                <span className="flex items-center gap-1.5 text-indigo-200 text-sm font-semibold">
                  <Lock size={16} /> Earn your star first
                </span>
              )}
            </Link>
          </motion.div>
        )}
      </main>

      <AnimatePresence>
        {showQuiz && (
          <MasteryQuiz
            subjectId={subject.id}
            subjectName={subject.name}
            topicName={topic.name}
            subtopics={[selectedSkill]}
            meta={meta}
            target={target}
            tier={tier}
            onClose={() => setShowQuiz(false)}
            onPassed={() => setSkillData(getSkillData())}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
