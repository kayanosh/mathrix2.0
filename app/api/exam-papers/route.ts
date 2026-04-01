import { NextRequest, NextResponse } from "next/server";
import { listExamPapers, uploadExamPaper } from "@/lib/supabase/storage";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_TYPES = ["application/pdf"];

/**
 * GET /api/exam-papers — List exam papers with optional filters.
 * Query params: exam_board, tier, year, is_mark_scheme
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams;

  const filters: Record<string, unknown> = {};
  if (url.get("exam_board")) filters.exam_board = url.get("exam_board");
  if (url.get("tier")) filters.tier = url.get("tier");
  if (url.get("year")) filters.year = parseInt(url.get("year")!, 10);
  if (url.get("is_mark_scheme")) filters.is_mark_scheme = url.get("is_mark_scheme") === "true";

  try {
    const papers = await listExamPapers(filters);
    return NextResponse.json({ papers });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/exam-papers — Upload a new exam paper PDF (admin only).
 * Expects multipart/form-data with fields: file, exam_board, tier, year, paper_number, title, is_mark_scheme
 */
export async function POST(req: NextRequest) {
  // Auth check — require authenticated user with pro/admin status
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is admin (subscription_status = 'admin' or has service role)
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("subscription_status")
    .eq("id", user.id)
    .single();

  if (profile?.subscription_status !== "admin") {
    return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const examBoard = formData.get("exam_board") as string;
    const tier = formData.get("tier") as string;
    const year = parseInt(formData.get("year") as string, 10);
    const paperNumber = formData.get("paper_number") as string;
    const title = formData.get("title") as string;
    const isMarkScheme = formData.get("is_mark_scheme") === "true";

    if (!file || !examBoard || !tier || !year || !paperNumber || !title) {
      return NextResponse.json(
        { error: "Missing required fields: file, exam_board, tier, year, paper_number, title" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only PDF files are allowed" },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Validate exam_board and tier values
    const validBoards = ["AQA", "Edexcel", "OCR"];
    const validTiers = ["foundation", "higher"];
    if (!validBoards.includes(examBoard)) {
      return NextResponse.json({ error: "Invalid exam_board" }, { status: 400 });
    }
    if (!validTiers.includes(tier)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

    const result = await uploadExamPaper(buffer, sanitizedName, {
      exam_board: examBoard,
      tier,
      year,
      paper_number: paperNumber,
      title,
      is_mark_scheme: isMarkScheme,
    });

    return NextResponse.json({ success: true, storagePath: result.storagePath });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
