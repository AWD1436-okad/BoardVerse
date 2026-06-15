-- Final Answer Milestone 6 Fastest Finger First foundation.
-- Run after final-answer-game-state-schema.sql.

create table if not exists public.fastest_finger_questions (
  id uuid primary key default gen_random_uuid(),
  prompt text not null unique,
  item_1 text not null,
  item_2 text not null,
  item_3 text not null,
  item_4 text not null,
  correct_order text[] not null,
  category text not null,
  active boolean not null default true,
  report_count integer not null default 0,
  created_at timestamptz not null default now(),
  constraint fastest_finger_correct_order_length_check check (
    array_length(correct_order, 1) = 4
  ),
  constraint fastest_finger_correct_order_values_check check (
    correct_order <@ array['item_1', 'item_2', 'item_3', 'item_4']::text[]
  )
);

create table if not exists public.fastest_finger_rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  game_state_id uuid not null references public.game_states(id) on delete cascade,
  question_id uuid not null references public.fastest_finger_questions(id) on delete restrict,
  round_number integer not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'active',
  winner_account_id uuid references public.accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint fastest_finger_round_status_check check (status in ('active', 'completed')),
  constraint fastest_finger_round_number_check check (round_number > 0),
  constraint fastest_finger_timer_check check (ends_at > starts_at),
  unique (game_state_id, round_number)
);

create table if not exists public.fastest_finger_submissions (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.fastest_finger_rounds(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  submitted_order text[] not null,
  is_correct boolean not null,
  response_ms integer not null,
  submitted_at timestamptz not null default now(),
  constraint fastest_finger_submitted_order_length_check check (
    array_length(submitted_order, 1) = 4
  ),
  constraint fastest_finger_submitted_order_values_check check (
    submitted_order <@ array['item_1', 'item_2', 'item_3', 'item_4']::text[]
  ),
  constraint fastest_finger_response_ms_check check (response_ms >= 0),
  unique (round_id, account_id)
);

alter table public.game_states
  add column if not exists current_fastest_finger_round_id uuid references public.fastest_finger_rounds(id) on delete set null,
  add column if not exists fastest_finger_winner_account_id uuid references public.accounts(id) on delete set null;

alter table public.room_events
  drop constraint if exists room_events_event_type_check;

alter table public.room_events
  add constraint room_events_event_type_check check (
    event_type in (
      'player_joined',
      'player_left',
      'ready_changed',
      'host_changed',
      'room_status_changed',
      'game_started',
      'fastest_finger_round_started',
      'fastest_finger_submitted',
      'fastest_finger_winner'
    )
  );

create index if not exists fastest_finger_questions_active_idx
  on public.fastest_finger_questions(active, category);

create index if not exists fastest_finger_rounds_room_status_idx
  on public.fastest_finger_rounds(room_id, status, created_at desc);

create index if not exists fastest_finger_submissions_round_response_idx
  on public.fastest_finger_submissions(round_id, is_correct, response_ms, submitted_at);

alter table public.fastest_finger_questions enable row level security;
alter table public.fastest_finger_rounds enable row level security;
alter table public.fastest_finger_submissions enable row level security;

grant usage on schema public to service_role;
grant select, insert, update, delete on public.fastest_finger_questions to service_role;
grant select, insert, update, delete on public.fastest_finger_rounds to service_role;
grant select, insert, update, delete on public.fastest_finger_submissions to service_role;

notify pgrst, 'reload schema';

-- Browser clients do not read these gameplay tables directly. API routes use
-- the server secret, hide correct orders, and publish room_events after changes.
