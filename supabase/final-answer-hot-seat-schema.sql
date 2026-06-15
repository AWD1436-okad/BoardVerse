-- Final Answer Milestone 7 Hot Seat core gameplay.
-- Run after final-answer-fastest-finger-schema.sql.

create table if not exists public.hot_seat_turns (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  game_state_id uuid not null references public.game_states(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  current_level integer not null default 1,
  current_prize integer not null default 100,
  current_question_id uuid references public.questions(id) on delete restrict,
  question_history uuid[] not null default '{}',
  selected_answer text,
  final_answer text,
  status text not null default 'awaiting_answer',
  is_correct boolean,
  final_winnings integer,
  levels_completed integer not null default 0,
  questions_correct integer not null default 0,
  placement_rank integer,
  started_at timestamptz not null default now(),
  answered_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint hot_seat_level_check check (current_level between 1 and 12),
  constraint hot_seat_prize_check check (
    current_prize in (100, 500, 1000, 4000, 8000, 16000, 32000, 64000, 125000, 250000, 500000, 1000000)
  ),
  constraint hot_seat_answer_check check (
    selected_answer is null or selected_answer in ('A', 'B', 'C', 'D')
  ),
  constraint hot_seat_final_answer_check check (
    final_answer is null or final_answer in ('A', 'B', 'C', 'D')
  ),
  constraint hot_seat_status_check check (
    status in ('awaiting_answer', 'revealed_correct', 'revealed_wrong', 'turn_complete')
  )
);

alter table public.game_states
  add column if not exists current_hot_seat_turn_id uuid references public.hot_seat_turns(id) on delete set null;

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
      'fastest_finger_winner',
      'hot_seat_question_loaded',
      'hot_seat_answer_locked',
      'hot_seat_turn_completed'
    )
  );

create index if not exists hot_seat_turns_room_status_idx
  on public.hot_seat_turns(room_id, status, started_at desc);

create index if not exists hot_seat_turns_game_account_idx
  on public.hot_seat_turns(game_state_id, account_id);

alter table public.hot_seat_turns enable row level security;

grant usage on schema public to service_role;
grant select, insert, update, delete on public.hot_seat_turns to service_role;

notify pgrst, 'reload schema';

-- Browser clients do not read hot_seat_turns directly. API routes use the
-- server secret, hide correct answers until reveal, and publish room_events.
