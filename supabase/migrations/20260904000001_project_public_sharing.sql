-- 0018: Public project sharing — a stable, human-readable public_slug
-- per project, plus narrowly-scoped anonymous (anon role) read access
-- to exactly the Client-View-safe subset of one project's data.
--
-- Deliberately NOT an RPC / SECURITY DEFINER function — plain RLS
-- policies + column-level GRANTs, matching the exclusive pattern every
-- other migration in this project already uses. Two columns already
-- existed for exactly this purpose and had no anonymous-facing
-- consumer until now: milestones.client_visible and
-- project_activity.visibility ('internal'|'client'). project_comments
-- gets no anon policy at all — never reachable from a public link.
--
-- Public data contract (anon role), column-by-column:
--   projects        : id, title, description, start_date, due_date,
--                      public_slug (+ client_id, grant-only — required
--                      for the server-side join to contacts.brand_name;
--                      the app's own SELECT list never requests it, so
--                      it never appears in a response body)
--   contacts        : id, brand_name — ONLY the row referenced by a
--                      publicly-slugged project's client_id
--   milestones      : id, project_id, title, description, due_date,
--                      status_id, client_visible — WHERE client_visible
--   project_option_lists : unchanged columns, but only kind =
--                      'milestone_status' rows are anon-readable
--   project_files   : same columns loadProjectFiles() already selects
--                      — WHERE visibility = 'Client'
--   profiles        : id, full_name — ONLY rows referenced by
--                      uploaded_by on a client-visible file
--   project_activity: same columns loadProjectActivity() already
--                      selects — WHERE visibility = 'client'
--   storage.objects : project-files bucket objects backing a
--                      Client-visibility file on a publicly-slugged
--                      project only
--
-- Known, inherent limitation of this RLS-only (no RPC) design: because
-- PostgREST exposes ordinary list/select semantics to any role holding
-- a grant, and RLS filters rows but cannot require a query to already
-- be scoped by a specific slug, the anon role's SELECT grant on
-- projects technically allows listing title/description/public_slug
-- for every non-deleted project, not only the one a caller already
-- knows the slug for. Closing that fully would need a SECURITY
-- DEFINER function taking the slug as a parameter — explicitly out of
-- scope for this migration per the approved architecture. Documented
-- here so it's a known, deliberate tradeoff, not an oversight.

-- ============================================================
-- 1. public_slug — generated once, stable, never regenerated
-- ============================================================

alter table public.projects add column public_slug text;

comment on column public.projects.public_slug is
  'Stable, human-readable public share slug (slugified title + short random suffix). Set once by the trigger below at insert time and never regenerated — editing the title later must not break an already-shared /project/:slug link. This is the ONLY project identifier ever placed in a public URL; the internal id never is.';

create or replace function public.slugify(input text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(input, '')), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.set_project_public_slug()
returns trigger
language plpgsql
as $$
declare
  base_slug text;
  candidate text;
  attempt int := 0;
begin
  if new.public_slug is not null then
    return new;
  end if;

  base_slug := public.slugify(new.title);
  if base_slug = '' then
    base_slug := 'project';
  end if;

  loop
    candidate := base_slug || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 5);
    exit when not exists (select 1 from public.projects where public_slug = candidate);
    attempt := attempt + 1;
    exit when attempt > 8;
  end loop;

  new.public_slug := candidate;
  return new;
end;
$$;

create trigger projects_set_public_slug
  before insert on public.projects
  for each row execute function public.set_project_public_slug();

-- Backfill every existing project. Uses each row's own id (already
-- unique) for the suffix rather than the trigger's random-retry loop —
-- a single deterministic UPDATE, no collision handling needed.
update public.projects
set public_slug = coalesce(nullif(public.slugify(title), ''), 'project') || '-' || substr(md5(id::text), 1, 5)
where public_slug is null;

alter table public.projects alter column public_slug set not null;
alter table public.projects add constraint projects_public_slug_key unique (public_slug);
create index projects_public_slug_idx on public.projects (public_slug);

-- ============================================================
-- 2. anon read access
-- ============================================================

create policy projects_select_anon on public.projects
  for select to anon
  using (deleted_at is null);

grant select (id, title, description, start_date, due_date, public_slug, client_id) on public.projects to anon;

create policy contacts_select_anon on public.contacts
  for select to anon
  using (id in (select client_id from public.projects where deleted_at is null and client_id is not null));

grant select (id, brand_name) on public.contacts to anon;

create policy milestones_select_anon on public.milestones
  for select to anon
  using (
    client_visible = true
    and project_id in (select id from public.projects where deleted_at is null)
  );

grant select (id, project_id, title, description, due_date, status_id, client_visible) on public.milestones to anon;

create policy project_option_lists_select_anon on public.project_option_lists
  for select to anon
  using (kind = 'milestone_status');

grant select (id, kind, label, color, sort_order) on public.project_option_lists to anon;

create policy project_files_select_anon on public.project_files
  for select to anon
  using (
    visibility = 'Client'
    and project_id in (select id from public.projects where deleted_at is null)
  );

grant select (id, project_id, storage_path, original_filename, category, size_bytes, visibility, uploaded_by, created_at) on public.project_files to anon;

create policy profiles_select_anon on public.profiles
  for select to anon
  using (
    id in (
      select uploaded_by from public.project_files
      where visibility = 'Client'
        and uploaded_by is not null
        and project_id in (select id from public.projects where deleted_at is null)
    )
  );

grant select (id, full_name) on public.profiles to anon;

create policy project_activity_select_anon on public.project_activity
  for select to anon
  using (
    visibility = 'client'
    and project_id in (select id from public.projects where deleted_at is null)
  );

grant select (id, project_id, type, description, visibility, created_at) on public.project_activity to anon;

-- No anon policy on project_comments — deliberately absent.

-- ============================================================
-- 3. storage — client-visible file downloads for anonymous visitors
-- ============================================================

create policy project_files_storage_select_anon on storage.objects
  for select to anon
  using (
    bucket_id = 'project-files'
    and name in (
      select storage_path from public.project_files
      where visibility = 'Client'
        and project_id in (select id from public.projects where deleted_at is null)
    )
  );
