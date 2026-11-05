-- Run once in the Supabase SQL editor.
-- Row level security is on and there are no public policies.
-- The app server uses the secret key, which bypasses these policies.
-- The publishable key cannot read password hashes.

create table if not exists public.organizations (
  id text primary key,
  name text not null,
  kind text not null check (kind in ('barangay', 'campus', 'city', 'institution')),
  slug text not null unique,
  created_at text not null,
  type_label text,
  logo_path text,
  campaign_rules text,
  min_kilos double precision default 0.01,
  max_kilos double precision default 5000,
  setup_complete integer not null default 1 check (setup_complete in (0, 1)),
  is_template integer not null default 0 check (is_template in (0, 1))
);

create unique index if not exists idx_organizations_name_nocase
  on public.organizations (lower(name));

create table if not exists public.units (
  id text primary key,
  organization_id text not null references public.organizations (id),
  name text not null,
  kind text not null,
  created_at text not null,
  unique (organization_id, name)
);

create table if not exists public.seasons (
  id text primary key,
  name text not null,
  starts_on text not null,
  ends_on text not null,
  status text not null check (status in ('upcoming', 'active', 'closed')),
  created_at text not null
);

create table if not exists public.season_members (
  season_id text not null references public.seasons (id),
  organization_id text not null references public.organizations (id),
  joined_at text not null,
  primary key (season_id, organization_id)
);

create table if not exists public.users (
  id text primary key,
  organization_id text references public.organizations (id),
  email text not null unique,
  name text not null,
  password_hash text not null,
  role text not null check (role in ('platform_admin', 'org_admin', 'middleman', 'viewer')),
  active integer not null default 1 check (active in (0, 1)),
  created_at text not null,
  is_owner integer not null default 0 check (is_owner in (0, 1)),
  join_status text not null default 'active' check (join_status in ('active', 'pending', 'declined'))
);

create table if not exists public.sessions (
  token_hash text primary key,
  user_id text not null references public.users (id),
  expires_at text not null,
  created_at text not null
);

create table if not exists public.collections (
  id text primary key,
  organization_id text not null references public.organizations (id),
  unit_id text not null references public.units (id),
  season_id text not null references public.seasons (id),
  recorded_by text not null references public.users (id),
  kilos double precision not null check (kilos > 0 and kilos <= 5000),
  note text,
  client_request_id text,
  voided integer not null default 0 check (voided in (0, 1)),
  void_reason text,
  voided_by text references public.users (id),
  voided_at text,
  created_at text not null
);

create unique index if not exists idx_collections_request
  on public.collections (recorded_by, client_request_id)
  where client_request_id is not null;

create index if not exists idx_collections_org_season
  on public.collections (organization_id, season_id, voided);

create table if not exists public.audit_log (
  id text primary key,
  actor_id text,
  organization_id text,
  action text not null,
  summary text not null,
  ip_hash text,
  created_at text not null
);

create index if not exists idx_audit_org
  on public.audit_log (organization_id, created_at);

create table if not exists public.login_attempts (
  email text primary key,
  failures integer not null,
  locked_until text
);

create table if not exists public.competitions (
  id text primary key,
  organization_id text not null references public.organizations (id),
  name text not null,
  kind text not null check (kind in ('barangay', 'campus', 'company')),
  starts_on text not null,
  ends_on text not null,
  status text not null check (status in ('open', 'locked')),
  created_by text,
  created_at text not null
);

create table if not exists public.competition_participants (
  competition_id text not null references public.competitions (id),
  unit_id text not null references public.units (id),
  primary key (competition_id, unit_id)
);

create table if not exists public.competition_access (
  competition_id text not null references public.competitions (id),
  user_id text not null references public.users (id),
  primary key (competition_id, user_id)
);

create table if not exists public.coordinator_invites (
  id text primary key,
  organization_id text not null references public.organizations (id),
  code_hash text not null unique,
  created_by text not null,
  expires_at text not null,
  used_by text,
  used_at text,
  created_at text not null
);

create table if not exists public.role_requests (
  id text primary key,
  organization_id text not null references public.organizations (id),
  user_id text not null references public.users (id),
  status text not null check (status in ('pending', 'approved', 'declined')),
  created_at text not null,
  reviewed_by text,
  reviewed_at text
);

create index if not exists idx_role_requests_org
  on public.role_requests (organization_id, status);

alter table public.organizations enable row level security;
alter table public.units enable row level security;
alter table public.seasons enable row level security;
alter table public.season_members enable row level security;
alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.collections enable row level security;
alter table public.audit_log enable row level security;
alter table public.login_attempts enable row level security;
alter table public.competitions enable row level security;
alter table public.competition_participants enable row level security;
alter table public.competition_access enable row level security;
alter table public.coordinator_invites enable row level security;
alter table public.role_requests enable row level security;
