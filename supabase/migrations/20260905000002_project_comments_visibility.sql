-- 0022: project_comments gets its own visibility column, independent of
-- author_type. Only meaningful for author_type='studio' rows — governs
-- whether the client can see this comment. author_type='client' rows
-- are always visible to both sides regardless of this column's value
-- (see the anon SELECT policy in 20260905000004, which ORs past it for
-- client-authored rows). Defaults to 'internal' so nothing studio has
-- posted historically is retroactively exposed to any client.

alter table public.project_comments
  add column visibility text not null default 'internal' check (visibility in ('internal', 'client'));

comment on column public.project_comments.visibility is
  'Only meaningful for author_type=''studio'' rows — governs whether the client can see this comment. author_type=''client'' rows are always visible to both sides regardless of this column''s value.';
