import Link from "next/link";
import { ArrowLeft, GraduationCap, TrendingUp } from "lucide-react";
import { KS2_SECTIONS, type KS2Section } from "@/lib/ks2";
import SectionBrowser from "@/components/ks2/SectionBrowser";

const SECTION_EMOJI: Record<KS2Section, string> = {
  curriculum: "📚",
  sats: "📝",
  eleven_plus: "🎯",
};

interface Props {
  section: KS2Section;
}

export default function SectionPage({ section }: Props) {
  const meta = KS2_SECTIONS.find((s) => s.id === section);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/60 to-white text-gray-900">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
            <GraduationCap size={16} className="text-white" />
          </div>
          <span className="font-bold text-gray-900">Mathrix · KS2</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/progress" className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
            <TrendingUp size={14} /> My Progress
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Home
          </Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 pb-16">
        <Link href="/ks2" className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium mb-4">
          <ArrowLeft size={16} /> Back to KS2
        </Link>

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{SECTION_EMOJI[section]}</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{meta?.label ?? "KS2"}</h1>
        </div>
        <p className="text-gray-500 mb-6 text-lg">{meta?.blurb}</p>

        <SectionBrowser section={section} />
      </main>
    </div>
  );
}
