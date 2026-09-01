/*
 * Innov8 Studios — one Ongoing Projects row. Metadata-driven by
 * studio.fields via Cell.jsx. No permanent per-row action icons —
 * selecting a row uses the slim checkbox column; opening the Project
 * Detail drawer (for the handful of things that still need it — files,
 * milestones, comments, client preview) uses a small "open" affordance
 * that only appears on hover, not a fixed icon rail.
 */
import Cell from "./Cell.jsx";

export default function ProjectRow({ project, studio, fields, selected, onToggleSelect, onOpen }) {
  return (
    <tr className={`studio-row${project.isDraft ? " is-draft" : ""}${selected ? " is-selected" : ""}`} data-project-row={project.id}>
      <td className="select-cell">
        <input
          type="checkbox"
          className="row-checkbox"
          checked={selected}
          onChange={() => onToggleSelect(project.id)}
          aria-label={`Select ${project.title || "project"}`}
        />
      </td>
      {fields.map((field) => (
        <td
          key={field.id}
          className={`cell-wrap${field.stickyLeft !== undefined ? " studio-cell-sticky" : ""}${field.id === "title" ? " studio-td-title" : ""}${field.wrap ? " is-wrapped" : ""}`}
          style={field.stickyLeft !== undefined ? { left: field.stickyLeft } : undefined}
          onClick={(e) => {
            if (project.isDraft) return;
            if (e.target.closest(".cell-value, .cell-editor, input, textarea, a, button")) return;
            onOpen(project.id);
          }}
        >
          {field.id === "title" ? (
            <div className="cell-inner">
              <button type="button" className="row-open-btn" aria-label="Open project" onClick={() => onOpen(project.id)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
                  <circle cx="12" cy="12" r="2.6" />
                </svg>
              </button>
              <Cell project={project} field={field} studio={studio} />
            </div>
          ) : (
            <Cell project={project} field={field} studio={studio} />
          )}
        </td>
      ))}
    </tr>
  );
}
