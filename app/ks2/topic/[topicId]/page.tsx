"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Lock, ChevronDown } from "lucide-react";
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
  targetMeta,
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
        <p className="text-gray-600">Sorry, that topic could not be found.</p>
        <Link href="/ks2" className="text-indigo-600 font-medium flex items-center gap-1">
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

  function setTierPersist(t: KS2Tier) {
    setTier(t);
    try {
      localStorage.setItem("ks2_tier", t);
    } catch {
      /* ignore */
    }
  }

  function openStage(stage: KS2StageId) {
    if (stage === "quiz") {
      setShowQuiz(true);
      return;
    }
    const next = activeStage === stage ? null : stage;
    setActiveStage(next);
    if (next) {
      recordSkillAttempt(ks2SkillKey(topic.name, selectedSkill), meta);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/60 to-white text-gray-900">
      <nav className="flex items-center justify-between px-6 py-4">
        <Link href={ks2SectionPath(section)} className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
          <ArrowLeft size={16} /> All topics
        </Link>
        <span className="text-sm text-gray-400">
          {subject.name} · {sectionUsesYear(section) ? year : section === "sats" ? "SATs" : "11+"}
        </span>
      </nav>

      <main className="max-w-3xl mx-auto px-6 pb-16">
        {/* Header */}
        <div className={`rounded-3xl border-2 ${accent.border} ${accent.bg} p-6 mb-6 flex items-center gap-4`}>
          <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${accent.gradient} flex items-center justify-center shrink-0`}>
            <Icon size={32} className="text-white" strokeWidth={2.2} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className={`text-2xl font-extrabold ${accent.text}`}>{topic.name}</h1>
            <p className="text-gray-500 text-sm">{topic.subtopics.length} skills to learn</p>
          </div>
          {isMastered && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-700 px-3 py-1 text-sm font-bold">
              <Check size={14} /> Mastered
            </span>
          )}
        </div>

        {/* Framework (determined by the section) */}
        <p className="text-[12px] font-bold uppercase tracking-wide text-gray-400 mb-2">Working towards</p>
        <div className="mb-5">
          <span className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 text-white px-4 py-2 text-sm font-bold">
            {targetMeta(target).label}
          </span>
          <span className="ml-2 text-sm text-gray-500">{targetMeta(target).blurb}</span>
        </div>

        {/* Tier selector */}
        <p className="text-[12px] font-bold uppercase tracking-wide text-gray-400 mb-2">Challenge level</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-7">
          {KS2_TIERS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTierPersist(t.id)}
              className={`text-left rounded-2xl p-3 transition-all ${
                tier === t.id ? "bg-indigo-50 ring-2 ring-indigo-300" : "bg-white ring-1 ring-gray-200 hover:bg-gray-50"
              }`}
            >
              <p className="font-bold text-gray-800 text-sm">{t.label}</p>
              <p className="text-[11px] text-gray-500">{t.standard}</p>
            </button>
          ))}
        </div>

        {/* Skill selector */}
        <label htmlFor="ks2-skill" className="block text-[12px] font-bold uppercase tracking-wide text-gray-400 mb-2">
          Skill to learn
        </label>
        <select
          id="ks2-skill"
          value={selectedSkill}
          onChange={(event) => {
            setSkillSelection({ topicId, skill: event.target.value });
            setActiveStage(null);
            setShowQuiz(false);
          }}
          className="mb-7 w-full rounded-2xl border border-indigo-200 bg-white px-4 py-3 text-base font-semibold text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        >
          {topic.subtopics.map((subtopic) => (
            <option key={subtopic} value={subtopic}>{subtopic}</option>
          ))}
        </select>

        {/* Pathway stages */}
        <p className="text-[12px] font-bold uppercase tracking-wide text-gray-400 mb-2">Your learning path</p>
        <div className="space-y-3">
          {PATHWAY_STAGES.map((stage, i) => {
            const isQuiz = stage.id === "quiz";
            const isOpen = activeStage === stage.id;
            return (
              <div key={stage.id} className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
                <button
                  onClick={() => openStage(stage.id)}
                  className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-all"
                >
                  <div className="w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center text-2xl shrink-0">
                    {stage.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900">
                      {i + 1}. {stage.label}
                    </p>
                    <p className="text-[13px] text-gray-500">{stage.blurb}</p>
                  </div>
                  {isQuiz ? (
                    isMastered ? (
                      <Check size={20} className="text-emerald-500 shrink-0" />
                    ) : (
                      <ArrowRight size={18} className="text-gray-300 shrink-0" />
                    )
                  ) : (
                    <ChevronDown
                      size={18}
                      className={`text-gray-300 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  )}
                </button>

                {isOpen && !isQuiz && (
                  <div className="border-t border-gray-100 p-4 sm:p-5">
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
                )}
              </div>
            );
          })}
        </div>

        {/* Skills in this topic */}
        <p className="text-[12px] font-bold uppercase tracking-wide text-gray-400 mt-8 mb-2">Skill progress</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {topic.subtopics.map((sub) => {
            const rec = skillData[ks2SkillKey(topic.name, sub)];
            const m = getMastery(rec);
            const dot =
              m === "mastered" ? "bg-emerald-500" : m === "unseen" ? "bg-gray-300" : "bg-amber-400";
            return (
              <button
                key={sub}
                type="button"
                onClick={() => {
                  setSkillSelection({ topicId, skill: sub });
                  setActiveStage("learn");
                  setShowQuiz(false);
                }}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-all ${
                  selectedSkill === sub
                    ? "bg-indigo-50 ring-2 ring-indigo-300"
                    : "bg-white ring-1 ring-gray-100 hover:ring-indigo-200"
                }`}
                aria-pressed={selectedSkill === sub}
              >
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot}`} />
                <span className="text-sm text-gray-700 truncate">{sub}</span>
              </button>
            );
          })}
        </div>

        {/* Next topic */}
        {next && (
          <Link
            href={`/ks2/topic/${next.topic.id}`}
            className="mt-8 flex items-center justify-between rounded-2xl bg-indigo-600 text-white p-4 hover:bg-indigo-700 transition-colors"
          >
            <span>
              <span className="block text-[12px] text-indigo-200">Next topic</span>
              <span className="font-bold">{next.topic.name}</span>
            </span>
            {isMastered ? <ArrowRight size={20} /> : <Lock size={18} className="text-indigo-200" />}
          </Link>
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
