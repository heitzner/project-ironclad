-- IronClad: portal schema matching the backend repository contracts
-- (apps/server/DATA_CONTRACTS.md). Replaces the Migration 1 draft model.
-- The backend connects directly; the Supabase Data API gets no access.


-- Remove the Migration 1 model (no data was stored in it)
drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.set_council_membership(uuid, public.user_role, public.council_division);
drop table if exists public.room_bookings;
drop table if exists public.time_slots;
drop table if exists public.rooms;
drop table if exists public.profiles;
drop schema if exists private cascade;
drop type if exists public.booking_status;
drop type if exists public.council_division;
drop type if exists public.user_role;


-- Key-value settings (dataset label, version, revision counter)
create table public.app_meta (
  key   text primary key,
  value jsonb not null
);


-- Accounts and authorization
create table public.accounts (
  id             text primary key,
  student_id     text not null,
  password_hash  text not null,
  name           text not null,
  role           text not null check (role in ('student', 'council', 'admin')),
  position       text not null default '',
  course         text not null,
  year_level     text not null,
  section        text not null,
  email          text not null,
  email_verified boolean not null default false,
  status         text not null default 'active',
  disabled       boolean not null default false,
  created_at     timestamptz not null default now(),
  extra          jsonb not null default '{}',
  seq            bigint generated always as identity
);

create unique index accounts_student_id_key on public.accounts (upper(student_id));
create unique index accounts_email_key      on public.accounts (lower(email));

create table public.memberships (
  account_id text primary key references public.accounts (id) on delete cascade,
  role       text not null check (role in ('student', 'council', 'admin')),
  position   text not null default '',
  scope      text not null default '',
  course     text,
  extra      jsonb not null default '{}',
  seq        bigint generated always as identity,

  -- one President / Vice President / Secretary per organization;
  -- deferred so a presidential handover can swap holders in one transaction
  constraint memberships_one_officer_per_org
    exclude using gist (
      role     extensions.gist_text_ops with =,
      scope    extensions.gist_text_ops with =,
      position extensions.gist_text_ops with =
    )
    where (position in ('President', 'Vice President', 'Secretary'))
    deferrable initially deferred
);

create table public.profiles (
  account_id     text primary key references public.accounts (id) on delete cascade,
  version        integer not null default 0,
  display_name   text,
  avatar_url     text,
  email          text,
  email_verified boolean,
  updated_at     timestamptz,
  corrections    jsonb not null default '[]',
  extra          jsonb not null default '{}',
  seq            bigint generated always as identity
);

create table public.sessions (
  id         text primary key,
  account_id text not null references public.accounts (id) on delete cascade,
  issued_at  bigint not null,   -- epoch seconds, as issued in the JWT
  expires_at bigint not null
);

create index sessions_account_id_idx on public.sessions (account_id);


-- Rooms, timetable, booking windows, closures
create table public.rooms (
  id             text primary key,
  floor          integer not null,
  name           text not null,
  capacity       integer check (capacity is null or capacity > 0),
  location       text,
  equipment      jsonb not null default '[]',
  icon           text,
  selected_icon  text,
  blocked_label  text,
  blocked_reason text,
  reservable     boolean not null default true,   -- false for Floor 4 (QA-M004)
  extra          jsonb not null default '{}',
  seq            bigint generated always as identity
);

create table public.room_timetable (
  id        text primary key,
  room_id   text not null references public.rooms (id) on delete cascade,
  start_min integer not null,
  end_min   integer not null,
  type      text not null,
  title     text not null,
  host      text,
  seq       bigint generated always as identity,

  constraint room_timetable_valid_time check (start_min >= 0 and end_min <= 1440 and start_min < end_min)
);

create table public.schedule_windows (
  shift     text primary key,
  start_min integer not null,
  end_min   integer not null,
  seq       bigint generated always as identity,

  constraint schedule_windows_valid_time check (start_min >= 0 and end_min <= 1440 and start_min < end_min)
);

create table public.room_closures (
  id         text primary key,
  room_id    text not null references public.rooms (id) on delete cascade,
  start_date date not null,
  end_date   date not null,
  start_min  integer not null,
  end_min    integer not null,
  reason     text not null,
  mode       text not null check (mode in ('interval', 'day', 'week')),
  created_by text references public.accounts (id) on delete set null,
  created_at timestamptz not null default now(),
  extra      jsonb not null default '{}',
  seq        bigint generated always as identity,

  constraint room_closures_valid_range check (start_date <= end_date and start_min < end_min)
);


-- Room bookings (start/end are minutes after midnight, Asia/Manila)
create table public.bookings (
  id             text primary key,
  room_id        text not null references public.rooms (id),
  booking_date   date not null,
  shift          text not null,
  start_min      integer not null,
  end_min        integer not null,
  purpose        text not null,
  requester_id   text references public.accounts (id) on delete set null,
  requester_name text not null,
  student_id     text,
  status         text not null check (status in ('pending', 'approved', 'declined', 'cancelled')),
  created_at     timestamptz not null default now(),
  reviewed_by    text,
  reviewed_at    timestamptz,
  reason         text,
  extra          jsonb not null default '{}',
  seq            bigint generated always as identity,

  constraint bookings_valid_time check (start_min >= 0 and end_min <= 1440 and start_min < end_min),

  -- no overlapping pending/approved bookings for the same room and day
  constraint bookings_no_overlap
    exclude using gist (
      room_id      extensions.gist_text_ops with =,
      booking_date extensions.gist_date_ops with =,
      int4range(start_min, end_min) with &&
    )
    where (status in ('pending', 'approved'))
);

create index bookings_requester_id_idx on public.bookings (requester_id);

-- Floor 4 and other non-reservable rooms can never receive a booking
create function public.bookings_require_reservable_room()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from public.rooms where id = new.room_id and reservable) then
    raise exception 'Room % is not available for reservation', new.room_id
      using errcode = 'P0001', hint = 'ROOM_UNAVAILABLE';
  end if;
  return new;
end;
$$;

create trigger bookings_reservable_room
  before insert or update of room_id on public.bookings
  for each row execute function public.bookings_require_reservable_room();


-- News feed posts, registrations, council applications
create table public.posts (
  id                text primary key,
  kind              text not null check (kind in ('announcement', 'event', 'council')),
  title             text not null,
  description       text not null,
  starts_at         timestamptz not null,
  ends_at           timestamptz not null,
  venue             text,
  organizer         text,
  capacity          integer check (capacity is null or capacity > 0),
  status            text not null default 'published',
  created_by        text references public.accounts (id) on delete set null,
  created_at        timestamptz not null default now(),
  image_key         text,
  registration_kind text check (registration_kind in ('individual', 'team')),
  team_size         integer check (team_size is null or team_size between 2 and 20),
  categories        jsonb,
  program           text,
  questions         jsonb,
  extra             jsonb not null default '{}',
  seq               bigint generated always as identity,

  constraint posts_valid_time check (ends_at > starts_at)
);

create table public.event_registrations (
  id          text primary key,
  post_id     text not null references public.posts (id) on delete cascade,
  title       text not null,
  kind        text not null,
  user_id     text not null references public.accounts (id) on delete cascade,
  name        text not null,
  student_id  text not null,
  program     text,
  details     jsonb not null default '{}',
  status      text not null,
  created_at  timestamptz not null default now(),
  reviewed_by text,
  reviewed_at timestamptz,
  reason      text,
  extra       jsonb not null default '{}',
  seq         bigint generated always as identity,

  constraint event_registrations_one_per_user unique (post_id, user_id)
);

create table public.council_applications (
  id          text primary key,
  post_id     text not null references public.posts (id) on delete cascade,
  title       text not null,
  kind        text not null,
  user_id     text not null references public.accounts (id) on delete cascade,
  name        text not null,
  student_id  text not null,
  program     text,
  details     jsonb not null default '{}',
  status      text not null check (status in ('pending', 'accepted', 'declined')),
  created_at  timestamptz not null default now(),
  reviewed_by text,
  reviewed_at timestamptz,
  reason      text,
  extra       jsonb not null default '{}',
  seq         bigint generated always as identity,

  constraint council_applications_one_per_user unique (post_id, user_id)
);


-- Organization management
create table public.handovers (
  id           text primary key,
  from_account text not null references public.accounts (id) on delete cascade,
  to_account   text not null references public.accounts (id) on delete cascade,
  scope        text not null,
  role         text not null,
  status       text not null check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  at           timestamptz not null default now(),
  responded_at timestamptz,
  extra        jsonb not null default '{}',
  seq          bigint generated always as identity
);

create table public.organization_log (
  id    text primary key,
  actor text not null,
  text  text not null,
  scope text not null,
  at    timestamptz not null default now(),
  extra jsonb not null default '{}',
  seq   bigint generated always as identity
);

create table public.identity_corrections (
  id      text primary key,
  user_id text not null references public.accounts (id) on delete cascade,
  field   text not null,
  value   text not null,
  reason  text not null,
  status  text not null default 'pending',
  at      timestamptz not null default now(),
  extra   jsonb not null default '{}',
  seq     bigint generated always as identity
);


-- Archive of concluded campus events
create table public.archive_records (
  id             text primary key,
  title          text not null,
  course_section text,
  category       text,
  organizer      text,
  concluded_date date,
  academic_year  text,
  semester       text,
  venue          jsonb,
  permit_no      text unique,
  start_time     text,
  end_time       text,
  has_asset      boolean not null default false,
  extra          jsonb not null default '{}',
  seq            bigint generated always as identity
);


-- Lock down the Supabase Data API: RLS on, no policies, no grants.
-- The backend connects as the database owner and enforces access itself.
do $$
declare
  t text;
begin
  foreach t in array array[
    'app_meta', 'accounts', 'memberships', 'profiles', 'sessions', 'rooms',
    'room_timetable', 'schedule_windows', 'room_closures', 'bookings', 'posts',
    'event_registrations', 'council_applications', 'handovers',
    'organization_log', 'identity_corrections', 'archive_records'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
  end loop;
end;
$$;

revoke execute on function public.bookings_require_reservable_room() from public, anon, authenticated;
