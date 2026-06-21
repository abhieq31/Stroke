-- StrokeGuard schema: stores each user's saved risk assessments.
-- Run this in the Supabase SQL editor (or via `supabase db push`).

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  inputs jsonb not null,
  probability double precision not null,
  percent integer not null,
  risk_band text not null,
  factors jsonb not null default '[]'::jsonb
);

create index if not exists predictions_user_id_created_at_idx
  on public.predictions (user_id, created_at desc);

-- Row Level Security: each user can only see and manage their own rows.
alter table public.predictions enable row level security;

drop policy if exists "Users can view their own predictions" on public.predictions;
create policy "Users can view their own predictions"
  on public.predictions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own predictions" on public.predictions;
create policy "Users can insert their own predictions"
  on public.predictions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own predictions" on public.predictions;
create policy "Users can delete their own predictions"
  on public.predictions for delete
  using (auth.uid() = user_id);
