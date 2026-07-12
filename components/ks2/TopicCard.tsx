"use client";

import { useState } from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import type { KS2Topic, KS2SubjectId } from "@/lib/ks2";
import { ks2SkillKey } from "@/lib/ks2";
import { getTopicVisual } from "@/lib/ks2-visuals";
import { getMastery, type SkillData } from "@/lib/skills";
import { RadialProgress } from "@/components/ProgressChart";

interface Props {
  topic: KS2Topic;
  subjectId: KS2SubjectId;
  href: string;
  skillData: SkillData;
}

export default function TopicCard({ topic, subjectId, href, skillData }: Props) {
  const { Icon, accent, heroImage } = getTopicVisual(topic.id, topic.name, subjectId);
  const [imgOk, setImgOk] = useState(Boolean(heroImage));
  const subtopics = Array.isArray(topic.subtopics) ? topic.subtopics : [];

  const total = subtopics.length;
  let started = 0;
  let mastered = 0;
  for (const sub of subtopics) {
    const rec = skillData[ks2SkillKey(topic.name, sub)];
    if (rec && rec.attempts > 0) {
      started += 1;
      if (getMastery(rec) === "mastered") mastered += 1;
    }
  }
  const percent = total ? Math.round((started / total) * 100) : 0;

  return (
    <Link
      href={href}
      className={`group relative flex flex-col overflow-hidden rounded-3xl border-2 ${accent.border} ${accent.bg} transition-all hover:-translate-y-1 hover:shadow-lg`}
    >
      {/* Illustration / icon banner */}
      <div className={`relative h-28 w-full bg-gradient-to-br ${accent.gradient} flex items-center justify-center`}>
        {heroImage && imgOk ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroImage}
            alt={topic.name}
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setImgOk(false)}
          />
        ) : (
          <Icon size={44} className="text-white drop-shadow" strokeWidth={2.2} />
        )}

        {/* Mastery stars */}
        {mastered > 0 && (
          <span className="absolute top-2 right-2 flex items-center gap-0.5 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-amber-600 shadow">
            <Star size={12} className="fill-amber-400 text-amber-400" /> {mastered}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 items-center gap-3 p-4">
        <div className="flex-1 min-w-0">
          <h3 className={`font-bold leading-snug ${accent.text}`}>{topic.name}</h3>
          <p className="mt-0.5 text-[12px] text-gray-500">
            {total} skill{total !== 1 ? "s" : ""}
            {started > 0 ? ` · ${started} started` : ""}
          </p>
        </div>
        <RadialProgress percent={percent} size={52} stroke={6} color={accent.hex} centerSub="" />
      </div>
    </Link>
  );
}
