"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, Loader2, Check, RotateCcw, Star, Eye } from "lucide-react";
import { recordCorrect, recordIncorrect, markTopicMastered, type SkillMeta } from "@/lib/skills";
import { ks2SkillKey } from "@/lib/ks2";
import { MASTERY_QUIZ_SIZE, MASTERY_PASS_MARK, tierMeta, type KS2Target, type KS2Tier } from "@/lib/ks2-pathway";

interface QuizQuestion {
  question: string;
  answer: string;
}

interface Props {
  subjectId: string;
  subjectName: string;
  topicName: string;
  subtopics: string[];
  meta: SkillMeta;
  target: KS2Target;
  tier: KS2Tier;
  onClose: () => void;
  onPassed: () => void;
}

export default function MasteryQuiz({
  subjectId,
  subjectName,
  topicName,
  subtopics,
  meta,
  target,
  tier,
  onClose,
  onPassed,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/ks2-quiz", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: subjectName,
            topic: topicName,
            subtopics,
            target,
            tier,
            count: MASTERY_QUIZ_SIZE,
          }),
        });
        if (!res.ok) throw new Error("quiz failed");
        const data = (await res.json()) as { questions: QuizQuestion[] };
        if (active) {
          setQuestions(data.questions);
          setLoading(false);
        }
      } catch {
        if (active) {
          setError(true);
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const topicKey = ks2SkillKey(topicName, "Mastery quiz");

  function mark(gotIt: boolean) {
    const meta2: SkillMeta = { ...meta, target, tier };
    if (gotIt) {
      recordCorrect(topicKey, meta2);
      setCorrect((c) => c + 1);
    } else {
      recordIncorrect(topicKey, meta2);
    }
    if (idx + 1 >= questions.length) {
      const finalCorrect = correct + (gotIt ? 1 : 0);
      if (finalCorrect >= MASTERY_PASS_MARK) {
        markTopicMastered(topicKey, meta2);
        onPassed();
      }
      setDone(true);
    } else {
      setIdx((i) => i + 1);
      setRevealed(false);
    }
  }

  function restart() {
    setIdx(0);
    setRevealed(false);
    setCorrect(0);
    setDone(false);
  }

  const passed = correct >= MASTERY_PASS_MARK;
  const current = questions[idx];

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
        className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-extrabold text-lg text-gray-900">Mastery Quiz ⭐</h2>
            <p className="text-[12px] text-gray-400">
              {topicName} · {tierMeta(tier).label}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
              <p className="text-gray-500 text-sm">Making your quiz…</p>
            </div>
          ) : error ? (
            <div className="text-center py-10">
              <p className="text-gray-600 mb-4">Sorry, the quiz couldn&rsquo;t load.</p>
              <button onClick={onClose} className="text-indigo-600 font-medium">Close</button>
            </div>
          ) : done ? (
            <div className="text-center py-8">
              <div className="text-5xl mb-3">{passed ? "🎉" : "💪"}</div>
              <h3 className="text-2xl font-extrabold text-gray-900 mb-1">
                {passed ? "Mastered!" : "Keep going!"}
              </h3>
              <p className="text-gray-500 mb-1">
                You got {correct} out of {questions.length} right.
              </p>
              <p className="text-gray-400 text-sm mb-6">
                {passed
                  ? `You reached the ${tierMeta(tier).standard} standard.`
                  : `You need ${MASTERY_PASS_MARK} to earn your star. Try again!`}
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={restart}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200"
                >
                  <RotateCcw size={16} /> Try again
                </button>
                <button
                  onClick={onClose}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
                >
                  {passed && <Star size={16} className="fill-white" />} Done
                </button>
              </div>
            </div>
          ) : current ? (
            <div>
              {/* Progress dots */}
              <div className="flex items-center gap-1.5 mb-4">
                {questions.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 flex-1 rounded-full ${i < idx ? "bg-emerald-400" : i === idx ? "bg-indigo-400" : "bg-gray-200"}`}
                  />
                ))}
              </div>

              <p className="text-[12px] font-semibold text-gray-400 mb-1">
                Question {idx + 1} of {questions.length}
              </p>
              <p className="text-lg text-gray-900 font-medium mb-5 whitespace-pre-line">{current.question}</p>

              {!revealed ? (
                <button
                  onClick={() => setRevealed(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100"
                >
                  <Eye size={16} /> Show answer
                </button>
              ) : (
                <>
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 mb-5">
                    <p className="text-[12px] font-bold text-emerald-700 mb-1">Answer</p>
                    <p className="text-emerald-900 whitespace-pre-line">{current.answer || "Check with your teacher."}</p>
                  </div>
                  <p className="text-center text-sm text-gray-500 mb-3">Did you get it right?</p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => mark(false)}
                      className="flex-1 py-3 rounded-xl bg-rose-50 text-rose-700 font-semibold hover:bg-rose-100"
                    >
                      Not yet
                    </button>
                    <button
                      onClick={() => mark(true)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500 text-white font-semibold hover:bg-emerald-600"
                    >
                      <Check size={16} /> I got it!
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  );
}
