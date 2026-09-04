-- 0028: corrects 0027 — it inserted brand-new 'timeline'/'deliveryStatus'
-- /'paid'/'balance' system rows without checking for existing data
-- first. It turns out the user had already manually created custom
-- columns for exactly these four concepts (project_fields rows named
-- "Project Timeline", "Delivery Status", "Paid", "Balance", all
-- system = false) — 0027 therefore created real duplicates alongside
-- them. Confirmed via query: no project has any value stored under any
-- of the four old custom keys (custom_fields is empty for all of
-- them), so nothing here discards real data — this is a pure
-- repurposing of empty, pre-existing columns, not a migration of
-- filled-in values. The old "Delivery Status" custom field's option
-- rows (GOOD/PENDING/LATE, colored green/amber/red) are dropped since
-- it's converting from a manually-set 'select' to a computed column —
-- worth noting those exact three labels/colors already existed
-- user-side, confirming this is the automation they'd been
-- anticipating; the computed badge (Cell.jsx) reuses the same colors.

delete from public.project_fields where key in ('timeline', 'deliveryStatus', 'paid', 'balance');

delete from public.project_field_options
where field_id in (select id from public.project_fields where key in (
  'custom_001cba3c-f6b2-4d3b-bcf2-fb1c6c9b9e66',
  'custom_acac0b54-d628-4f96-b35a-8e691cd946be',
  'custom_3db17f89-814c-45cd-a193-54e3a3c95372',
  'custom_01bcc791-fcae-4eda-80d9-fdec712d8d92'
));

update public.project_fields
  set key = 'timeline', system = true, type = 'computed', currency = null, is_multi = false, sort_order = 4, width_px = 150
  where key = 'custom_001cba3c-f6b2-4d3b-bcf2-fb1c6c9b9e66';

update public.project_fields
  set key = 'deliveryStatus', system = true, type = 'computed', currency = null, is_multi = false, sort_order = 6, width_px = 130
  where key = 'custom_acac0b54-d628-4f96-b35a-8e691cd946be';

update public.project_fields
  set key = 'paid', system = true, type = 'money', currency = 'KES', is_multi = false, sort_order = 10, width_px = 130
  where key = 'custom_3db17f89-814c-45cd-a193-54e3a3c95372';

update public.project_fields
  set key = 'balance', system = true, type = 'computed', currency = null, is_multi = false, sort_order = 11, width_px = 130
  where key = 'custom_01bcc791-fcae-4eda-80d9-fdec712d8d92';
