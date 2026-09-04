-- 0026: schema support for the Delivery Status automation and the new
-- Paid canonical column.
--
-- due_date date -> timestamptz: the GOOD/PENDING/LATE rules compare
-- against an actual time of day ("Due 5:00 PM", completed at 3:00 PM =
-- GOOD, completed after 5:00 PM = LATE on the same day), which a
-- date-only column can't represent. Existing rows have no time
-- component to preserve — casting date -> timestamptz here just gives
-- them midnight UTC, an honest "no time was ever recorded" default that
-- a user can edit going forward via the upgraded Due Date and Time cell
-- editor.
--
-- completed_at: separately recorded, not derived from updated_at,
-- because updated_at changes on every edit to the row (title, notes,
-- custom fields, ...), not just a status transition to Completed. Set/
-- cleared by dashboard/src/data/studio.js's updateProjectField() status
-- branch: set once on transition INTO Completed (never overwritten
-- while it stays Completed), cleared to null on transition OUT of
-- Completed so a later re-completion records a fresh timestamp.
--
-- delivery_status itself is NOT a stored column — GOOD/PENDING/LATE
-- depends on the current wall-clock time ("Current time is AFTER Due
-- Date and Time"), which a column value can only ever be correct at
-- the instant it was last written; a stored value would silently go
-- stale the moment the deadline passes with nothing re-touching the
-- row. It's computed at read time instead (see
-- dashboard/src/lib/deliveryStatus.js), which is trivially always
-- correct and needs no cron/trigger to "catch" the deadline passing.

alter table public.projects
  alter column due_date type timestamptz using due_date::timestamptz;

alter table public.projects
  add column completed_at timestamptz;

alter table public.projects
  add column paid_value numeric(14, 2) check (paid_value is null or paid_value >= 0);

comment on column public.projects.completed_at is
  'Set when status transitions into Completed; cleared to null when it transitions back out. Drives the Delivery Status GOOD/LATE split for completed projects — see dashboard/src/lib/deliveryStatus.js.';
comment on column public.projects.paid_value is
  'The Paid canonical column. Balance (Budget - Paid) is computed client-side, not stored — see dashboard/src/lib/deliveryStatus.js.';
