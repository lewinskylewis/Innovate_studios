-- 0027: extends the Studio Ongoing Projects canonical column set to
-- match the confirmed target list (Brand, Project, Status, Assignee,
-- Project Timeline, Start Date, Delivery Status, Due Date and Time,
-- Priority, Budget, Paid, Balance) and reorders every system column's
-- sort_order to that sequence.
--
-- Two new project_fields.type values: 'datetime' (Due Date and Time —
-- a real date+time picker, see Cell.jsx) and 'computed' (Project
-- Timeline / Delivery Status / Balance — read-only, derived at render
-- time from other columns, never editable in place; see
-- dashboard/src/lib/deliveryStatus.js and Cell.jsx's "computed" branch).
-- A computed field still needs a project_fields row (same as every
-- other column) so it participates in ordering/hide/rename like any
-- canonical column — it just has no is_multi/currency/options and its
-- getCellValue() never reads a real projects/custom_fields column.

alter table public.project_fields drop constraint project_fields_type_check;
alter table public.project_fields add constraint project_fields_type_check check (
  type in ('text', 'number', 'money', 'date', 'datetime', 'select', 'person', 'checkbox', 'url', 'file', 'longtext', 'computed')
);

update public.project_fields set name = 'Due Date and Time', type = 'datetime', sort_order = 7, width_px = 170 where key = 'deadline';
update public.project_fields set sort_order = 0 where key = 'client';
update public.project_fields set sort_order = 1 where key = 'title';
update public.project_fields set sort_order = 2 where key = 'status';
update public.project_fields set sort_order = 3 where key = 'assignee';
update public.project_fields set sort_order = 5 where key = 'startDate';
update public.project_fields set sort_order = 8 where key = 'priority';
update public.project_fields set sort_order = 9 where key = 'estimatedValue';

insert into public.project_fields (key, name, type, system, is_multi, currency, sort_order, width_px) values
  ('timeline',       'Project Timeline', 'computed', true, false, null,  4, 150),
  ('deliveryStatus',  'Delivery Status',  'computed', true, false, null,  6, 130),
  ('paid',            'Paid',             'money',    true, false, 'KES', 10, 130),
  ('balance',         'Balance',          'computed', true, false, null,  11, 130);

comment on column public.project_fields.type is
  'text/number/money/date/datetime/select/person/checkbox/url/file/longtext are real, editable, stored values. computed columns (Project Timeline, Delivery Status, Balance) are read-only and derived at render time from other columns — never written to projects/custom_fields.';
