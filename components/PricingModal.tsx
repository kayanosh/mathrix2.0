"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Loader2, Zap } from "lucide-react";

interface PricingModalProps {
  onClose: () => void;
  onUpgrade: () => void;
  isLoggedIn: boolean;
  currentPlan: string;
}

export default function PricingModal({ onClose, onUpgrade, isLoggedIn, currentPlan }: PricingModalProps) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    if (!isLoggedIn) {
      onUpgrade();
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
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
          className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 pt-6">
            <h2 className="text-xl font-bold text-gray-900">Choose your plan</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-6 pb-6 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Free Plan */}
              <div
                className="rounded-xl p-5 flex flex-col"
                style={{
                  border: currentPlan === "free" ? "2px solid #2563eb" : "1.5px solid #e5e7eb",
                  background: currentPlan === "free" ? "#f0f5ff" : "#ffffff",
                }}
              >
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Free</h3>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-bold text-gray-900">£0</span>
                    <span className="text-gray-500 text-sm">/month</span>
                  </div>
                </div>
                <ul className="space-y-2.5 flex-1">
                  {["5 prompts per day", "Step-by-step solutions", "Whiteboard visualisations", "Image uploads"].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                      <Check size={15} className="text-gray-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {currentPlan === "free" ? (
                  <div className="mt-5 py-2.5 rounded-lg text-sm font-medium text-center text-blue-700 bg-blue-50 border border-blue-200">
                    Current plan
                  </div>
                ) : (
                  <div className="mt-5 py-2.5 rounded-lg text-sm font-medium text-center text-gray-400">&mdash;</div>
                )}
              </div>

              {/* Pro Plan */}
              <div
                className="rounded-xl p-5 flex flex-col relative"
                style={{
                  border: currentPlan === "pro" ? "2px solid #2563eb" : "1.5px solid #2563eb",
                  background: currentPlan === "pro" ? "#f0f5ff" : "#ffffff",
                }}
              >
                {currentPlan !== "pro" && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-blue-600 text-white tracking-wide">
                    Recommended
                  </span>
                )}
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900">Pro</h3>
                    <Zap size={16} className="text-blue-600" />
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-bold text-gray-900">£9.99</span>
                    <span className="text-gray-500 text-sm">/month</span>
                  </div>
                </div>
                <ul className="space-y-2.5 flex-1">
                  {["Unlimited prompts per day", "Full step-by-step solutions", "Whiteboard visualisations", "Image uploads", "Priority support", "Cancel anytime"].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                      <Check size={15} className="text-blue-600 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {currentPlan === "pro" ? (
                  <div className="mt-5 py-2.5 rounded-lg text-sm font-medium text-center text-blue-700 bg-blue-50 border border-blue-200">
                    Current plan
                  </div>
                ) : (
                  <button
                    onClick={handleUpgrade}
                    disabled={loading}
                    className="mt-5 w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                    style={{ background: "#2563eb" }}
                  >
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    {isLoggedIn ? "Upgrade to Pro" : "Sign up & Upgrade"}
                  </button>
                )}
              </div>
            </div>

            <p className="text-[11px] text-gray-400 text-center mt-4">
              All plans include GCSE Higher Tier content. Pro is billed monthly. Cancel anytime.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
