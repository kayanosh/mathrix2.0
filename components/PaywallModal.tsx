"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Loader2, Zap } from "lucide-react";

interface PaywallModalProps {
  onClose: () => void;
}

export default function PaywallModal({ onClose }: PaywallModalProps) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Something went wrong. Please try again.");
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 pt-6">
            <div />
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-6 pb-6 text-center">
            {/* Icon */}
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "linear-gradient(135deg, #2563eb, #3b82f6)" }}
            >
              <Zap size={24} className="text-white" />
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-2">
              You&apos;ve used all 5 free prompts today
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              Upgrade to Pro for unlimited step-by-step solutions, every day.
            </p>

            {/* Price */}
            <div className="bg-gray-50 rounded-xl p-5 mb-5">
              <div className="flex items-baseline justify-center gap-1.5 mb-3">
                <span className="text-3xl font-bold text-gray-900">£9.99</span>
                <span className="text-gray-500 text-sm">/month</span>
              </div>
              <ul className="space-y-2.5 text-left">
                {[
                  "Unlimited prompts per day",
                  "Full step-by-step solutions",
                  "Whiteboard visualisations",
                  "Image uploads for questions",
                  "Cancel anytime",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-gray-700">
                    <Check size={15} className="text-blue-600 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={handleUpgrade}
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: "#2563eb" }}
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              Upgrade to Pro
            </button>

            <p className="text-[11px] text-gray-400 mt-3">
              Recurring monthly charge. Cancel anytime from your account.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
