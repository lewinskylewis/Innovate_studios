/*
 * Innov8 Studios — compact toolbar above the Ongoing Projects table:
 * search, status/priority/assignee quick filters, a Properties
 * (show/hide) menu, and "+ Add project". Restrained, icon-led controls
 * rather than large buttons.
 */
import { useState } from "react";
import Popover from "../../components/Popover.jsx";

export default function TableToolbar({
  filters,
  onFiltersChange,
  statusOptions,
  priorityOptions,
  team,
  fields,
  hiddenFields,
  onToggleHide
}) {
  const [propsAnchor, setPropsAnchor] = useState(null);

  function set(key, value) {
    onFiltersChange({ ...filters, [key]: value });
  }

  return (
    <div className="studio-toolbar">
      <div className="studio-toolbar-search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" />
          <path d="m20 20-3.8-3.8" />
        </svg>
        <input type="search" placeholder="Search" value={filters.search} onChange={(e) => set("search", e.target.value)} />
      </div>

      <select className="studio-toolbar-select" aria-label="Filter by status" value={filters.status} onChange={(e) => set("status", e.target.value)}>
        <option value="All">Status</option>
        {statusOptions.map((o) => (
          <option key={o.id} value={o.label}>
            {o.label}
          </option>
        ))}
      </select>

      <select className="studio-toolbar-select" aria-label="Filter by priority" value={filters.priority} onChange={(e) => set("priority", e.target.value)}>
        <option value="All">Priority</option>
        {priorityOptions.map((o) => (
          <option key={o.id} value={o.label}>
            {o.label}
          </option>
        ))}
      </select>

      <select className="studio-toolbar-select" aria-label="Filter by assignee" value={filters.assignee} onChange={(e) => set("assignee", e.target.value)}>
        <option value="All">Assignee</option>
        {team.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>

      <button type="button" className="studio-toolbar-btn" onClick={(e) => setPropsAnchor(e.currentTarget)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 6h16" />
          <path d="M7.5 12h9" />
          <path d="M10.5 18h3" />
        </svg>
        Properties
      </button>
      <Popover anchor={propsAnchor} onClose={() => setPropsAnchor(null)} width={200}>
        <div className="popover-menu">
          {fields.filter((f) => f.id !== "title").map((f) => (
            <button key={f.id} type="button" onClick={() => onToggleHide(f.id)}>
              <span className={`property-visibility-check${hiddenFields.has(f.id) ? "" : " is-visible"}`}>
                {!hiddenFields.has(f.id) && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12l4 4 10-10" />
                  </svg>
                )}
              </span>
              <span className="menu-label">{f.name}</span>
            </button>
          ))}
        </div>
      </Popover>
    </div>
  );
}
