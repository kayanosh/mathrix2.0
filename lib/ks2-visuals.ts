/**
 * Child-friendly visuals for the KS2 scheme.
 *
 * Every topic gets a bright accent colour and a Lucide icon (chosen by keyword),
 * plus an optional hero illustration. Add the topic id to `ILLUSTRATION_IDS`
 * when you drop a PNG at `public/ks2/illustrations/<topicId>.png`; otherwise
 * the coloured icon badge is shown (no 404 requests for missing files).
 */
import type { LucideIcon } from "lucide-react";
import {
  Hash,
  Calculator,
  Divide,
  X,
  PieChart,
  Percent,
  Ruler,
  Square,
  BarChart3,
  Shapes,
  Triangle,
  Compass,
  Move,
  Thermometer,
  Scale,
  Box,
  FunctionSquare,
  BookOpen,
  PenLine,
  SpellCheck,
  Atom,
  Rocket,
  FlaskConical,
  Sparkles,
  Leaf,
  HeartPulse,
  Zap,
  Lightbulb,
  Bone,
  Microscope,
  Dna,
  Languages,
  Globe,
  Puzzle,
  Clock,
  Coins,
  Calendar,
  Brain,
  Network,
  Code2,
  Table,
  Boxes,
  Laptop,
} from "lucide-react";
import type { KS2SubjectId } from "./ks2";

export interface KS2Accent {
  /** Tailwind text colour class */
  text: string;
  /** Tailwind background tint class */
  bg: string;
  /** Tailwind border class */
  border: string;
  /** Tailwind gradient stops (for the icon badge) */
  gradient: string;
  /** Hex colour for SVG rings/charts */
  hex: string;
}

export interface KS2Visual {
  Icon: LucideIcon;
  accent: KS2Accent;
  /**
   * Optional hero illustration path. Only set when a real PNG exists under
   * `public/ks2/illustrations/` — otherwise TopicCard uses the icon badge.
   */
  heroImage: string | null;
}

/**
 * Topic ids that have a committed PNG under public/ks2/illustrations/.
 * Add an id here when you drop the matching file so cards can load it.
 */
const ILLUSTRATION_IDS = new Set<string>([
  // e.g. "y5m-fractions",
]);

const PALETTE: KS2Accent[] = [
  { text: "text-rose-700", bg: "bg-rose-50", border: "border-rose-200", gradient: "from-rose-400 to-rose-500", hex: "#f43f5e" },
  { text: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", gradient: "from-orange-400 to-amber-500", hex: "#f97316" },
  { text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", gradient: "from-amber-400 to-yellow-500", hex: "#f59e0b" },
  { text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", gradient: "from-emerald-400 to-green-500", hex: "#10b981" },
  { text: "text-teal-700", bg: "bg-teal-50", border: "border-teal-200", gradient: "from-teal-400 to-cyan-500", hex: "#14b8a6" },
  { text: "text-sky-700", bg: "bg-sky-50", border: "border-sky-200", gradient: "from-sky-400 to-blue-500", hex: "#0ea5e9" },
  { text: "text-indigo-700", bg: "bg-indigo-50", border: "border-indigo-200", gradient: "from-indigo-400 to-violet-500", hex: "#6366f1" },
  { text: "text-violet-700", bg: "bg-violet-50", border: "border-violet-200", gradient: "from-violet-400 to-purple-500", hex: "#8b5cf6" },
  { text: "text-fuchsia-700", bg: "bg-fuchsia-50", border: "border-fuchsia-200", gradient: "from-fuchsia-400 to-pink-500", hex: "#d946ef" },
  { text: "text-pink-700", bg: "bg-pink-50", border: "border-pink-200", gradient: "from-pink-400 to-rose-500", hex: "#ec4899" },
];

/* Keyword → icon. First match wins; order matters (specific before generic). */
const ICON_RULES: Array<{ re: RegExp; Icon: LucideIcon }> = [
  // Computing (placed first so e.g. "spreadsheet" wins over the maths "data" rule)
  { re: /spreadsheet/i, Icon: Table },
  { re: /web page|website|html/i, Icon: Globe },
  { re: /3d model|modelling|tinkercad/i, Icon: Boxes },
  { re: /programming|variable|sensing|micro:bit|scratch|debug/i, Icon: Code2 },
  { re: /network|internet|communication|systems and networks/i, Icon: Network },
  // Maths
  { re: /place value|number|roman|negative/i, Icon: Hash },
  { re: /add|subtract/i, Icon: Calculator },
  { re: /multipl|division|divide/i, Icon: Divide },
  { re: /fraction/i, Icon: PieChart },
  { re: /percent|decimal/i, Icon: Percent },
  { re: /perimeter|area/i, Icon: Square },
  { re: /volume/i, Icon: Box },
  { re: /statistic|graph|chart|mean|data/i, Icon: BarChart3 },
  { re: /shape|angle|polygon|circle/i, Icon: Shapes },
  { re: /position|direction|coordinat/i, Icon: Compass },
  { re: /convert|unit|measure/i, Icon: Ruler },
  { re: /ratio|proportion|scal/i, Icon: Scale },
  { re: /algebra|formula|sequence|equation|function/i, Icon: FunctionSquare },
  { re: /money|coin/i, Icon: Coins },
  { re: /time|timetable/i, Icon: Clock },
  { re: /calendar/i, Icon: Calendar },
  { re: /temperature/i, Icon: Thermometer },
  { re: /problem solving|themed|reason/i, Icon: Brain },
  // English
  { re: /reading|class text|comprehension/i, Icon: BookOpen },
  { re: /writing|genre|composition/i, Icon: PenLine },
  { re: /grammar|punctuation|spelling|gps|vocabulary/i, Icon: SpellCheck },
  // Science
  { re: /space|earth and space/i, Icon: Rocket },
  { re: /material|mixture|separation/i, Icon: FlaskConical },
  { re: /living|life cycle/i, Icon: Leaf },
  { re: /classif/i, Icon: Microscope },
  { re: /evolution|inherit/i, Icon: Dna },
  { re: /circulation|health|human/i, Icon: HeartPulse },
  { re: /electric|circuit|energy/i, Icon: Zap },
  { re: /light|reflection/i, Icon: Lightbulb },
  { re: /fossil/i, Icon: Bone },
  { re: /force|gravity/i, Icon: Atom },
  { re: /making connections|working scientific/i, Icon: Microscope },
  // Arabic / language
  { re: /arabic|routine|food|travel|house|city|description|celebration|school|feeling|achievement|lifestyle|free time/i, Icon: Languages },
];

const SUBJECT_FALLBACK_ICON: Record<KS2SubjectId, LucideIcon> = {
  maths: Calculator,
  english: BookOpen,
  science: Atom,
  arabic: Languages,
  computing: Laptop,
  vr: Puzzle,
  nvr: Shapes,
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pickIcon(topicId: string, topicName: string, subjectId: KS2SubjectId): LucideIcon {
  const haystack = `${topicName} ${topicId}`;
  for (const rule of ICON_RULES) {
    if (rule.re.test(haystack)) return rule.Icon;
  }
  return SUBJECT_FALLBACK_ICON[subjectId] ?? Sparkles;
}

/** Returns the icon, accent colour, and optional hero-image path for a topic. */
export function getTopicVisual(topicId: string, topicName: string, subjectId: KS2SubjectId): KS2Visual {
  const accent = PALETTE[hashString(topicId) % PALETTE.length];
  return {
    Icon: pickIcon(topicId, topicName, subjectId),
    accent,
    heroImage: ILLUSTRATION_IDS.has(topicId)
      ? `/ks2/illustrations/${topicId}.png`
      : null,
  };
}

/** Accent for a subject (used for tabs/headers). */
export function getSubjectAccent(subjectId: KS2SubjectId): KS2Accent {
  return PALETTE[hashString(subjectId) % PALETTE.length];
}
