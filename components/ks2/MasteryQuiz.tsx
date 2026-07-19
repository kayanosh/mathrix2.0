"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, Loader2, Check, RotateCcw, Star, Eye } from "lucide-react";
import InlineMath from "@/components/InlineMath";
import { recordCorrect, recordIncorrect, markTopicMastered, type SkillMeta } from "@/lib/skills";
import { ks2SkillKey } from "@/lib/ks2";
import { MASTERY_QUIZ_SIZE, MASTERY_PASS_MARK, tierMeta, type KS2Target, type KS2Tier } from "@/lib/ks2-pathway";
import { fetchKS2Questions } from "@/lib/ks2-quiz-client";
import { playKS2Sound } from "@/lib/ks2-sounds";
import StarBurst from "@/components/ks2/StarBurst";

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

function normalizedAnswer(value: string): string {
  return value
    .toLowerCase()
    .replace(/,/g, "")
    .replace(/[£$%]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function answersMatch(response: string, expected: string): boolean {
  const actual = normalizedAnswer(response);
  const target = normalizedAnswer(expected);
  if (!actual) return false;
  if (actual === target) return true;
  if (/^-?\d+(?:\.\d+)?(?:\/\d+)?$/.test(actual)) {
    const candidates = target.match(/-?\d+(?:\.\d+)?(?:\/\d+)?/g) || [];
    return candidates.some((candidate) => candidate === actual);
  }
  return false;
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
  const [response, setResponse] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const nextQuestions = await fetchKS2Questions({
            subject: subjectName,
            topic: topicName,
            subtopics,
            target,
            tier,
            count: MASTERY_QUIZ_SIZE,
        });
        if (active) {
          setQuestions(nextQuestions);
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

  const skillName = subtopics[0] || "Mastery quiz";
  const topicKey = ks2SkillKey(topicName, skillName);

  function mark(gotIt: boolean) {
    const meta2: SkillMeta = { ...meta, target, tier };
    if (gotIt) {
      recordCorrect(topicKey, meta2);
      setCorrect((c) => c + 1);
      playKS2Sound("correct");
    } else {
      recordIncorrect(topicKey, meta2);
    }
    if (idx + 1 >= questions.length) {
      const finalCorrect = correct + (gotIt ? 1 : 0);
      if (finalCorrect >= MASTERY_PASS_MARK) {
        markTopicMastered(topicKey, meta2);
        playKS2Sound("fanfare");
        onPassed();
      }
      setDone(true);
    } else {
      setIdx((i) => i + 1);
      setRevealed(false);
      setResponse("");
    }
  }

  function restart() {
    setIdx(0);
    setRevealed(false);
    setCorrect(0);
    setDone(false);
    setResponse("");
  }

  const passed = correct >= MASTERY_PASS_MARK;
  const current = questions[idx];
  const isMaths = subjectId === "maths" || /math/i.test(subjectName);
  const answerCorrect = current
    ? answersMatch(response, current.answer || "")
    : false;

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
        role="dialog"
        aria-modal="true"
        aria-labelledby="mastery-quiz-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 id="mastery-quiz-title" className="font-extrabold text-lg text-gray-900">Mastery Quiz ⭐</h2>
            <p className="text-[12px] text-gray-400">
              {topicName} · {tierMeta(tier).label}
            </p>
          </div>
          <button aria-label="Close mastery quiz" onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100">
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
            <div className="relative text-center py-8">
              {passed && <StarBurst />}
              {passed ? (
                <motion.div
                  initial={{ scale: 0, rotate: -8 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 220, damping: 14 }}
                  className="mx-auto mb-3 w-28"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/mascot.png" alt="Matty the maths owl celebrates with you" className="w-full" />
                </motion.div>
              ) : (
                <div className="text-5xl mb-3">💪</div>
              )}
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
              <p className="text-lg text-gray-900 font-medium mb-5 whitespace-pre-line">
                <InlineMath text={current.question} />
              </p>

              {!revealed ? (
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700" htmlFor="mastery-response">
                    Your answer
                  </label>
                  <textarea
                    id="mastery-response"
                    value={response}
                    onChange={(event) => setResponse(event.target.value)}
                    rows={isMaths ? 2 : 4}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    placeholder={isMaths ? "Type your answer" : "Write your answer before checking"}
                  />
                  <button
                    onClick={() => setRevealed(true)}
                    disabled={!response.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-indigo-50 text-indigo-700 font-semibold hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Eye size={16} /> Check answer
                  </button>
                </div>
              ) : (
                <>
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 mb-5">
                    <p className="text-[12px] font-bold text-emerald-700 mb-1">Answer</p>
                    <p className="text-emerald-900 whitespace-pre-line">
                      <InlineMath text={current.answer || "Check with your teacher."} />
                    </p>
                  </div>
                  {isMaths ? (
                    <>
                      <p className={`text-center text-sm font-semibold mb-3 ${answerCorrect ? "text-emerald-700" : "text-rose-700"}`}>
                        {answerCorrect ? "Correct — well done!" : "Not yet. Compare your answer with the worked answer."}
                      </p>
                      <button
                        onClick={() => mark(answerCorrect)}
                        className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
                      >
                        Continue
                      </button>
                    </>
                  ) : (
                  <><p className="text-center text-sm text-gray-500 mb-3">Use the model answer to check your work.</p>
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
                </>
              )}
            </div>
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  );
}
