-- 0021: expose milestones.sort_order to anon so Client View can render
-- the same Studio-controlled order (previously only Studio/authenticated
-- could read it; anon's column grant from 20260904000002 didn't include
-- it, since sort_order was never read/reordered from the UI until now).

revoke all on public.milestones from anon;
grant select (id, project_id, title, description, due_date, status_id, client_visible, sort_order) on public.milestones to anon;
