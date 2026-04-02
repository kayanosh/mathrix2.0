"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Renders a single PDF page to a canvas using pdf.js.
 * Lazy-loads the PDF document and caches it across instances.
 */

// Module-level cache so we only load the PDF once
let pdfDocPromise: Promise<import("pdfjs-dist").PDFDocumentProxy> | null = null;

function getPdfDocument(url: string) {
  if (!pdfDocPromise) {
    pdfDocPromise = (async () => {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
      const doc = await pdfjs.getDocument(url).promise;
      return doc;
    })();
  }
  return pdfDocPromise;
}

interface Props {
  pdfUrl: string;
  pageNumber: number;
  scale?: number;
  className?: string;
}

export default function PdfPageRenderer({
  pdfUrl,
  pageNumber,
  scale = 1.5,
  className = "",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const renderTaskRef = useRef<import("pdfjs-dist").RenderTask | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      try {
        setLoading(true);
        setError(false);

        const doc = await getPdfDocument(pdfUrl);
        if (cancelled) return;

        const page = await doc.getPage(pageNumber);
        if (cancelled) return;

        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        // Cancel any previous render
        renderTaskRef.current?.cancel();

        const task = page.render({ canvasContext: ctx, viewport, canvas });
        renderTaskRef.current = task;

        await task.promise;
        if (!cancelled) setLoading(false);
      } catch (err: unknown) {
        if (cancelled) return;
        // RenderingCancelledException is expected when re-rendering
        if (err instanceof Error && err.message?.includes("Rendering cancelled")) return;
        setError(true);
        setLoading(false);
      }
    }

    render();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [pdfUrl, pageNumber, scale]);

  return (
    <div className={`relative ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 rounded-xl">
          <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {error && (
        <div className="flex items-center justify-center py-12 text-sm text-red-400">
          Failed to load page {pageNumber}
        </div>
      )}
      <canvas
        ref={canvasRef}
        className={`w-full h-auto rounded-xl ${loading ? "opacity-0" : "opacity-100"} transition-opacity duration-300`}
      />
    </div>
  );
}
