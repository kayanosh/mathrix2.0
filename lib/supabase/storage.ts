import { supabaseAdmin } from "./admin";

const EXAM_PAPERS_BUCKET = "exam-papers";

/**
 * Upload an exam paper PDF to Supabase Storage and insert metadata.
 */
export async function uploadExamPaper(
  file: Buffer,
  fileName: string,
  meta: {
    exam_board: string;
    tier: string;
    year: number;
    paper_number: string;
    title: string;
    is_mark_scheme?: boolean;
  }
) {
  const storagePath = `${meta.exam_board.toLowerCase()}/${meta.year}/${fileName}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from(EXAM_PAPERS_BUCKET)
    .upload(storagePath, file, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);

  const { error: dbError } = await supabaseAdmin.from("exam_papers").insert({
    exam_board: meta.exam_board,
    tier: meta.tier,
    year: meta.year,
    paper_number: meta.paper_number,
    title: meta.title,
    storage_path: storagePath,
    is_mark_scheme: meta.is_mark_scheme ?? false,
  });

  if (dbError) throw new Error(`Database insert failed: ${dbError.message}`);

  return { storagePath };
}

/**
 * Get a public URL for an exam paper PDF.
 */
export function getExamPaperUrl(storagePath: string): string {
  const { data } = supabaseAdmin.storage
    .from(EXAM_PAPERS_BUCKET)
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

/**
 * List exam papers with optional filters.
 */
export async function listExamPapers(filters?: {
  exam_board?: string;
  tier?: string;
  year?: number;
  is_mark_scheme?: boolean;
}) {
  let query = supabaseAdmin
    .from("exam_papers")
    .select("*")
    .order("year", { ascending: false })
    .order("paper_number", { ascending: true });

  if (filters?.exam_board) query = query.eq("exam_board", filters.exam_board);
  if (filters?.tier) query = query.eq("tier", filters.tier);
  if (filters?.year) query = query.eq("year", filters.year);
  if (filters?.is_mark_scheme !== undefined)
    query = query.eq("is_mark_scheme", filters.is_mark_scheme);

  const { data, error } = await query;
  if (error) throw new Error(`Query failed: ${error.message}`);
  return data;
}
