/*
 * Innov8 Studios — project detail drawer. Header reads "Project" +
 * project name, then Brand, then the start/due date timeline, in that
 * fixed order — status and priority aren't shown here at all; they're
 * still editable from their own columns in the Ongoing Projects table.
 * Studio view vs. Client Preview (a frontend presentation toggle — no
 * client auth/role, same as before): Milestones stay editable/
 * reorderable only for Studio (Milestones.jsx's readOnly prop); Files
 * offers Download for the client instead of upload/delete
 * (FilesSection.jsx); Comments (Comments.jsx) renders in both, but at a
 * different position — immediately after Files for the client, in its
 * original spot for Studio — and is itself filtered client-side to
 * client-authored + explicitly-published rows for that reader (enforced
 * server-side too, see supabase/migrations/20260905*); Activity
 * (ActivityFeed.jsx) is identical for both.
 *
 * `standalone` (new): true only when rendered by the public, unauthenticated
 * pages/Studio/SharedProject.jsx (/project/:projectSlug — see App.jsx).
 * clientPreview is permanently true in that mode (no toggle rendered to
 * change it) and every Studio-only control — close button, the
 * Studio/Client-preview toggle, Share, Delete — is hidden outright, not
 * just disabled. `studio` is a minimal read-only stub there (see
 * SharedProject.jsx), so the effect below skips calling the
 * authenticated-only loadProjectComments/Files/Activity entirely —
 * data/sharedProject.js's loadSharedProject() already fetched everything
 * client-safe up front.
 */
import { useEffect, useState } from "react";
import { useToast } from "../../lib/ToastContext.jsx";
import { formatDate } from "../../lib/format.js";
import { colorForName, initials } from "../../lib/avatar.js";
import Milestones from "./Milestones.jsx";
import FilesSection from "./FilesSection.jsx";
import ActivityFeed from "./ActivityFeed.jsx";
import Comments from "./Comments.jsx";
import ShareModal from "./ShareModal.jsx";

function computeProgress(project, labelFor) {
  if (!project.milestones.length) return 0;
  const done = project.milestones.filter((m) => labelFor("milestoneStatus", m.statusId) === "Completed").length;
  return Math.round((done / project.milestones.length) * 100);
}

function EditableDate({ value, onSave, editable }) {
  const [editing, setEditing] = useState(false);

  if (editable && editing) {
    return (
      <input
        type="date"
        className="detail-timeline-input"
        autoFocus
        defaultValue={value || ""}
        onBlur={(e) => {
          setEditing(false);
          if (e.target.value !== value) onSave(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") setEditing(false);
        }}
      />
    );
  }

  return (
    <span className="detail-timeline-date" onClick={editable ? () => setEditing(true) : undefined} style={editable ? { cursor: "pointer" } : undefined}>
      {value ? formatDate(value) : "Not set"}
    </span>
  );
}

export default function ProjectDetail({ project, studio, onClose, onDeleted, standalone = false }) {
  const { show } = useToast();
  const [detailLoading, setDetailLoading] = useState(true);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [clientPreview, setClientPreview] = useState(standalone);
  const [shareOpen, setShareOpen] = useState(false);
  const [editingOverview, setEditingOverview] = useState(false);
  const [overviewDraft, setOverviewDraft] = useState(project.description || "");

  useEffect(() => {
    if (standalone) {
      // loadSharedProject() already fetched every client-safe field up
      // front — nothing lazy to load, and the standalone stub `studio`
      // has no loadProjectComments/Files/Activity to call.
      setDetailLoading(false);
      return;
    }
    let active = true;
    setDetailLoading(true);
    setClientPreview(false);
    Promise.all([studio.loadProjectComments(project), studio.loadProjectFiles(project), studio.loadProjectActivity(project)])
      .catch((err) => {
        console.error("[studio] failed to load project detail", err);
        show("Couldn't load this project's details — try again.");
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, standalone]);

  useEffect(() => {
    setOverviewDraft(project.description || "");
    setEditingOverview(false);
  }, [project.id, project.description]);

  if (!project) return null;

  const progress = computeProgress(project, studio.labelFor);

  async function handleField(fieldId, value) {
    try {
      await studio.updateProjectField(project, fieldId, value);
    } catch (err) {
      console.error(`[studio] update ${fieldId} failed`, err);
      show(err.message || `Couldn't update ${fieldId} — try again.`);
    }
  }

  async function handleAddTeam(e) {
    const id = e.target.value;
    if (!id) return;
    try {
      await studio.setProjectAssignees(project, [...project.team, id]);
    } catch (err) {
      console.error("[studio] add team member failed", err);
      show("Couldn't add that team member — try again.");
    }
    e.target.value = "";
  }

  async function handleRemoveTeam(id) {
    try {
      await studio.setProjectAssignees(project, project.team.filter((t) => t !== id));
    } catch (err) {
      console.error("[studio] remove team member failed", err);
      show(err.message || "Couldn't remove that team member — try again.");
    }
  }

  async function handleSaveOverview() {
    setEditingOverview(false);
    if (overviewDraft === (project.description || "")) return;
    await handleField("description", overviewDraft);
  }

  async function handleDelete() {
    try {
      await studio.softDeleteProject(project);
      show("Project deleted.");
      onDeleted();
    } catch (err) {
      console.error("[studio] softDeleteProject failed", err);
      show(err.message || "Couldn't delete that project — try again.");
    }
  }

  return (
    <>
      {!standalone && (
        <button className="icon-btn" type="button" onClick={onClose} aria-label="Close" style={{ position: "absolute", top: "1.25rem", right: "1.25rem" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 6l12 12" />
            <path d="M18 6 6 18" />
          </svg>
        </button>
      )}

      {clientPreview && !standalone && (
        <div className="client-preview-banner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
            <circle cx="12" cy="12" r="2.6" />
          </svg>
          Client Preview — this is a mock permission view
        </div>
      )}

      <div className="detail-header">
        {!standalone && (
          <div className="detail-actions">
            <button className="btn" type="button" onClick={() => setClientPreview((v) => !v)}>
              {clientPreview ? "Studio view" : "Preview as client"}
            </button>
            <button className="btn btn-primary" type="button" onClick={() => setShareOpen(true)}>
              Share
            </button>
          </div>
        )}
        <div className="detail-title-group">
          <span className="detail-title-label">Project</span>
          <h2 className="detail-title">{project.title || "Untitled project"}</h2>
        </div>
        <div className="detail-client-name">{project.client || "No client set"}</div>
        <div className="detail-timeline">
          <div className="detail-timeline-col">
            <span className="detail-timeline-label">Start date</span>
            <EditableDate value={project.startDate} onSave={(v) => handleField("startDate", v)} editable={!clientPreview} />
          </div>
          <span className="detail-timeline-connector" />
          <div className="detail-timeline-col">
            <span className="detail-timeline-label">Due date</span>
            <EditableDate value={project.deadline} onSave={(v) => handleField("deadline", v)} editable={!clientPreview} />
          </div>
        </div>
      </div>

      <div className="detail-progress">
        <div className="detail-progress-label">
          <span>Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="progress" style={{ "--progress": `${progress}%` }}>
          <span />
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-head">
          <h3>Overview</h3>
          {!clientPreview && !editingOverview && (
            <button type="button" className="icon-btn detail-edit-btn" aria-label="Edit overview" onClick={() => setEditingOverview(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15.5 4.5 19.5 8.5 8 20H4v-4Z" />
              </svg>
            </button>
          )}
        </div>
        {!clientPreview && editingOverview ? (
          <>
            <textarea
              className="input"
              rows={5}
              autoFocus
              value={overviewDraft}
              onChange={(e) => setOverviewDraft(e.target.value)}
              placeholder="Add a project description…"
            />
            <div className="detail-overview-actions">
              <button className="btn btn-ghost" type="button" onClick={() => { setOverviewDraft(project.description || ""); setEditingOverview(false); }}>
                Cancel
              </button>
              <button className="btn btn-primary" type="button" onClick={handleSaveOverview}>
                Save
              </button>
            </div>
          </>
        ) : (
          <p className="detail-description">{project.description || "No description yet."}</p>
        )}
      </div>

      <div className="detail-section">
        <h3>Milestones</h3>
        <Milestones project={project} studio={studio} readOnly={clientPreview} />
      </div>

      <div className="detail-section">
        <h3>Files &amp; deliverables</h3>
        {detailLoading ? <p className="sub">Loading…</p> : <FilesSection project={project} studio={studio} clientPreview={clientPreview} />}
      </div>

      {clientPreview && (
        <div className="detail-section">
          <h3>Comments</h3>
          {detailLoading ? <p className="sub">Loading…</p> : <Comments project={project} studio={studio} clientPreview={clientPreview} standalone={standalone} />}
        </div>
      )}

      {!clientPreview && (
        <div className="detail-section">
          <h3>Team</h3>
          {project.team.length ? (
            project.team.map((id) => {
              const name = studio.teamName(id);
              const member = studio.team.find((m) => m.id === id);
              return (
                <div key={id} className="detail-row">
                  <span className="avatar" style={{ background: colorForName(name) }}>
                    {initials(name)}
                  </span>
                  <div className="detail-row-main">
                    <strong>{name}</strong>
                    <span>{member?.role || ""}</span>
                  </div>
                  <button className="icon-remove" type="button" aria-label="Remove" onClick={() => handleRemoveTeam(id)}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 7h14" />
                      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      <path d="M7 7l1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12" />
                    </svg>
                  </button>
                </div>
              );
            })
          ) : (
            <div className="empty-state">
              <strong>No team members yet</strong>
              <span>Add someone from the Studio team.</span>
            </div>
          )}
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "var(--space-3)" }}>
            <select className="input select" defaultValue="" onChange={handleAddTeam}>
              <option value="">Add member…</option>
              {studio.team.filter((m) => !project.team.includes(m.id)).map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {!clientPreview && (
        <div className="detail-section">
          <h3>Comments</h3>
          {detailLoading ? <p className="sub">Loading…</p> : <Comments project={project} studio={studio} clientPreview={clientPreview} standalone={standalone} />}
        </div>
      )}

      <div className="detail-section">
        <h3>Activity</h3>
        {detailLoading ? <p className="sub">Loading…</p> : <ActivityFeed project={project} />}
      </div>

      {!clientPreview && (
        <div className="detail-section" style={{ borderTop: "0.0625rem solid var(--line-soft)", paddingTop: "var(--space-5)" }}>
          {confirmingDelete ? (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="btn" type="button" style={{ flex: 1 }} onClick={() => setConfirmingDelete(false)}>
                Cancel
              </button>
              <button className="btn" type="button" style={{ flex: 1, color: "#fff", background: "var(--danger)", borderColor: "transparent" }} onClick={handleDelete}>
                Confirm delete
              </button>
            </div>
          ) : (
            <button className="btn" type="button" style={{ width: "100%", color: "var(--danger)", borderColor: "rgba(255,90,95,0.4)" }} onClick={() => setConfirmingDelete(true)}>
              Delete Project
            </button>
          )}
        </div>
      )}

      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} project={project} />
    </>
  );
}
