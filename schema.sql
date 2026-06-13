-- ╔══════════════════════════════════════════════════════════╗
-- ║  PROMPT LIBRARY — database schema + security policies              ║
-- ║  Run this once in Supabase → SQL Editor → New query → Run.         ║
-- ╚══════════════════════════════════════════════════════════╝

create table if not exists public.prompts (
  id          uuid primary key default gen_random_uuid(),
  title       text not null check (char_length(title) between 1 and 140),
  body        text not null check (char_length(body)  between 1 and 8000),
  category    text not null default 'Other',
  author_name text not null default 'Anonymous',
  user_id     uuid not null references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create index if not exists prompts_created_idx  on public.prompts (created_at desc);
create index if not exists prompts_category_idx on public.prompts (category);

-- Row-Level Security: the server enforces who can do what.
alter table public.prompts enable row level security;

-- Anyone (even logged-out visitors) can READ every prompt.
drop policy if exists "public read" on public.prompts;
create policy "public read" on public.prompts
  for select using (true);

-- Only a logged-in user can CREATE a prompt, and only as themselves.
drop policy if exists "auth insert own" on public.prompts;
create policy "auth insert own" on public.prompts
  for insert with check (auth.uid() = user_id);

-- Only the owner can UPDATE their own prompt.
drop policy if exists "owner update" on public.prompts;
create policy "owner update" on public.prompts
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Only the owner can DELETE their own prompt.
drop policy if exists "owner delete" on public.prompts;
create policy "owner delete" on public.prompts
  for delete using (auth.uid() = user_id);
