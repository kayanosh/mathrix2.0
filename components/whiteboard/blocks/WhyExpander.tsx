"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import InlineMath from "@/components/InlineMath";

interface Props {
  text: string;
  delay?: number;
}

/**
 * Collapsible "Why does this work?" callout.
 * Collapsed by default — students click to expand the mathematical intuition.
 */
export default function WhyExpander({ text, delay = 0 }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.25 }}
      className="ml-6 mt-0.5 mb-2"
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-[11px] font-medium text-indigo-500 hover:text-indigo-700 transition-colors"
        aria-expanded={open}
      >
        <span
          className="transition-transform duration-200"
          style={{ display: "inline-block", transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          ▶
        </span>
        Why does this work?
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            key="why"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-1 px-3 py-2 rounded-lg bg-indigo-50 border border-indigo-100 font-[family-name:var(--font-caveat)] text-base text-indigo-800">
              <InlineMath text={text} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
