-- Final Answer Milestone 5 realtime game-state foundation.
-- Run after final-answer-room-schema.sql.

alter table public.rooms
  add column if not exists membership_locked_at timestamptz;

alter table public.rooms
  drop constraint if exists rooms_status_check;

update public.rooms
set status = 'fastest_finger',
    updated_at = now()
where status = 'in_game';

alter table public.rooms
  add constraint rooms_status_check check (
    status in ('waiting', 'starting', 'fastest_finger', 'hot_seat', 'completed')
  );

create table if not exists public.game_states (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null unique references public.rooms(id) on delete cascade,
  current_room_status text not null default 'starting',
  host_account_id uuid not null references public.accounts(id) on delete cascade,
  join_order uuid[] not null default '{}',
  completed_turn_account_ids uuid[] not null default '{}',
  eligible_account_ids uuid[] not null default '{}',
  hot_seat_account_id uuid references public.accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint game_states_current_status_check check (
    current_room_status in ('starting', 'fastest_finger', 'hot_seat', 'completed')
  )
);

create table if not exists public.room_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  actor_account_id uuid references public.accounts(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint room_events_event_type_check check (
    event_type in (
      'player_joined',
      'player_left',
      'ready_changed',
      'host_changed',
      'room_status_changed',
      'game_started'
    )
  )
);

create index if not exists game_states_room_id_idx
  on public.game_states(room_id);

create index if not exists room_events_room_id_created_at_idx
  on public.room_events(room_id, created_at desc);

alter table public.game_states enable row level security;
alter table public.room_events enable row level security;

drop policy if exists "room_events are visible for realtime refresh" on public.room_events;

create policy "room_events are visible for realtime refresh"
  on public.room_events
  for select
  to anon
  using (true);

grant usage on schema public to service_role, anon;
grant select, insert, update, delete on public.game_states to service_role;
grant select, insert, update, delete on public.room_events to service_role;
grant select on public.room_events to anon;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'room_events'
  ) then
    alter publication supabase_realtime add table public.room_events;
  end if;
end;
$$;

notify pgrst, 'reload schema';

-- Clients subscribe to room_events only. They still fetch actual room/game state
-- through server API routes, so room writes and rule enforcement remain server-side.
