/**
 * Client-side file helpers for chat input modes (photo upload, camera scan,
 * PDF upload). Browser-only: these touch FileReader / canvas / pdfjs and are
 * invoked from event handlers, never at import time.
 */

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_PDF_BYTES = 20 * 1024 * 1024; // 20 MB

/** Pure: is this file a PDF (by MIME or extension)? Safe to unit-test. */
export function isPdfByNameOrType(name: string, type: string): boolean {
  return type === "application/pdf" || /\.pdf$/i.test((name || "").trim());
}

export function isPdfFile(file: File): boolean {
  return isPdfByNameOrType(file.name, file.type);
}

/** Read a File into a base64 data URI. */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Downscale + re-encode an image data URI as JPEG to keep the request small.
 * Falls back to the original data URI on any error.
 */
export function compressImageDataUrl(
  dataUrl: string,
  maxDim = 1200,
  quality = 0.7,
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const scale = maxDim / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(dataUrl);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export interface PdfRasterResult {
  dataUrl: string;
  pageCount: number;
}

/**
 * Rasterise the FIRST page of a PDF to a JPEG data URI so it can flow through
 * the existing image (vision) pipeline. Returns the total page count so the UI
 * can note when only page 1 was used.
 */
export async function pdfFileToImageDataUrl(
  file: File,
  opts?: { targetWidth?: number; quality?: number },
): Promise<PdfRasterResult> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString();

  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const pageCount = doc.numPages;

  const page = await doc.getPage(1);
  const base = page.getViewport({ scale: 1 });
  const targetWidth = opts?.targetWidth ?? 1400;
  // Clamp scale so tiny/huge PDFs both come out legible but not enormous.
  const scale = Math.min(3, Math.max(1, targetWidth / base.width));
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  // JPEG has no alpha — paint a white background first.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: ctx, viewport, canvas }).promise;

  return {
    dataUrl: canvas.toDataURL("image/jpeg", opts?.quality ?? 0.85),
    pageCount,
  };
}
