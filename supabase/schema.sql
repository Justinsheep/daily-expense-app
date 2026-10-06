create table if not exists public.expenses (
  user_id uuid not null references auth.users on delete cascade,
  id text not null,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.expenses enable row level security;
create policy "own expenses" on public.expenses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.categories (
  user_id uuid not null references auth.users on delete cascade,
  id text not null,
  data jsonb not null,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.categories enable row level security;
create policy "own categories" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 商家對照：Apple Pay 回報的商家名稱 → 你想要的備註與分類
create table if not exists public.merchant_rules (
  user_id uuid not null references auth.users on delete cascade,
  merchant text not null,
  note text,
  category text,
  updated_at timestamptz not null default now(),
  primary key (user_id, merchant)
);
alter table public.merchant_rules enable row level security;
create policy "own merchant_rules" on public.merchant_rules
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 捷徑專屬密鑰：每個使用者一組，iOS 捷徑打 add-expense API 時用它辨識是誰的帳
create table if not exists public.shortcut_tokens (
  token text primary key,
  user_id uuid not null unique references auth.users on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.shortcut_tokens enable row level security;
create policy "own shortcut_tokens" on public.shortcut_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
