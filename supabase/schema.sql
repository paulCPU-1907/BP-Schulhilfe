create table if not exists public.analysis_results (
  id uuid primary key,
  request_id uuid not null,
  file_name text not null,
  status text not null check (status in ('completed', 'failed')),
  ocr_text text,
  summary text,
  tasks jsonb not null default '[]'::jsonb,
  error text,
  created_at timestamptz not null default now()
);

create index if not exists analysis_results_request_id_idx
  on public.analysis_results (request_id);
