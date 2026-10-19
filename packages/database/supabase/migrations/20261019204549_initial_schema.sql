-- IronClad: initial schema (profiles, rooms, time slots, bookings, RLS)

-- Cleanup: leftovers from the earlier Prisma experiment
drop table if exists public."User";
drop type  if exists public."Role";


-- Extensions and private schema (not exposed by the API)
create extension if not exists btree_gist with schema extensions;

create schema if not exists private;
grant usage on schema private to authenticated;


-- Enums
create type public.user_role as enum (
  'MIS_ADMIN',
  'TEMP_ADMIN',   -- testing and demo only; retire before deployment
  'COUNCIL',
  'STUDENT'
);

create type public.council_division as enum (
  'TECHNICAL',
  'PROGRAM',
  'CREATIVE',
  'EXECUTIVES',
  'OPERATIONAL'
);

create type public.booking_status as enum (
  'pending',
  'approved',
  'rejected',
  'cancelled'
);


-- Trigger: keep updated_at current
create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;


-- profiles
create table public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  full_name        text not null default '',
  role             public.user_role not null default 'STUDENT',
  council_division public.council_division,
  section          text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- division required for COUNCIL, forbidden otherwise
  constraint profiles_council_division_matches_role
    check ((role = 'COUNCIL') = (council_division is not null))
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();


-- Create a profile on sign-up (role always defaults to STUDENT)
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();


-- Role helpers for RLS policies
create function private.has_role(variadic roles public.user_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = any (roles)
  );
$$;

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_role('MIS_ADMIN', 'TEMP_ADMIN');
$$;

create function private.is_operational()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'COUNCIL'
      and council_division = 'OPERATIONAL'
  );
$$;

revoke execute on function private.has_role(public.user_role[]) from public;
revoke execute on function private.is_admin() from public;
revoke execute on function private.is_operational() from public;
grant  execute on function private.has_role(public.user_role[]) to authenticated;
grant  execute on function private.is_admin() to authenticated;
grant  execute on function private.is_operational() to authenticated;


-- rooms
create table public.rooms (
  id          bigint generated always as identity primary key,
  code        text not null unique,
  name        text not null,
  building    text,
  capacity    integer check (capacity is null or capacity > 0),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger rooms_set_updated_at
  before update on public.rooms
  for each row execute function private.set_updated_at();


-- time_slots (day_of_week: 1 = Monday ... 7 = Sunday, NULL = every day)
create table public.time_slots (
  id           bigint generated always as identity primary key,
  label        text not null,
  day_of_week  smallint check (day_of_week between 1 and 7),
  start_time   time not null,
  end_time     time not null,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint time_slots_valid_time check (end_time > start_time),
  constraint time_slots_unique unique nulls not distinct (day_of_week, start_time, end_time)
);

create trigger time_slots_set_updated_at
  before update on public.time_slots
  for each row execute function private.set_updated_at();


-- room_bookings (starts_at and ends_at are derived from the slot)
create table public.room_bookings (
  id           bigint generated always as identity primary key,
  room_id      bigint not null references public.rooms (id),
  slot_id      bigint not null references public.time_slots (id),
  booking_date date   not null,
  booked_by    uuid   not null references public.profiles (id),
  purpose      text   not null,
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  status       public.booking_status not null default 'pending',
  reviewed_by  uuid references public.profiles (id),
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint room_bookings_valid_time
    check (ends_at > starts_at),

  -- no overlapping pending/approved bookings for the same room
  constraint room_bookings_no_overlap
    exclude using gist (
      room_id extensions.gist_int8_ops with =,
      tstzrange(starts_at, ends_at, '[)') with &&
    )
    where (status in ('pending', 'approved'))
);

create index room_bookings_booked_by_idx on public.room_bookings (booked_by);
create index room_bookings_date_idx      on public.room_bookings (booking_date);

create trigger room_bookings_set_updated_at
  before update on public.room_bookings
  for each row execute function private.set_updated_at();


-- Derive starts_at / ends_at from the slot and validate the booking
create function private.apply_booking_slot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  slot public.time_slots%rowtype;
begin
  select * into slot from public.time_slots where id = new.slot_id;

  if not found or not slot.is_active then
    raise exception 'Time slot % does not exist or is inactive', new.slot_id
      using errcode = '23503';
  end if;

  if slot.day_of_week is not null
     and slot.day_of_week <> extract(isodow from new.booking_date) then
    raise exception 'Slot "%" is not available on %', slot.label, to_char(new.booking_date, 'FMDay')
      using errcode = '23514';
  end if;

  new.starts_at := (new.booking_date + slot.start_time) at time zone 'Asia/Manila';
  new.ends_at   := (new.booking_date + slot.end_time)   at time zone 'Asia/Manila';

  if tg_op = 'INSERT' and new.starts_at <= now() then
    raise exception 'Cannot book a slot that has already started'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger room_bookings_apply_slot
  before insert or update of slot_id, booking_date on public.room_bookings
  for each row execute function private.apply_booking_slot();


-- Row Level Security
alter table public.profiles      enable row level security;
alter table public.rooms         enable row level security;
alter table public.time_slots    enable row level security;
alter table public.room_bookings enable row level security;


-- profiles policies
create policy "profiles: read own; admins read all; OPERATIONAL reads students and council"
  on public.profiles for select
  to authenticated
  using (
    id = (select auth.uid())
    or private.is_admin()
    or (private.is_operational() and role in ('STUDENT', 'COUNCIL'))
  );

create policy "profiles: update own"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- users may only edit these columns directly
revoke update on public.profiles from anon, authenticated;
grant  update (full_name, section) on public.profiles to authenticated;


-- Council role management (OPERATIONAL and admins; STUDENT/COUNCIL only)
create function public.set_council_membership(
  target_id    uuid,
  new_role     public.user_role,
  new_division public.council_division default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_target_role public.user_role;
begin
  if not (private.is_admin() or private.is_operational()) then
    raise exception 'Only OPERATIONAL council members or admins can manage council roles'
      using errcode = '42501';
  end if;

  if new_role not in ('STUDENT', 'COUNCIL') then
    raise exception 'Only STUDENT or COUNCIL can be assigned here'
      using errcode = '22023';
  end if;

  select role into current_target_role
  from public.profiles
  where id = target_id
  for update;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  if current_target_role not in ('STUDENT', 'COUNCIL') then
    raise exception 'Admin accounts cannot be changed here'
      using errcode = '42501';
  end if;

  if target_id = (select auth.uid()) and not private.is_admin() then
    raise exception 'You cannot change your own role'
      using errcode = '42501';
  end if;

  update public.profiles
  set role             = new_role,
      council_division = case when new_role = 'COUNCIL' then new_division end
  where id = target_id;
end;
$$;

revoke execute on function public.set_council_membership(uuid, public.user_role, public.council_division) from public, anon;
grant  execute on function public.set_council_membership(uuid, public.user_role, public.council_division) to authenticated;


-- rooms policies
create policy "rooms: any signed-in user can read"
  on public.rooms for select
  to authenticated
  using (true);

create policy "rooms: admins insert"
  on public.rooms for insert
  to authenticated
  with check (private.is_admin());

create policy "rooms: admins update"
  on public.rooms for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "rooms: admins delete"
  on public.rooms for delete
  to authenticated
  using (private.is_admin());


-- time_slots policies
create policy "slots: any signed-in user can read"
  on public.time_slots for select
  to authenticated
  using (true);

create policy "slots: admins insert"
  on public.time_slots for insert
  to authenticated
  with check (private.is_admin());

create policy "slots: admins update"
  on public.time_slots for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "slots: admins delete"
  on public.time_slots for delete
  to authenticated
  using (private.is_admin());


-- room_bookings policies
create policy "bookings: any signed-in user can read"
  on public.room_bookings for select
  to authenticated
  using (true);

create policy "bookings: any role can request"
  on public.room_bookings for insert
  to authenticated
  with check (
    private.has_role('STUDENT', 'COUNCIL', 'MIS_ADMIN', 'TEMP_ADMIN')
    and booked_by = (select auth.uid())
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
  );

create policy "bookings: requester can cancel own"
  on public.room_bookings for update
  to authenticated
  using (
    booked_by = (select auth.uid())
    and status in ('pending', 'approved')
  )
  with check (
    booked_by = (select auth.uid())
    and status = 'cancelled'
  );

create policy "bookings: admins update"
  on public.room_bookings for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());
