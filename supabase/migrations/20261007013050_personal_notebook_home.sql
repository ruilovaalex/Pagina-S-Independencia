-- Prepared for later integration. This migration has NOT been applied remotely.
create table public.home_saves (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  rooms jsonb not null default '{"living":{},"bedroom":{},"kitchen":{},"bathroom":{}}',
  wall_colors jsonb not null default '{"living":"#ddd6bf","bedroom":"#e1bdc4","kitchen":"#c7d2b2","bathroom":"#d4ddcd"}',
  revision integer not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(rooms) = 'object'),
  check (jsonb_typeof(wall_colors) = 'object')
);

create table public.financial_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  opening_balance numeric(12,2) not null default 0 check (opening_balance >= 0 and opening_balance <= 9999999),
  monthly_budget numeric(12,2) check (monthly_budget > 0 and monthly_budget <= 9999999)
);

alter table public.home_saves enable row level security;
alter table public.financial_preferences enable row level security;
revoke all on public.home_saves, public.financial_preferences from anon, public;
grant select, insert, update, delete on public.home_saves, public.financial_preferences to authenticated;

create policy home_owner_select on public.home_saves for select to authenticated using ((select auth.uid()) = user_id);
create policy home_owner_insert on public.home_saves for insert to authenticated with check ((select auth.uid()) = user_id);
create policy home_owner_update on public.home_saves for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy home_owner_delete on public.home_saves for delete to authenticated using ((select auth.uid()) = user_id);
create policy preferences_owner_select on public.financial_preferences for select to authenticated using ((select auth.uid()) = user_id);
create policy preferences_owner_insert on public.financial_preferences for insert to authenticated with check ((select auth.uid()) = user_id);
create policy preferences_owner_update on public.financial_preferences for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy preferences_owner_delete on public.financial_preferences for delete to authenticated using ((select auth.uid()) = user_id);

-- Invoker trigger: RLS on products remains effective; no privileged authorization path.
create function public.validate_home_save() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  room record;
  placement record;
  color record;
  ids text[] := array[]::text[];
begin
  if jsonb_typeof(new.rooms) is distinct from 'object' or jsonb_typeof(new.wall_colors) is distinct from 'object' then
    raise exception 'Invalid home document' using errcode = '23514';
  end if;
  if not (new.rooms ?& array['living','bedroom','kitchen','bathroom']) then
    raise exception 'Missing room' using errcode = '23514';
  end if;
  for room in select * from jsonb_each(new.rooms) loop
    if room.key not in ('living','bedroom','kitchen','bathroom') or jsonb_typeof(room.value) <> 'object' then
      raise exception 'Invalid room' using errcode = '23514';
    end if;
    for placement in select * from jsonb_each(room.value) loop
      if placement.key = any(ids) or cardinality(ids) >= 500 then
        raise exception 'Duplicate object or capacity exceeded' using errcode = '23514';
      end if;
      if not exists (select 1 from public.products p where p.id = placement.key::uuid and p.user_id = new.user_id) then
        raise exception 'Object unavailable to this owner' using errcode = '23514';
      end if;
      if jsonb_typeof(placement.value) is distinct from 'object'
        or jsonb_typeof(placement.value->'x') is distinct from 'number'
        or jsonb_typeof(placement.value->'z') is distinct from 'number'
        or jsonb_typeof(placement.value->'rotation') is distinct from 'number' then
        raise exception 'Invalid placement' using errcode = '23514';
      end if;
      if abs((placement.value->>'x')::numeric) > 3.2 or abs((placement.value->>'z')::numeric) > 2.8
        or (placement.value->>'rotation')::numeric not between 0 and 6.283185307179587 then
        raise exception 'Placement outside room' using errcode = '23514';
      end if;
      ids := array_append(ids, placement.key);
    end loop;
  end loop;
  for color in select * from jsonb_each_text(new.wall_colors) loop
    if color.key not in ('living','bedroom','kitchen','bathroom') or color.value !~ '^#[0-9a-fA-F]{6}$' then
      raise exception 'Invalid wall color' using errcode = '23514';
    end if;
  end loop;
  if tg_op = 'UPDATE' then new.revision := old.revision + 1; else new.revision := 0; end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function public.validate_home_save() from public, anon;
create trigger validate_home_save before insert or update on public.home_saves
for each row execute function public.validate_home_save();
