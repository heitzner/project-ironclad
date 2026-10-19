-- =====================================================================
-- IronClad: Migration 1 (initial schema)
-- Identity (profiles + roles), rooms, room bookings, RLS.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Cleanup: leftovers from the earlier Prisma experiment
--    "User" was already dropped by hand; IF EXISTS makes that line a
--    harmless no-op while keeping the removal recorded in git.
-- ---------------------------------------------------------------------
drop table if exists public."User";
drop type  if exists public."Role";


-- ---------------------------------------------------------------------
-- 1. Extensions and a private schema
--    btree_gist: lets one constraint compare a room id (=) and a time
--    range (overlap) together; needed for the double-booking guard.
--    private: holds helper functions; it is NOT exposed by the API.
-- ---------------------------------------------------------------------
create extension if not exists btree_gist with schema extensions;

create schema if not exists private;
grant usage on schema private to authenticated;


-- ---------------------------------------------------------------------
-- 2. Enums
-- ---------------------------------------------------------------------
create type public.user_role as enum (
  'MIS_ADMIN',
  'TEMP_ADMIN',   -- testing and defense demo only; retire before deployment
  'COUNCIL',      -- can book rooms and upload events; division required
  'STUDENT'       -- can book rooms (e.g. the class president of a section)
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


-- ---------------------------------------------------------------------
-- 3. Shared trigger: keep updated_at current on every UPDATE
-- ---------------------------------------------------------------------
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


-- ---------------------------------------------------------------------
-- 4. profiles: one row per login account (auth.users)
-- ---------------------------------------------------------------------
create table public.profiles (
  id               uuid primary key references auth.users (id) on delete cascade,
  full_name        text not null default '',
  role             public.user_role not null default 'STUDENT',
  council_division public.council_division,
  section          text,                                  -- e.g. 'BSCS 2A'
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  -- A division is required for COUNCIL and forbidden for everyone else.
  constraint profiles_council_division_matches_role
    check ((role = 'COUNCIL') = (council_division is not null))
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();


-- Auto-create a profile when someone signs up.
-- Role is ALWAYS the default (STUDENT); it is never read from sign-up
-- metadata, because users control that metadata themselves.
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


-- ---------------------------------------------------------------------
-- 5. Role helpers used by RLS policies
--    SECURITY DEFINER lets them read profiles without tripping the
--    profiles RLS policies (which would otherwise loop on themselves).
-- ---------------------------------------------------------------------
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

-- OPERATIONAL is the council division that manages council membership.
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


-- ---------------------------------------------------------------------
-- 6. rooms
-- ---------------------------------------------------------------------
create table public.rooms (
  id          bigint generated always as identity primary key,
  code        text not null unique,                       -- e.g. 'CSD-301'
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


-- ---------------------------------------------------------------------
-- 7. time_slots: the fixed periods rooms can be booked for
--    Managed by admins. day_of_week uses ISO numbering
--    (1 = Monday ... 7 = Sunday); NULL means the slot exists every day.
--    Times are campus local time (Asia/Manila).
-- ---------------------------------------------------------------------
create table public.time_slots (
  id           bigint generated always as identity primary key,
  label        text not null,                             -- e.g. 'Period 1'
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


-- ---------------------------------------------------------------------
-- 8. room_bookings
--    Users pick a room, a date, and a slot. starts_at and ends_at are
--    filled in automatically from the slot (see trigger below); they
--    exist so the double-booking guard and the live occupancy view can
--    work with real timestamps.
-- ---------------------------------------------------------------------
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

  -- Double-booking guard (first come, first served):
  -- no two PENDING or APPROVED bookings of the same room may overlap.
  -- '[)' means start-inclusive, end-exclusive, so back-to-back bookings
  -- (10:00-11:00 then 11:00-12:00) are allowed.
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


-- Fill starts_at / ends_at from the chosen slot and validate the choice.
-- Any starts_at / ends_at sent by the client is overwritten.
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


-- ---------------------------------------------------------------------
-- 9. Row Level Security (on for every table, from day one)
-- ---------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.rooms         enable row level security;
alter table public.time_slots    enable row level security;
alter table public.room_bookings enable row level security;


-- profiles -------------------------------------------------------------
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

-- Column-level lock: through the API a user may only edit these two
-- columns directly. role and council_division change only through
-- public.set_council_membership() below, the dashboard, or the backend
-- (secret key).
revoke update on public.profiles from anon, authenticated;
grant  update (full_name, section) on public.profiles to authenticated;


-- Council membership management (called from the app as an RPC).
-- Allowed callers: OPERATIONAL council members and admins.
-- Rules:
--   * can only assign STUDENT or COUNCIL (never an admin role)
--   * can only change accounts that are currently STUDENT or COUNCIL
--   * OPERATIONAL members cannot change their own role
--   * switching to STUDENT clears the division automatically
--   * COUNCIL without a division is rejected by the table constraint
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


-- rooms ----------------------------------------------------------------
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


-- time_slots -----------------------------------------------------------
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


-- room_bookings --------------------------------------------------------
-- Everyone signed in can see bookings: needed for the live occupancy view.
create policy "bookings: any signed-in user can read"
  on public.room_bookings for select
  to authenticated
  using (true);

-- Every role can request a room, only as themselves, and only as a
-- fresh pending request.
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

-- The requester can cancel their own active booking (and nothing else).
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

-- Admins approve, reject, or adjust any booking.
create policy "bookings: admins update"
  on public.room_bookings for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- No DELETE policy: bookings are kept as history; cancel instead.
