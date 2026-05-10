-- ============================================================
-- DriveCompare — Supabase Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ─── Users ───────────────────────────────────────────────────
create table if not exists users (
  id                    uuid primary key default gen_random_uuid(),
  email                 text unique not null,
  password_hash         text not null,
  name                  text not null,
  deletion_requested_at timestamptz,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

create index idx_users_email on users(email);

-- ─── Vehicles ────────────────────────────────────────────────
create table if not exists vehicles (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  vin          text check (length(vin) = 17),
  make         text not null,
  model        text not null,
  year         int  not null check (year >= 1990 and year <= 2030),
  trim         text,
  mileage      int  check (mileage >= 0),
  primary_use  text check (primary_use in ('daily_commute','pleasure','business','farm')),
  deleted_at   timestamptz,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index idx_vehicles_user_id on vehicles(user_id);

-- Enforce max 5 active vehicles per user
create or replace function check_vehicle_limit()
returns trigger language plpgsql as $$
begin
  if (
    select count(*) from vehicles
    where user_id = new.user_id and deleted_at is null
  ) >= 5 then
    raise exception 'Maximum of 5 vehicles per account';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_vehicle_limit on vehicles;
create trigger enforce_vehicle_limit
  before insert on vehicles
  for each row execute function check_vehicle_limit();

-- ─── Quote Requests ──────────────────────────────────────────
create table if not exists quote_requests (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references users(id) on delete cascade,
  vehicle_id            uuid not null references vehicles(id) on delete cascade,
  quotes                jsonb not null default '[]',
  unavailable_providers jsonb not null default '[]',
  created_at            timestamptz default now()
);

create index idx_quote_requests_user_id   on quote_requests(user_id);
create index idx_quote_requests_vehicle_id on quote_requests(vehicle_id);
create index idx_quote_requests_created_at on quote_requests(created_at);

-- Auto-purge quote requests older than 12 months (run daily via pg_cron or cron job)
-- create extension if not exists pg_cron;
-- select cron.schedule('purge-old-quotes', '0 3 * * *',
--   $$delete from quote_requests where created_at < now() - interval '12 months'$$);

-- ─── Alert Configs ───────────────────────────────────────────
create table if not exists alert_configs (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references users(id) on delete cascade,
  vehicle_id       uuid not null references vehicles(id) on delete cascade,
  enabled          boolean default true,
  frequency_months int default 6 check (frequency_months in (3, 6, 12)),
  next_alert_at    timestamptz default (now() + interval '6 months'),
  last_sent_at     timestamptz,
  retry_count      int default 0,
  last_error       text,
  created_at       timestamptz default now(),
  updated_at       timestamptz default now(),
  unique (vehicle_id)
);

create index idx_alert_configs_user_id      on alert_configs(user_id);
create index idx_alert_configs_next_alert_at on alert_configs(next_alert_at) where enabled = true;

-- Auto-create alert config when a vehicle is added
create or replace function create_default_alert()
returns trigger language plpgsql as $$
begin
  insert into alert_configs (user_id, vehicle_id, next_alert_at)
  values (new.user_id, new.id, now() + interval '6 months')
  on conflict (vehicle_id) do nothing;
  return new;
end;
$$;

drop trigger if exists auto_create_alert on vehicles;
create trigger auto_create_alert
  after insert on vehicles
  for each row execute function create_default_alert();

-- ─── Row Level Security ──────────────────────────────────────
-- Our backend uses the service role key which bypasses RLS.
-- These policies protect against accidental direct client access.

alter table users          enable row level security;
alter table vehicles       enable row level security;
alter table quote_requests enable row level security;
alter table alert_configs  enable row level security;

-- Service role bypasses all RLS — no policies needed for server access.
-- Add anon/authenticated policies here if you ever add Supabase Auth on the client.
