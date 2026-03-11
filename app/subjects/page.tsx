import Link from "next/link";
import { Sparkles, ArrowRight, BookOpen } from "lucide-react";
import { SUBJECTS } from "@/lib/subjects";

export const metadata = {
  title: "Subjects — Mathrix",
  description: "Browse GCSE and A-Level subjects and topics covered by Mathrix AI tutor.",
};

export default function SubjectsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-100">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Sparkles size={14} className="text-white" />
          </div>
          <span className="font-bold text-white">Mathrix</span>
        </Link>
        <Link
          href="/chat"
          className="text-sm bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-1"
        >
          Open tutor <ArrowRight size={14} />
        </Link>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-10">
          <div className="flex items-center gap-2 text-indigo-400 text-sm font-medium mb-3">
            <BookOpen size={16} />
            GCSE &amp; A-Level
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-3">Subjects &amp; Topics</h1>
          <p className="text-gray-400 max-w-xl">
            Click any topic to open the AI tutor with that topic pre-selected. The tutor knows the
            full AQA, Edexcel and OCR syllabi.
          </p>
        </div>

        <div className="space-y-8">
          {SUBJECTS.map((subject) => (
            <div key={subject.id} className="rounded-2xl border border-gray-800 overflow-hidden">
              {/* Subject header */}
              <div className={`bg-gradient-to-r ${subject.color} p-5 flex items-center gap-3`}>
                <span className="text-3xl">{subject.icon}</span>
                <div>
                  <h2 className="text-lg font-bold text-white">{subject.name}</h2>
                  <div className="flex gap-2 mt-1">
                    {subject.level.map((l) => (
                      <span
                        key={l}
                        className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white font-medium"
                      >
                        {l}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Topics */}
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-900/30">
                {subject.topics.map((topic) => (
                  <div
                    key={topic.id}
                    className="rounded-xl border border-gray-800 bg-gray-900/50 p-4"
                  >
                    <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center justify-between">
                      {topic.name}
                      <Link
                        href={`/chat?subject=${subject.id}&topic=${topic.id}`}
                        className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                      >
                        Ask tutor <ArrowRight size={12} />
                      </Link>
                    </h3>
                    <ul className="space-y-1">
                      {topic.subtopics.map((sub) => (
                        <li key={sub}>
                          <Link
                            href={`/chat?q=${encodeURIComponent(
                              `Explain: ${sub}`
                            )}&subject=${subject.id}`}
                            className="text-xs text-gray-400 hover:text-indigo-300 flex items-center gap-1.5 py-0.5 transition-colors"
                          >
                            <span className="w-1 h-1 rounded-full bg-gray-600 flex-shrink-0" />
                            {sub}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
