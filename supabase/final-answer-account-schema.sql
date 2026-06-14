-- Final Answer Milestone 2 account schema.
-- Run this in the Supabase SQL Editor before enabling real accounts.

create extension if not exists pgcrypto;

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  display_name text not null,
  pin_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounts_username_format check (username ~ '^[a-z0-9_]{3,20}$'),
  constraint accounts_display_name_length check (char_length(display_name) between 1 and 24)
);

create table if not exists public.account_stats (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  games_played integer not null default 0,
  wins integer not null default 0,
  ties integer not null default 0,
  highest_prize_won integer not null default 0,
  total_money_won integer not null default 0,
  fastest_finger_wins integer not null default 0,
  questions_answered_correctly integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint account_stats_non_negative check (
    games_played >= 0
    and wins >= 0
    and ties >= 0
    and highest_prize_won >= 0
    and total_money_won >= 0
    and fastest_finger_wins >= 0
    and questions_answered_correctly >= 0
  )
);

create table if not exists public.account_login_attempts (
  username text primary key,
  failed_count integer not null default 0,
  locked_until timestamptz,
  last_failed_at timestamptz not null default now()
);

create table if not exists public.account_sessions (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists account_sessions_account_id_idx
  on public.account_sessions(account_id);

create index if not exists account_sessions_expires_at_idx
  on public.account_sessions(expires_at);

alter table public.accounts enable row level security;
alter table public.account_stats enable row level security;
alter table public.account_login_attempts enable row level security;
alter table public.account_sessions enable row level security;

-- The app uses a server-only Supabase secret key for Milestone 2 account routes.
-- Browser users should not directly read or write these tables.
