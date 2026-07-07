export interface StudentLevel {
  student_id?: string;
  subject_id: string;
  current_stage: string | null;
  exam_board: string | null;
}

export interface StudentSummary {
  taught: number;
  mastered: number;
  lastSession: string | null;
}

export interface StudentRow {
  id: string;
  full_name: string;
  year_group: string | null;
  notes: string | null;
  archived: boolean;
  created_at: string;
  assigned_tutor_id: string | null;
  assigned_tutor_name: string | null;
  parent_email: string | null;
  parent_name: string | null;
  levels: StudentLevel[];
  summary: StudentSummary;
}

export interface StudentTopicRow {
  id: string;
  tutor_id?: string | null;
  tutorName?: string | null;
  stage_id: string;
  subject_id: string;
  topic_id: string;
  topic_name: string;
  exam_board: string | null;
  level: string | null;
  status: "taught" | "practised" | "mastered";
  notes: string | null;
  studied_at: string;
}
