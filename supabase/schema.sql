-- Nakshatra AI Database Schema for Supabase
create extension if not exists "uuid-ossp";

create table if not exists public.chats (
  id uuid default gen_random_uuid() primary key,
  chat_id uuid default gen_random_uuid() not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Migration script if table already exists without chat_id column:
alter table public.chats add column if not exists chat_id uuid default gen_random_uuid() not null;

alter table public.chats enable row level security;

-- Drop existing policies if re-running
drop policy if exists "Users can view own chat messages" on public.chats;
drop policy if exists "Users can insert own chat messages" on public.chats;
drop policy if exists "Users can delete own chat messages" on public.chats;

create policy "Users can view own chat messages"
  on public.chats for select
  using (auth.uid() = user_id);

create policy "Users can insert own chat messages"
  on public.chats for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own chat messages"
  on public.chats for delete
  using (auth.uid() = user_id);

create index if not exists idx_chats_user_created on public.chats(user_id, created_at asc);
create index if not exists idx_chats_user_chat_id on public.chats(user_id, chat_id, created_at asc);

