"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, GraduationCap, Loader2, School } from "lucide-react";
import {
  DEFAULT_KS2_SCHOOL_ID,
  getKS2School,
  getKS2SchoolMeta,
  setKS2School,
} from "@/lib/ks2-school";

export default function KS2SchoolPage() {
  const router = useRouter();
  const school = getKS2SchoolMeta(DEFAULT_KS2_SCHOOL_ID);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (getKS2School()) {
      router.replace("/ks2");
      return;
    }
    setChecking(false);
  }, [router]);

  function handleContinue() {
    setKS2School(DEFAULT_KS2_SCHOOL_ID);
    router.replace("/ks2");
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-indigo-50/60 to-white">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!school) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/60 to-white text-gray-900">
      <nav className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
            <GraduationCap size={16} className="text-white" />
          </div>
          <span className="font-bold text-gray-900">Mathrix · KS2</span>
        </Link>
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
          Home
        </Link>
      </nav>

      <main className="max-w-lg mx-auto px-6 pb-16 pt-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="text-center"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 mb-5">
            <School size={32} strokeWidth={2} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-2">Welcome to your school</h1>
          <p className="text-gray-500 text-lg mb-8">Choose your school to see your learning path.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.45 }}
          className="rounded-3xl bg-white ring-2 ring-indigo-200 p-6 shadow-sm"
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-400 to-indigo-500 flex items-center justify-center text-2xl shrink-0">
              🏫
            </div>
            <div className="text-left">
              <h2 className="text-xl font-extrabold text-gray-900">{school.name}</h2>
              <p className="text-sm text-gray-500">{school.tagline}</p>
            </div>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed mb-6">
            Your lessons, practice, and progress are matched to {school.name}&rsquo;s Year 5 and Year 6 plans.
          </p>
          <button
            onClick={handleContinue}
            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3.5 text-base font-bold text-white hover:bg-indigo-700 transition-colors"
          >
            Continue <ArrowRight size={18} />
          </button>
        </motion.div>
      </main>
    </div>
  );
}
