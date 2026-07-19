"use client";

import { useEffect } from "react";

/**
 * Pupil-friendly recovery screen. A render failure must never leave a child
 * staring at a blank page: say what happened plainly and offer a way back.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("app error boundary:", error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-4xl" aria-hidden>
        🛠️
      </p>
      <h1 className="text-xl font-bold text-gray-900">
        Something went wrong
      </h1>
      <p className="max-w-md text-gray-600">
        Don&apos;t worry — your work is still here. Try again, and if it keeps
        happening, tell your teacher or parent.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
      >
        Try again
      </button>
    </main>
  );
}
