-- Mi Independencia: ejecutar UNA VEZ en un proyecto Supabase nuevo.
-- Si ya existen tablas con estos nombres, revisar su estructura antes de migrar.
begin;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  created_at timestamptz not null default now()
);

create table public.app_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references auth.users(id) on delete cascade,
  total_budget numeric(12,2) not null default 1500 check (total_budget >= 0),
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  category text not null default 'Otro',
  priority text not null default 'P2' check (priority in ('P1', 'P2', 'P3')),
  quantity integer not null default 1 check (quantity > 0),
  estimated_price numeric(12,2) not null default 0 check (estimated_price >= 0),
  paid_price numeric(12,2) check (paid_price >= 0),
  bought boolean not null default false,
  store text not null default '',
  link text not null default '' check (link = '' or link ~* '^https?://'),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  description text not null check (length(btrim(description)) > 0),
  category text not null default 'Otro',
  date date not null default (now() at time zone 'America/Guayaquil')::date,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table public.incomes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  description text not null check (length(btrim(description)) > 0),
  source text not null default 'Otro',
  date date not null default (now() at time zone 'America/Guayaquil')::date,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  city text not null default 'Cuenca',
  address text not null default '',
  website text not null default '' check (website = '' or website ~* '^https?://'),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table public.price_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  product_name text not null check (length(btrim(product_name)) > 0),
  store_name text not null default '',
  price numeric(12,2) not null default 0 check (price >= 0),
  url text not null default '' check (url = '' or url ~* '^https?://'),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index products_user_id_idx on public.products(user_id);
create index expenses_user_date_idx on public.expenses(user_id, date);
create index incomes_user_date_idx on public.incomes(user_id, date);
create index stores_user_id_idx on public.stores(user_id);
create index price_searches_user_id_idx on public.price_searches(user_id);

-- Todas las tablas, incluso las de configuración, quedan privadas.
do $$
declare
  table_name text;
  owner_column text;
begin
  foreach table_name in array array['profiles', 'app_settings', 'products', 'expenses', 'incomes', 'stores', 'price_searches']
  loop
    owner_column := case when table_name = 'profiles' then 'id' else 'user_id' end;
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from anon, authenticated', table_name);
    execute format('grant select, insert, update, delete on table public.%I to authenticated', table_name);
    execute format(
      'create policy owner_access on public.%I for all to authenticated using ((select auth.uid()) = %I) with check ((select auth.uid()) = %I)',
      table_name, owner_column, owner_column
    );
  end loop;
end $$;

commit;
