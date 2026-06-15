-- Final Answer Milestone 4 question database and reporting schema.
-- Run after final-answer-account-schema.sql.

alter table public.accounts
  add column if not exists is_admin boolean not null default false;

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  question_text text not null unique,
  answer_a text not null,
  answer_b text not null,
  answer_c text not null,
  answer_d text not null,
  correct_answer text not null,
  level integer not null,
  prize_amount integer not null,
  category text not null,
  active boolean not null default true,
  report_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint questions_correct_answer_check check (correct_answer in ('A', 'B', 'C', 'D')),
  constraint questions_level_check check (level between 1 and 12),
  constraint questions_report_count_check check (report_count >= 0),
  constraint questions_prize_amount_check check (
    prize_amount = case level
      when 1 then 100
      when 2 then 500
      when 3 then 1000
      when 4 then 4000
      when 5 then 8000
      when 6 then 16000
      when 7 then 32000
      when 8 then 64000
      when 9 then 125000
      when 10 then 250000
      when 11 then 500000
      when 12 then 1000000
    end
  )
);

create table if not exists public.question_reports (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now(),
  constraint question_reports_reason_check check (
    reason in ('wrong_answer', 'ambiguous_wording', 'typo', 'other')
  ),
  unique (question_id, account_id, reason)
);

create index if not exists questions_level_active_idx
  on public.questions(level, active);

create index if not exists questions_category_idx
  on public.questions(category);

create index if not exists questions_report_count_idx
  on public.questions(report_count desc)
  where report_count > 0;

create index if not exists question_reports_question_id_idx
  on public.question_reports(question_id);

create index if not exists question_reports_account_id_idx
  on public.question_reports(account_id);

create or replace function public.refresh_question_report_count()
returns trigger
language plpgsql
as $$
declare
  target_question_id uuid;
begin
  target_question_id := coalesce(new.question_id, old.question_id);

  update public.questions
  set report_count = (
    select count(*)::integer
    from public.question_reports
    where question_id = target_question_id
  ),
  updated_at = now()
  where id = target_question_id;

  return coalesce(new, old);
end;
$$;

drop trigger if exists question_reports_refresh_count_insert
  on public.question_reports;

create trigger question_reports_refresh_count_insert
after insert on public.question_reports
for each row
execute function public.refresh_question_report_count();

drop trigger if exists question_reports_refresh_count_delete
  on public.question_reports;

create trigger question_reports_refresh_count_delete
after delete on public.question_reports
for each row
execute function public.refresh_question_report_count();

alter table public.questions enable row level security;
alter table public.question_reports enable row level security;

grant usage on schema public to service_role;
grant select, update on public.accounts to service_role;
grant select, insert, update, delete on public.questions to service_role;
grant select, insert, update, delete on public.question_reports to service_role;
grant execute on function public.refresh_question_report_count() to service_role;

notify pgrst, 'reload schema';

-- The app uses server-only routes for question selection, question reports,
-- and admin review. Browser users should not directly read or write these tables.
