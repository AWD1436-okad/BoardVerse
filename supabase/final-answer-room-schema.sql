-- Final Answer Milestone 3 private room schema.
-- Run after final-answer-account-schema.sql.

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_account_id uuid not null references public.accounts(id) on delete cascade,
  selected_player_count integer not null,
  status text not null default 'waiting',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  constraint rooms_code_format check (code ~ '^[A-Z0-9]{6}$'),
  constraint rooms_player_count check (selected_player_count between 2 and 10),
  constraint rooms_status_check check (status in ('waiting', 'in_game', 'completed'))
);

create table if not exists public.room_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  is_ready boolean not null default false,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  left_during_game boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (room_id, account_id)
);

create index if not exists rooms_code_idx on public.rooms(code);
create index if not exists rooms_host_account_id_idx on public.rooms(host_account_id);
create index if not exists room_players_room_id_idx on public.room_players(room_id);
create index if not exists room_players_account_id_idx on public.room_players(account_id);

alter table public.rooms enable row level security;
alter table public.room_players enable row level security;

grant usage on schema public to service_role;
grant select, insert, update, delete on public.rooms to service_role;
grant select, insert, update, delete on public.room_players to service_role;

notify pgrst, 'reload schema';

-- The app uses server-only routes for Milestone 3 room actions.
-- Browser users should not directly read or write these tables.
