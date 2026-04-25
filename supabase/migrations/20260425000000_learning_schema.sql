-- Schema v2: Unterrichtsfächer, Lernpakete, Lernmaterialien, Lernaktivitäten
-- Dieses Script ergänzt das bestehende schema.sql (analysis_results bleibt erhalten)

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.learning_packages (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.learning_materials (
  id uuid primary key default gen_random_uuid(),
  package_id uuid not null references public.learning_packages(id) on delete cascade,
  file_name text not null,
  ocr_text text,
  summary text,
  created_at timestamptz not null default now()
);

-- type: 'multiple_choice' | 'aufgabe'
-- content für multiple_choice: { question, options: string[4], correct_index: int, explanation }
-- content für aufgabe:         { question, model_answer }
create table if not exists public.learning_activities (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.learning_materials(id) on delete cascade,
  type text not null check (type in ('multiple_choice', 'aufgabe')),
  content jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists learning_packages_subject_id_idx
  on public.learning_packages (subject_id);

create index if not exists learning_materials_package_id_idx
  on public.learning_materials (package_id);

create index if not exists learning_activities_material_id_idx
  on public.learning_activities (material_id);
