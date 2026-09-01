-- 0015: migrate the real Studio mock data out of studio-data.js.
--
-- What's migrated: team members, clients (extracted from each project's
-- client/contact fields), projects, milestones, project/milestone
-- assignments, and comments.
--
-- What's deliberately NOT migrated:
--   - project_files: the mock "files" were never real uploads — there is
--     no object in Storage for a storage_path to point to. Seeding fake
--     metadata for a file that doesn't exist would be worse than no row.
--   - project_activity: now trigger-generated (0012). Inserting the
--     projects/milestones/comments below fires project_created,
--     milestone_created, comment_added and assignment_changed
--     automatically — a better proof the triggers work than hand-copying
--     the old curated mock activity array.
--   - Home's DASH_MOCK (income, stats, enquiries, relationships,
--     analytics) and Bills/Meetings/Invoices: decorative, no CRUD surface,
--     explicitly out of scope per the approved architecture.
--
-- actor_profile_id / created_by / uploaded_by are left null throughout —
-- there is no authenticated session during a migration run, and nobody
-- real "did" this historical seed data.
--
-- Run this as a whole file (`supabase db push`, or paste the entire file
-- into the SQL editor and run it in one go) — the temp table below relies
-- on the whole script executing as one transaction, which is how Supabase
-- applies a migration file but is NOT guaranteed if you run its
-- statements one at a time.

create temporary table _team (key text primary key, id uuid not null) on commit drop;
insert into _team (key, id) values
  ('lewis',  '11111111-1111-1111-1111-111111111111'),
  ('winsky', '22222222-2222-2222-2222-222222222222'),
  ('aisha',  '33333333-3333-3333-3333-333333333333'),
  ('brian',  '44444444-4444-4444-4444-444444444444'),
  ('faith',  '55555555-5555-5555-5555-555555555555');

insert into public.team_members (id, full_name, job_title) values
  ('11111111-1111-1111-1111-111111111111', 'Lewis Kariuki',  'Creative Director'),
  ('22222222-2222-2222-2222-222222222222', 'Winsky Otieno',  'Art Director'),
  ('33333333-3333-3333-3333-333333333333', 'Aisha Noor',     'Motion Designer'),
  ('44444444-4444-4444-4444-444444444444', 'Brian Mutua',    'Web Developer'),
  ('55555555-5555-5555-5555-555555555555', 'Faith Wambui',   'Producer');

insert into public.clients (id, name, contact_name, email, phone) values
  ('c1111111-1111-1111-1111-111111111111', 'Stanbic Bank',          'Wanjiru Kamau',  'wanjiru.kamau@stanbic.co.ke',        '+254 712 900 214'),
  ('c2222222-2222-2222-2222-222222222222', 'Jubilee Insurance',     'Peter Otieno',   'peter.otieno@jubileeinsurance.co.ke', '+254 733 118 402'),
  ('c3333333-3333-3333-3333-333333333333', 'Nike Kenya',            'Amara Chege',    'amara.chege@nike-kenya.co.ke',        '+254 701 224 810'),
  ('c4444444-4444-4444-4444-444444444444', 'Rentora',               'Daniel Kiptoo',  'daniel.kiptoo@rentora.co.ke',         '+254 720 445 118'),
  ('c5555555-5555-5555-5555-555555555555', 'Horizon Motors',        'James Mwangi',   'j.mwangi@horizonmotors.co.ke',        '+254 700 552 883'),
  ('c6666666-6666-6666-6666-666666666666', 'Zawadi Fashion House',  'Miriam Wanjala', 'miriam.wanjala@zawadifashion.co.ke',  '+254 722 337 561'),
  ('c7777777-7777-7777-7777-777777777777', 'GreenLeaf Wellness',    'Wambui Kariuki', 'wambui@greenleafwellness.co.ke',      '+254 733 445 671'),
  ('c8888888-8888-8888-8888-888888888888', 'Sanaa Coffee Co.',      'Grace Achieng',  'grace.achieng@sanaacoffee.co.ke',     '+254 715 662 907');

-- ============ project-1: Stanbic Bank — Brand Campaign ============

with proj as (
  insert into public.projects (id, client_id, title, description, service, status_id, priority_id, start_date, due_date, estimated_value, notes, lead_member_id)
  values (
    'a1111111-1111-1111-1111-111111111111', 'c1111111-1111-1111-1111-111111111111',
    'Stanbic Bank — Brand Campaign',
    'A full brand refresh and campaign film for Stanbic''s SME lending push, spanning strategy, key visuals, and a hero film for broadcast and social.',
    'Brand + Film',
    (select id from project_option_lists where kind = 'project_status' and label = 'Active'),
    (select id from project_option_lists where kind = 'priority' and label = 'High'),
    '2026-07-14', '2026-09-05', 2400000,
    'Client prefers WhatsApp for quick approvals; formal sign-off still needs email.',
    (select id from _team where key = 'winsky')
  )
  returning id
),
members as (
  insert into public.project_members (project_id, team_member_id, is_lead)
  select proj.id, t.id, t.key = 'winsky'
  from proj, _team t where t.key in ('winsky', 'lewis', 'aisha')
),
mstones as (
  insert into public.milestones (project_id, title, description, due_date, status_id, priority_id, client_visible, sort_order)
  select proj.id, v.title, v.description, v.due_date::date,
    (select id from project_option_lists where kind = 'milestone_status' and label = v.status),
    (select id from project_option_lists where kind = 'priority' and label = v.priority),
    true, v.sort_order
  from proj, (values
    ('Brief', 'Discovery workshop and creative brief sign-off.', '2026-07-18', 'Completed', 'Normal', 0),
    ('Creative Direction', 'Mood boards and initial concept direction.', '2026-07-28', 'Completed', 'Normal', 1),
    ('Concept Development', 'Refined concept, storyboard, and key visuals.', '2026-08-08', 'Completed', 'Normal', 2),
    ('Production', 'Shoot, edit, and motion graphics production.', '2026-08-25', 'In progress', 'High', 3),
    ('Client Review', 'Client review round and revisions.', '2026-08-30', 'Not started', 'Normal', 4),
    ('Final Delivery', 'Final export, formats, and handover.', '2026-09-05', 'Not started', 'Normal', 5)
  ) as v(title, description, due_date, status, priority, sort_order)
  returning id, title
)
insert into public.milestone_assignees (milestone_id, team_member_id)
select m.id, t.id from mstones m
join (values ('Brief', 'winsky'), ('Creative Direction', 'winsky'), ('Concept Development', 'winsky'),
             ('Production', 'aisha'), ('Production', 'winsky')) as a(title, member_key) on a.title = m.title
join _team t on t.key = a.member_key;

insert into public.project_comments (project_id, author_display_name, author_type, content, created_at) values
  ('a1111111-1111-1111-1111-111111111111', 'Wanjiru Kamau', 'client', 'Loving the direction on the key visual — can we push the gold accent a touch warmer?', '2026-08-21T10:12:00'),
  ('a1111111-1111-1111-1111-111111111111', 'Lewis Kariuki', 'studio', 'Internal note: warmer gold approved by Winsky, updating the grade pass this week.', '2026-08-21T14:40:00');

-- ============ project-2: Jubilee Insurance — Web Platform ============

with proj as (
  insert into public.projects (id, client_id, title, description, service, status_id, priority_id, start_date, due_date, estimated_value, notes, lead_member_id)
  values (
    'a2222222-2222-2222-2222-222222222222', 'c2222222-2222-2222-2222-222222222222',
    'Jubilee Insurance — Web Platform',
    'A rebuilt policy-quoting web platform with a lighter, more confident visual system than Jubilee''s legacy site.',
    'Web Development',
    (select id from project_option_lists where kind = 'project_status' and label = 'Active'),
    (select id from project_option_lists where kind = 'priority' and label = 'Normal'),
    '2026-06-20', '2026-09-15', 3100000,
    'Legal needs to review all copy before staging goes live.',
    (select id from _team where key = 'brian')
  )
  returning id
),
members as (
  insert into public.project_members (project_id, team_member_id, is_lead)
  select proj.id, t.id, t.key = 'brian'
  from proj, _team t where t.key in ('brian', 'lewis')
)
insert into public.milestones (project_id, title, description, due_date, status_id, priority_id, client_visible, sort_order)
select proj.id, v.title, v.description, v.due_date::date,
  (select id from project_option_lists where kind = 'milestone_status' and label = v.status),
  (select id from project_option_lists where kind = 'priority' and label = 'Normal'),
  v.client_visible, v.sort_order
from proj, (values
  ('Brief', 'Requirements and information architecture.', '2026-06-27', 'Completed', true, 0),
  ('Creative Direction', 'UI direction and design system.', '2026-07-11', 'Completed', true, 1),
  ('Production', 'Front-end build and CMS integration.', '2026-08-29', 'In progress', true, 2),
  ('Client Review', 'Staging review and QA.', '2026-09-08', 'Not started', true, 3),
  ('Final Delivery', 'Go-live and handover docs.', '2026-09-15', 'Not started', false, 4)
) as v(title, description, due_date, status, client_visible, sort_order);

-- ============ project-3: Nike Kenya — Motion Series ============

with proj as (
  insert into public.projects (id, client_id, title, description, service, status_id, priority_id, start_date, due_date, estimated_value, notes, lead_member_id)
  values (
    'a3333333-3333-3333-3333-333333333333', 'c3333333-3333-3333-3333-333333333333',
    'Nike Kenya — Motion Series',
    'A five-part motion graphics series for Nike Kenya''s run-club activation, awaiting brief sign-off before production begins.',
    'Motion Graphics',
    (select id from project_option_lists where kind = 'project_status' and label = 'Planning'),
    (select id from project_option_lists where kind = 'priority' and label = 'Normal'),
    '2026-08-05', '2026-08-29', 980000,
    'Waiting on final run-club footage from Nike''s regional team.',
    (select id from _team where key = 'aisha')
  )
  returning id
),
members as (
  insert into public.project_members (project_id, team_member_id, is_lead)
  select proj.id, t.id, true from proj, _team t where t.key = 'aisha'
)
insert into public.milestones (project_id, title, description, due_date, status_id, priority_id, client_visible, sort_order)
select proj.id, v.title, v.description, v.due_date::date,
  (select id from project_option_lists where kind = 'milestone_status' and label = v.status),
  (select id from project_option_lists where kind = 'priority' and label = 'Normal'),
  true, v.sort_order
from proj, (values
  ('Brief', 'Creative brief and reference gathering.', '2026-08-15', 'Completed', 0),
  ('Creative Direction', 'Style frames for the series.', '2026-08-25', 'In progress', 1),
  ('Production', 'Full series animation.', '2026-08-29', 'Not started', 2)
) as v(title, description, due_date, status, sort_order);

-- ============ project-4: Rentora — Product Launch Film ============

with proj as (
  insert into public.projects (id, client_id, title, description, service, status_id, priority_id, start_date, due_date, estimated_value, notes, lead_member_id)
  values (
    'a4444444-4444-4444-4444-444444444444', 'c4444444-4444-4444-4444-444444444444',
    'Rentora — Product Launch Film',
    'A launch film for Rentora''s new listings app, cut for both broadcast and vertical social formats.',
    'Film',
    (select id from project_option_lists where kind = 'project_status' and label = 'Under Review'),
    (select id from project_option_lists where kind = 'priority' and label = 'Urgent'),
    '2026-07-01', '2026-09-01', 1450000,
    'Client travelling until Aug 29 — final approval will be rushed.',
    (select id from _team where key = 'aisha')
  )
  returning id
),
members as (
  insert into public.project_members (project_id, team_member_id, is_lead)
  select proj.id, t.id, t.key = 'aisha'
  from proj, _team t where t.key in ('aisha', 'lewis', 'faith')
)
insert into public.milestones (project_id, title, description, due_date, status_id, priority_id, client_visible, sort_order)
select proj.id, v.title, v.description, v.due_date::date,
  (select id from project_option_lists where kind = 'milestone_status' and label = v.status),
  (select id from project_option_lists where kind = 'priority' and label = 'Normal'),
  true, v.sort_order
from proj, (values
  ('Brief', 'Launch narrative and brief.', '2026-07-05', 'Completed', 0),
  ('Creative Direction', 'Treatment and storyboard.', '2026-07-18', 'Completed', 1),
  ('Production', 'Shoot and edit.', '2026-08-15', 'Completed', 2),
  ('Client Review', 'Final cut review.', '2026-08-30', 'In progress', 3),
  ('Final Delivery', 'Master exports for broadcast and social.', '2026-09-01', 'Not started', 4)
) as v(title, description, due_date, status, sort_order);

insert into public.project_comments (project_id, author_display_name, author_type, content, created_at) values
  ('a4444444-4444-4444-4444-444444444444', 'Daniel Kiptoo', 'client', 'This is close — trim the opening beat by half a second and we''re good to lock.', '2026-08-29T08:30:00');

-- ============ project-5: Horizon Motors — Showroom Campaign ============

with proj as (
  insert into public.projects (id, client_id, title, description, service, status_id, priority_id, start_date, due_date, estimated_value, notes, lead_member_id)
  values (
    'a5555555-5555-5555-5555-555555555555', 'c5555555-5555-5555-5555-555555555555',
    'Horizon Motors — Showroom Campaign',
    'A dealership launch campaign — key visuals plus a short social film for Horizon''s new showroom opening.',
    'Brand + Film',
    (select id from project_option_lists where kind = 'project_status' and label = 'Active'),
    (select id from project_option_lists where kind = 'priority' and label = 'High'),
    '2026-08-10', '2026-08-31', 1120000,
    'Showroom opens Sept 3 — hard deadline, no slippage possible.',
    (select id from _team where key = 'winsky')
  )
  returning id
),
members as (
  insert into public.project_members (project_id, team_member_id, is_lead)
  select proj.id, t.id, t.key = 'winsky'
  from proj, _team t where t.key in ('winsky', 'faith')
)
insert into public.milestones (project_id, title, description, due_date, status_id, priority_id, client_visible, sort_order)
select proj.id, v.title, v.description, v.due_date::date,
  (select id from project_option_lists where kind = 'milestone_status' and label = v.status),
  (select id from project_option_lists where kind = 'priority' and label = 'Normal'),
  true, v.sort_order
from proj, (values
  ('Brief', 'Launch brief and shot list.', '2026-08-13', 'Completed', 0),
  ('Creative Direction', 'Key visual concepts.', '2026-08-20', 'Completed', 1),
  ('Production', 'Shoot and edit.', '2026-08-28', 'In progress', 2),
  ('Final Delivery', 'Delivery ahead of showroom opening.', '2026-08-31', 'Not started', 3)
) as v(title, description, due_date, status, sort_order);

-- ============ project-6: Zawadi Fashion — Lookbook ============

with proj as (
  insert into public.projects (id, client_id, title, description, service, status_id, priority_id, start_date, due_date, estimated_value, notes, lead_member_id)
  values (
    'a6666666-6666-6666-6666-666666666666', 'c6666666-6666-6666-6666-666666666666',
    'Zawadi Fashion — Lookbook',
    'Seasonal lookbook shoot, on hold pending the client''s new season direction.',
    'Photography',
    (select id from project_option_lists where kind = 'project_status' and label = 'Stuck'),
    (select id from project_option_lists where kind = 'priority' and label = 'Low'),
    '2026-08-01', '2026-08-25', 540000,
    'Client rescheduling the shoot date — following up mid-September.',
    (select id from _team where key = 'faith')
  )
  returning id
),
members as (
  insert into public.project_members (project_id, team_member_id, is_lead)
  select proj.id, t.id, true from proj, _team t where t.key = 'faith'
)
insert into public.milestones (project_id, title, description, due_date, status_id, priority_id, client_visible, sort_order)
select proj.id, v.title, v.description, v.due_date::date,
  (select id from project_option_lists where kind = 'milestone_status' and label = v.status),
  (select id from project_option_lists where kind = 'priority' and label = 'Normal'),
  true, v.sort_order
from proj, (values
  ('Brief', 'Season direction and shot list.', '2026-08-10', 'Completed', 0),
  ('Production', 'Studio shoot.', '2026-08-25', 'Not started', 1)
) as v(title, description, due_date, status, sort_order);

-- ============ project-7: GreenLeaf Wellness — Brand Identity ============

with proj as (
  insert into public.projects (id, client_id, title, description, service, status_id, priority_id, start_date, due_date, estimated_value, notes, lead_member_id)
  values (
    'a7777777-7777-7777-7777-777777777777', 'c7777777-7777-7777-7777-777777777777',
    'GreenLeaf Wellness — Brand Identity',
    'A full identity system for GreenLeaf''s studio and product line relaunch.',
    'Brand Identity',
    (select id from project_option_lists where kind = 'project_status' and label = 'Completed'),
    (select id from project_option_lists where kind = 'priority' and label = 'Normal'),
    '2026-06-15', '2026-07-20', 620000,
    'Client extremely happy — good testimonial candidate.',
    (select id from _team where key = 'winsky')
  )
  returning id
),
members as (
  insert into public.project_members (project_id, team_member_id, is_lead)
  select proj.id, t.id, true from proj, _team t where t.key = 'winsky'
)
insert into public.milestones (project_id, title, description, due_date, status_id, priority_id, client_visible, sort_order)
select proj.id, v.title, v.description, v.due_date::date,
  (select id from project_option_lists where kind = 'milestone_status' and label = 'Completed'),
  (select id from project_option_lists where kind = 'priority' and label = 'Normal'),
  true, v.sort_order
from proj, (values
  ('Brief', 'Brand audit and positioning.', '2026-06-20', 0),
  ('Creative Direction', 'Identity direction and logo concepts.', '2026-07-02', 1),
  ('Production', 'Full identity system and guidelines.', '2026-07-15', 2),
  ('Final Delivery', 'Handover of final files and guidelines.', '2026-07-20', 3)
) as v(title, description, due_date, sort_order);

insert into public.project_comments (project_id, author_display_name, author_type, content, created_at) values
  ('a7777777-7777-7777-7777-777777777777', 'Wambui Kariuki', 'client', 'This is exactly the direction we needed — thank you for pushing us here.', '2026-07-20T09:00:00');

-- ============ project-8: Sanaa Coffee — Packaging Refresh ============

with proj as (
  insert into public.projects (id, client_id, title, description, service, status_id, priority_id, start_date, due_date, estimated_value, notes, lead_member_id)
  values (
    'a8888888-8888-8888-8888-888888888888', 'c8888888-8888-8888-8888-888888888888',
    'Sanaa Coffee — Packaging Refresh',
    'Packaging refresh for Sanaa Coffee''s retail line ahead of a national supermarket rollout.',
    'Packaging',
    (select id from project_option_lists where kind = 'project_status' and label = 'Completed'),
    (select id from project_option_lists where kind = 'priority' and label = 'Normal'),
    '2026-05-05', '2026-06-30', 620000,
    'Client extremely happy — good testimonial candidate.',
    (select id from _team where key = 'winsky')
  )
  returning id
),
members as (
  insert into public.project_members (project_id, team_member_id, is_lead)
  select proj.id, t.id, true from proj, _team t where t.key = 'winsky'
)
insert into public.milestones (project_id, title, description, due_date, status_id, priority_id, client_visible, sort_order)
select proj.id, v.title, v.description, v.due_date::date,
  (select id from project_option_lists where kind = 'milestone_status' and label = 'Completed'),
  (select id from project_option_lists where kind = 'priority' and label = 'Normal'),
  true, v.sort_order
from proj, (values
  ('Brief', 'Retail requirements and brand audit.', '2026-05-10', 0),
  ('Creative Direction', 'Pack structure and label concepts.', '2026-05-25', 1),
  ('Production', 'Print-ready artwork.', '2026-06-20', 2),
  ('Final Delivery', 'Print files handed to supplier.', '2026-06-30', 3)
) as v(title, description, due_date, sort_order);

insert into public.project_comments (project_id, author_display_name, author_type, content, created_at) values
  ('a8888888-8888-8888-8888-888888888888', 'Grace Achieng', 'client', 'The shelf presence is exactly what we needed — thank you!', '2026-06-30T09:00:00');
