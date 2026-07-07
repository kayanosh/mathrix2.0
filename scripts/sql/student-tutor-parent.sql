-- Assign tutors to students + parent contact for progress emails.
-- Idempotent. Safe to re-run after tuition-centre-migration.sql.

alter table public.students
  add column if not exists assigned_tutor_id uuid references public.profiles(id) on delete set null;

alter table public.students
  add column if not exists parent_email text;

alter table public.students
  add column if not exists parent_name text;

create index if not exists idx_students_assigned_tutor on public.students (assigned_tutor_id);
