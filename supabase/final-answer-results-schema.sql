-- Final Answer Milestone 9 results, stats finalization, and in-game reports.
-- Run after final-answer-hot-seat-schema.sql.

alter table public.rooms
  add column if not exists results_finalized_at timestamptz;

create table if not exists public.game_results (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  display_name text not null,
  final_winnings integer not null default 0,
  highest_level_reached integer not null default 0,
  questions_answered_correctly integer not null default 0,
  fastest_finger_wins integer not null default 0,
  won_outright boolean not null default false,
  tied_for_first boolean not null default false,
  placement integer not null,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint game_results_non_negative check (
    final_winnings >= 0
    and highest_level_reached >= 0
    and questions_answered_correctly >= 0
    and fastest_finger_wins >= 0
    and placement >= 1
  ),
  unique (room_id, account_id)
);

alter table public.question_reports
  add column if not exists room_id uuid references public.rooms(id) on delete set null,
  add column if not exists hot_seat_turn_id uuid references public.hot_seat_turns(id) on delete set null,
  add column if not exists note text;

create index if not exists game_results_room_placement_idx
  on public.game_results(room_id, placement, final_winnings desc);

create index if not exists game_results_account_id_idx
  on public.game_results(account_id);

create index if not exists question_reports_room_id_idx
  on public.question_reports(room_id);

create index if not exists question_reports_hot_seat_turn_id_idx
  on public.question_reports(hot_seat_turn_id);

create unique index if not exists question_reports_one_per_turn_idx
  on public.question_reports(question_id, account_id, hot_seat_turn_id)
  where hot_seat_turn_id is not null;

alter table public.game_results enable row level security;

grant usage on schema public to service_role;
grant select, update on public.rooms to service_role;
grant select, insert, update, delete on public.game_results to service_role;
grant select, insert, update, delete on public.question_reports to service_role;
grant select, update on public.account_stats to service_role;

notify pgrst, 'reload schema';

-- The app finalizes results and stats through server-only API routes.
-- Browser clients should not directly write results or stats.
