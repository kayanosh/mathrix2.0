"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { ArrowLeft, CreditCard, LogOut, Crown, Loader2, TrendingUp } from "lucide-react";
import Link from "next/link";

export default function AccountPage() {
  const supabase = createClient();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string>("free");
  const [promptsUsed, setPromptsUsed] = useState(0);
  const [promptsLimit, setPromptsLimit] = useState(5);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      setUser(u);
      if (u) {
        try {
          const res = await fetch("/api/usage");
          if (res.ok) {
            const data = await res.json();
            setSubscriptionStatus(data.subscriptionStatus);
            setPromptsUsed(data.promptsUsed);
            setPromptsLimit(data.promptsLimit === Infinity ? -1 : data.promptsLimit);
          }
        } catch { /* ignore */ }
      }
      setLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleManageSubscription = async () => {
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch { /* ignore */ }
  };

  const handleUpgrade = async () => {
    try {
      const res = await fetch("/api/stripe/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch { /* ignore */ }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-gray-600 text-lg">You need to sign in to view your account.</p>
        <Link
          href="/"
          className="text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          <ArrowLeft size={16} /> Back to home
        </Link>
      </div>
    );
  }

  const isPro = subscriptionStatus === "pro";

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 px-4 sm:px-8 py-4 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
        >
          <ArrowLeft size={16} /> Back to Mathrix
        </Link>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="Mathrix" className="h-6 sm:h-8" />
      </header>

      <main className="max-w-xl mx-auto px-4 py-10 sm:py-16">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8">Account</h1>

        {/* User Info */}
        <section className="mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold">
              {(user.user_metadata?.full_name?.[0] || user.email?.[0] || "U").toUpperCase()}
            </div>
            <div>
              {user.user_metadata?.full_name && (
                <p className="text-lg font-semibold text-gray-900">{user.user_metadata.full_name}</p>
              )}
              <p className="text-gray-500 text-sm">{user.email}</p>
            </div>
          </div>
        </section>

        {/* Plan Card */}
        <section className="mb-8 rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Your Plan</h2>
            {isPro ? (
              <span className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1 rounded-full bg-blue-100 text-blue-700">
                <Crown size={14} /> Pro
              </span>
            ) : (
              <span className="text-sm font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-600">
                Free
              </span>
            )}
          </div>

          {isPro ? (
            <div>
              <p className="text-gray-600 mb-1">Unlimited questions per day</p>
              <p className="text-gray-400 text-sm">£9.99/month</p>
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-1">
                {promptsUsed} / {promptsLimit} questions used today
              </p>
              <div className="w-full h-2 bg-gray-100 rounded-full mt-2 mb-4">
                <div
                  className="h-2 bg-blue-600 rounded-full transition-all"
                  style={{ width: `${Math.min((promptsUsed / promptsLimit) * 100, 100)}%` }}
                />
              </div>
              <button
                onClick={handleUpgrade}
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
              >
                Upgrade to Pro — £9.99/mo
              </button>
            </div>
          )}
        </section>

        {/* Actions */}
        <section className="space-y-3">
          <Link
            href="/progress"
            className="w-full flex items-center gap-3 px-5 py-4 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-left"
          >
            <TrendingUp size={18} className="text-gray-400" />
            <span className="font-medium">View Progress</span>
          </Link>
          {isPro && (
            <button
              onClick={handleManageSubscription}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-left"
            >
              <CreditCard size={18} className="text-gray-400" />
              <span className="font-medium">Manage Subscription</span>
            </button>
          )}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-5 py-4 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-left"
          >
            <LogOut size={18} className="text-gray-400" />
            <span className="font-medium">Sign Out</span>
          </button>
        </section>
      </main>
    </div>
  );
}
