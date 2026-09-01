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
import { useStudio } from "./useStudio.js";
import StudioTable from "./StudioTable.jsx";
import TableToolbar from "./TableToolbar.jsx";
import ProjectDetail from "./ProjectDetail.jsx";
import StudioOverview from "./StudioOverview.jsx";

const DEFAULT_FILTERS = { search: "", status: "All", priority: "All", assignee: "All" };

export default function Studio() {
  const studio = useStudio();
  const { show } = useToast();
  const [tab, setTab] = useState("overview");
  const [creating, setCreating] = useState(false);
  const [openProjectId, setOpenProjectId] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [hiddenFields, setHiddenFields] = useState(() => new Set());

  const orderedFields = useMemo(() => [...studio.fields].sort((a, b) => a.order - b.order), [studio.fields]);

  function toggleHideField(fieldId) {
    setHiddenFields((prev) => {
      const next = new Set(prev);
      if (next.has(fieldId)) next.delete(fieldId);
      else next.add(fieldId);
      return next;
    });
  }

  async function handleNewProject() {
    setCreating(true);
    setTab("projects");
    try {
      const project = await studio.createProject({ deadline: todayISO(), startDate: todayISO() });
      setOpenProjectId(project.id);
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
            hiddenFields={hiddenFields}
            onToggleHide={toggleHideField}
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
          hiddenFields={hiddenFields}
          onToggleHide={toggleHideField}
          orderedFields={orderedFields}
        />
      )}

      <Drawer open={Boolean(openProject)} onClose={() => setOpenProjectId(null)} ariaLabel="Project detail">
        {openProject && <ProjectDetail project={openProject} studio={studio} onClose={() => setOpenProjectId(null)} onDeleted={() => setOpenProjectId(null)} />}
      </Drawer>
    </>
  );
}
