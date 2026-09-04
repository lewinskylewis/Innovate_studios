/*
 * Innov8 Studios — a project's milestone list inside the detail drawer.
 * Ported from studio.js's buildMilestonesHtml + the milestone-row click
 * handlers in wireProjectsView, simplified to a form + checklist rather
 * than the spreadsheet sub-rows the legacy Ongoing Projects table used.
 *
 * Drag-reorder copies StudioTable.jsx/ColumnHeader.jsx's native HTML5
 * drag-and-drop pattern exactly (no library) — desktop-only, same
 * precedent/limitation as that existing column-reorder feature. Only
 * wired when !readOnly, so it's automatically absent from Client View
 * (readOnly is always true there) with no extra guard needed.
 */
import { useState } from "react";
import { useToast } from "../../lib/ToastContext.jsx";
import { formatDueLabel } from "../../lib/format.js";

export default function Milestones({ project, studio, readOnly = false }) {
  const { show } = useToast();
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [adding, setAdding] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);

  async function handleAdd(event) {
    event.preventDefault();
    if (!title.trim()) return;
    setAdding(true);
    try {
      await studio.createMilestone(project, { title: title.trim(), dueDate: dueDate || undefined });
      setTitle("");
      setDueDate("");
    } catch (err) {
      console.error("[studio] createMilestone failed", err);
      show(err.message || "Couldn't add that milestone — try again.");
    } finally {
      setAdding(false);
    }
  }

  async function toggleStatus(milestone) {
    const isDone = studio.labelFor("milestoneStatus", milestone.statusId) === "Completed";
    try {
      await studio.updateMilestoneField(project, milestone, "status", isDone ? "Not started" : "Completed");
    } catch (err) {
      console.error("[studio] milestone status toggle failed", err);
      show("Couldn't update that milestone — try again.");
    }
  }

  async function remove(milestone) {
    try {
      await studio.deleteMilestone(project, milestone);
    } catch (err) {
      console.error("[studio] deleteMilestone failed", err);
      show(err.message || "Couldn't delete that milestone — try again.");
    }
  }

  function handleDragStart(m) {
    return () => setDraggingId(m.id);
  }
  function handleDragOver(m) {
    return (e) => {
      e.preventDefault();
      if (m.id !== draggingId) setDropTargetId(m.id);
    };
  }
  function handleDragLeave(m) {
    return () => setDropTargetId((cur) => (cur === m.id ? null : cur));
  }
  function handleDrop(m) {
    return async (e) => {
      e.preventDefault();
      setDropTargetId(null);
      const sourceId = draggingId;
      setDraggingId(null);
      if (!sourceId || sourceId === m.id) return;
      const sorted = [...project.milestones];
      const fromIndex = sorted.findIndex((x) => x.id === sourceId);
      const toIndex = sorted.findIndex((x) => x.id === m.id);
      if (fromIndex === -1 || toIndex === -1) return;
      const [moved] = sorted.splice(fromIndex, 1);
      sorted.splice(toIndex, 0, moved);
      try {
        await studio.reorderMilestones(project, sorted);
      } catch (err) {
        console.error("[studio] reorderMilestones failed", err);
        show(err.message || "Couldn't reorder milestones — try again.");
      }
    };
  }
  function handleDragEnd() {
    setDraggingId(null);
    setDropTargetId(null);
  }

  return (
    <div>
      {project.milestones.length ? (
        <div className="milestone-timeline">
          {project.milestones.map((m) => {
            const isDone = studio.labelFor("milestoneStatus", m.statusId) === "Completed";
            const isDragging = draggingId === m.id;
            const isDropTarget = dropTargetId === m.id;
            return (
              <div
                key={m.id}
                className={`milestone-item${isDone ? " is-complete" : ""}${isDragging ? " is-dragging" : ""}${isDropTarget ? " is-drop-target" : ""}`}
                draggable={!readOnly}
                onDragStart={readOnly ? undefined : handleDragStart(m)}
                onDragOver={readOnly ? undefined : handleDragOver(m)}
                onDragLeave={readOnly ? undefined : handleDragLeave(m)}
                onDrop={readOnly ? undefined : handleDrop(m)}
                onDragEnd={readOnly ? undefined : handleDragEnd}
              >
                <span className="milestone-marker" style={readOnly ? undefined : { cursor: "pointer" }} onClick={readOnly ? undefined : () => toggleStatus(m)}>
                  {isDone && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12l4 4 10-10" />
                    </svg>
                  )}
                </span>
                <div className="milestone-head">
                  {!readOnly && (
                    <span className="milestone-grip" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="9" cy="6" r="1.4" />
                        <circle cx="9" cy="12" r="1.4" />
                        <circle cx="9" cy="18" r="1.4" />
                        <circle cx="15" cy="6" r="1.4" />
                        <circle cx="15" cy="12" r="1.4" />
                        <circle cx="15" cy="18" r="1.4" />
                      </svg>
                    </span>
                  )}
                  <strong>{m.title}</strong>
                  <span className="milestone-tags">{formatDueLabel(m.dueDate, isDone)}</span>
                  {!readOnly && (
                    <button type="button" className="icon-remove milestone-delete" aria-label="Delete milestone" onClick={() => remove(m)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M5 7h14" />
                        <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        <path d="M7 7l1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12" />
                      </svg>
                    </button>
                  )}
                </div>
                {m.description && <p>{m.description}</p>}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <strong>No milestones yet</strong>
          <span>Add milestones to track this project's timeline.</span>
        </div>
      )}

      {!readOnly && (
        <form className="note-composer" onSubmit={handleAdd} style={{ marginTop: "0.75rem" }}>
          <input className="input" type="text" placeholder="Add a milestone…" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} style={{ maxWidth: "10rem" }} />
          <button className="btn" type="submit" disabled={adding}>
            Add
          </button>
        </form>
      )}
    </div>
  );
}
