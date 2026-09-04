/*
 * Innov8 Studios — /studio route. Ported from legacy/studio.html +
 * legacy/studio.js + legacy/studio-data.js. Tabs (Overview / Ongoing
 * Projects), filters, the project table, and the project detail drawer
 * are all real, Supabase-backed React now — see src/data/studio.js and
 * useStudio.js for what didn't make it into this stage (custom-column
 * builder, file uploads, activity feed, Share).
 */
import { useMemo, useState } from "react";
import Topbar from "../../components/Topbar.jsx";
import Drawer from "../../components/Drawer.jsx";
import { useToast } from "../../lib/ToastContext.jsx";
import { todayISO } from "../../lib/format.js";
import { useStoredTab } from "../../lib/useStoredTab.js";
import { useStudio } from "./useStudio.js";
import StudioTable from "./StudioTable.jsx";
import TableToolbar from "./TableToolbar.jsx";
import ProjectDetail from "./ProjectDetail.jsx";
import StudioOverview from "./StudioOverview.jsx";

const DEFAULT_FILTERS = { search: "", status: "All", priority: "All", assignee: "All" };

export default function Studio() {
  const studio = useStudio();
  const { show } = useToast();
  const [tab, setTab] = useStoredTab("innov8-dashboard-tab-studio", "overview");
  const [creating, setCreating] = useState(false);
  const [openProjectId, setOpenProjectId] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  // Column order is per-user (studio.columnOrder, from
  // studio_table_preferences) layered over the shared default order
  // (studio.fields' own sort_order) — any field the user hasn't
  // explicitly reordered yet (a brand-new custom column, or simply no
  // saved preference at all) falls back to its default position rather
  // than disappearing.
  const orderedFields = useMemo(() => {
    const defaultOrder = [...studio.fields].sort((a, b) => a.order - b.order);
    if (!studio.columnOrder?.length) return defaultOrder;
    const byId = new Map(studio.fields.map((f) => [f.id, f]));
    const seen = new Set();
    const fromPreference = studio.columnOrder
      .map((id) => byId.get(id))
      .filter((f) => {
        if (!f || seen.has(f.id)) return false;
        seen.add(f.id);
        return true;
      });
    return [...fromPreference, ...defaultOrder.filter((f) => !seen.has(f.id))];
  }, [studio.fields, studio.columnOrder]);

  async function handleNewProject() {
    setCreating(true);
    setTab("projects");
    try {
      // Deliberately does not open the detail drawer — the new row lands
      // in the table as a draft (see data/studio.js's isDraft) that the
      // user fills in with ordinary in-place cell edits, exactly like
      // every other row. Opening a drawer here would force a popup step
      // the table's own edit-in-place design already makes unnecessary.
      await studio.createProject({ deadline: todayISO(), startDate: todayISO() });
    } catch (err) {
      console.error("[studio] createProject failed", err);
      show("Couldn't create the project — try again.");
    } finally {
      setCreating(false);
    }
  }

  const openProject = studio.projects.find((p) => p.id === openProjectId) || null;

  return (
    <>
      <Topbar title="Studio" />

      <div className="work-toolbar-row">
        <div className="work-tabs">
          <button className={`work-tab${tab === "overview" ? " is-active" : ""}`} type="button" onClick={() => setTab("overview")}>
            Overview
          </button>
          <button className={`work-tab${tab === "projects" ? " is-active" : ""}`} type="button" onClick={() => setTab("projects")}>
            Ongoing Projects
          </button>
        </div>

        {tab === "projects" && !studio.loading && !studio.error && (
          <TableToolbar
            filters={filters}
            onFiltersChange={setFilters}
            statusOptions={studio.projectStatusOptions}
            priorityOptions={studio.priorityOptions}
            team={studio.team}
            fields={orderedFields}
            hiddenFields={studio.hiddenFieldIds}
            onToggleHide={studio.toggleHideField}
          />
        )}
      </div>

      {studio.loading ? (
        <div className="panel" style={{ padding: "var(--space-6)", textAlign: "center", color: "var(--muted)" }}>
          Loading Studio…
        </div>
      ) : studio.error ? (
        <div className="panel" style={{ padding: "var(--space-6)", textAlign: "center" }}>
          <div className="empty-state">
            <strong>Couldn't load Studio</strong>
            <span>{studio.error}</span>
          </div>
        </div>
      ) : tab === "overview" ? (
        <StudioOverview studio={studio} onOpen={setOpenProjectId} />
      ) : (
        <StudioTable
          studio={studio}
          onOpen={setOpenProjectId}
          onNewProject={handleNewProject}
          creating={creating}
          filters={filters}
          hiddenFields={studio.hiddenFieldIds}
          onToggleHide={studio.toggleHideField}
          orderedFields={orderedFields}
        />
      )}

      <Drawer open={Boolean(openProject)} onClose={() => setOpenProjectId(null)} ariaLabel="Project detail">
        {openProject && <ProjectDetail key={openProject.id} project={openProject} studio={studio} onClose={() => setOpenProjectId(null)} onDeleted={() => setOpenProjectId(null)} />}
      </Drawer>
    </>
  );
}
