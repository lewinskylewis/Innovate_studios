/*
 * Innov8 Studios — one Ongoing Projects table cell, metadata-driven by
 * a project_fields row (system or custom). Every property type edits
 * directly in place — no drawer, modal or page ever opens for an
 * ordinary cell edit (see propertyTypes.js's effectiveType() for how
 * select/multiselect/status/email/phone are told apart from the same
 * fixed set of database type values).
 */
import { useState } from "react";
import Popover from "../../components/Popover.jsx";
import { useToast } from "../../lib/ToastContext.jsx";
import { colorForName, initials } from "../../lib/avatar.js";
import { formatDate, formatMoney } from "../../lib/format.js";
import { effectiveType } from "./propertyTypes.js";

export function getCellValue(project, field, studio) {
  if (field.id === "assignee") return project.team;
  if (field.id === "client") return project.client;
  if (field.id === "status") return studio.labelFor("status", project.statusId);
  if (field.id === "priority") return studio.labelFor("priority", project.priorityId);
  return field.system ? project[field.id] : project.custom[field.id];
}

function badgeStyle(color) {
  return { background: `${color}22`, color, borderColor: `${color}55` };
}

function OptionList({ field, studio, currentValue, onPick }) {
  const { show } = useToast();
  const [adding, setAdding] = useState("");
  const isSystem = field.id === "status" || field.id === "priority";
  const kind = field.id === "status" ? "status" : field.id === "priority" ? "priority" : null;

  async function handleAdd(e) {
    e.preventDefault();
    const label = adding.trim();
    if (!label || (field.options || []).some((o) => o.label === label)) return;
    setAdding("");
    try {
      if (isSystem) await studio.addSystemOption(kind === "status" ? "project_status" : "priority", label);
      else await studio.addFieldOption(field, label);
    } catch (err) {
      show(err.message || "Couldn't add that option — try again.");
    }
  }

  async function handleRecolor(option) {
    try {
      if (isSystem) await studio.recolorSystemOption(kind === "status" ? "project_status" : "priority", option);
      else await studio.recolorFieldOption(field, option);
    } catch (err) {
      show(err.message || "Couldn't recolor that option — try again.");
    }
  }

  async function handleDelete(option) {
    try {
      if (isSystem) await studio.deleteSystemOption(kind === "status" ? "project_status" : "priority", option);
      else await studio.deleteFieldOption(field, option);
    } catch (err) {
      show(err.message || "Couldn't delete that option — try again.");
    }
  }

  const options = field.options || [];
  const isMulti = Array.isArray(currentValue);
  const selectedSet = isMulti ? new Set(currentValue) : null;

  return (
    <>
      <div className="popover-options-list">
        {options.length ? (
          options.map((o) => (
            <div key={o.id} className={`popover-option-row${(isMulti ? selectedSet.has(o.label) : o.label === currentValue) ? " is-selected" : ""}`}>
              <button type="button" className="option-color-dot" style={{ background: o.color }} aria-label="Change color" onClick={() => handleRecolor(o)} />
              <span className="option-label" style={{ cursor: "pointer" }} onClick={() => onPick(o.label)}>
                {o.label}
              </span>
              {isMulti && selectedSet.has(o.label) && (
                <svg className="option-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12l4 4 10-10" />
                </svg>
              )}
              <button type="button" className="icon-remove" aria-label="Delete option" onClick={() => handleDelete(o)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 7h14" />
                  <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                  <path d="M7 7l1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12" />
                </svg>
              </button>
            </div>
          ))
        ) : (
          <p className="popover-empty">No options yet.</p>
        )}
      </div>
      <form className="popover-add-option" onSubmit={handleAdd}>
        <input type="text" placeholder="Add option…" value={adding} onChange={(e) => setAdding(e.target.value)} autoFocus />
        <button type="submit">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 5v14" />
            <path d="M5 12h14" />
          </svg>
        </button>
      </form>
    </>
  );
}

function PersonList({ project, studio, onChange }) {
  const selected = new Set(project.team);
  return (
    <div className="popover-options-list">
      {studio.team.map((m) => (
        <label key={m.id} className="popover-person-row">
          <input
            type="checkbox"
            checked={selected.has(m.id)}
            onChange={(e) => {
              const next = e.target.checked ? [...selected, m.id] : [...selected].filter((id) => id !== m.id);
              onChange(next);
            }}
          />
          <span className="avatar avatar--sm" style={{ background: colorForName(m.name) }}>
            {initials(m.name)}
          </span>
          <span>{m.name}</span>
        </label>
      ))}
    </div>
  );
}

export default function Cell({ project, field, studio }) {
  const { show } = useToast();
  const [editing, setEditing] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const value = getCellValue(project, field, studio);
  const type = effectiveType(field);

  async function commit(newValue) {
    try {
      await studio.updateProjectField(project, field.id, newValue);
    } catch (err) {
      console.error(`[studio] update ${field.id} failed`, err);
      show(err.message || `Couldn't update ${field.name} — try again.`);
    }
  }

  if (type === "checkbox") {
    return <input type="checkbox" className="cell-checkbox" checked={Boolean(value)} onChange={(e) => commit(e.target.checked)} />;
  }

  if (type === "select" || type === "status") {
    const option = (field.options || []).find((o) => o.label === value);
    return (
      <span className="cell-value" style={{ cursor: "pointer" }} onClick={(e) => setAnchor(e.currentTarget)}>
        {value ? (
          <span className="option-badge" style={badgeStyle(option?.color || "#a9a7a4")}>
            {value}
          </span>
        ) : (
          <span className="cell-placeholder">Set…</span>
        )}
        <Popover anchor={anchor} onClose={() => setAnchor(null)} width={220}>
          <OptionList
            field={field}
            studio={studio}
            currentValue={value}
            onPick={(label) => {
              setAnchor(null);
              commit(label);
            }}
          />
        </Popover>
      </span>
    );
  }

  if (type === "multiselect") {
    const values = Array.isArray(value) ? value : [];
    return (
      <span className="cell-value" style={{ cursor: "pointer" }} onClick={(e) => setAnchor(e.currentTarget)}>
        {values.length ? (
          <span className="multiselect-tags">
            {values.map((label) => {
              const option = (field.options || []).find((o) => o.label === label);
              return (
                <span key={label} className="option-badge" style={badgeStyle(option?.color || "#a9a7a4")}>
                  {label}
                </span>
              );
            })}
          </span>
        ) : (
          <span className="cell-placeholder">Set…</span>
        )}
        <Popover anchor={anchor} onClose={() => setAnchor(null)} width={220}>
          <OptionList
            field={field}
            studio={studio}
            currentValue={values}
            onPick={(label) => {
              const next = values.includes(label) ? values.filter((v) => v !== label) : [...values, label];
              commit(next);
            }}
          />
        </Popover>
      </span>
    );
  }

  if (type === "person") {
    const ids = value || [];
    return (
      <span className="cell-value" style={{ cursor: "pointer" }} onClick={(e) => setAnchor(e.currentTarget)}>
        {ids.length ? (
          <>
            <span className="avatar-group">
              {ids.map((id) => {
                const name = studio.teamName(id);
                return (
                  <span key={id} className="avatar avatar--sm" style={{ background: colorForName(name) }}>
                    {initials(name)}
                  </span>
                );
              })}
            </span>
            <span className="person-names">{ids.map((id) => studio.teamName(id)).join(", ")}</span>
          </>
        ) : (
          <span className="cell-placeholder">Assign…</span>
        )}
        <Popover anchor={anchor} onClose={() => setAnchor(null)} width={220}>
          <PersonList project={project} studio={studio} onChange={(next) => commit(next)} />
        </Popover>
      </span>
    );
  }

  if (type === "date") {
    if (editing) {
      return (
        <input
          className="cell-editor"
          type="date"
          autoFocus
          defaultValue={value || ""}
          onBlur={(e) => {
            setEditing(false);
            if (e.target.value !== value) commit(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") setEditing(false);
          }}
        />
      );
    }
    return (
      <span className="cell-value" onClick={(e) => e.target.closest(".date-cell-icon") && setEditing(true)}>
        {value ? <span className="date-cell-text">{formatDate(value)}</span> : <span className="cell-placeholder">Set date…</span>}
        <span className="date-cell-icon" style={{ cursor: "pointer" }} onClick={() => setEditing(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3.5" y="5.5" width="17" height="15" rx="2" />
            <path d="M8 3.5v4" />
            <path d="M16 3.5v4" />
            <path d="M3.5 10.5h17" />
          </svg>
        </span>
      </span>
    );
  }

  if (editing) {
    const commonProps = {
      className: "cell-editor",
      autoFocus: true,
      defaultValue: value ?? "",
      onBlur: (e) => {
        setEditing(false);
        const raw = e.target.value;
        const next = type === "number" || type === "money" ? (raw === "" ? null : Number(raw)) : raw;
        if (String(next ?? "") !== String(value ?? "")) commit(next);
      },
      onKeyDown: (e) => {
        if (e.key === "Enter" && type !== "longtext") e.currentTarget.blur();
        if (e.key === "Escape") setEditing(false);
      }
    };
    if (type === "longtext") return <textarea rows={3} {...commonProps} />;
    if (type === "number" || type === "money") return <input type="number" step={type === "money" ? "1000" : "1"} {...commonProps} />;
    if (type === "phone") return <input type="tel" {...commonProps} />;
    if (type === "email") return <input type="email" {...commonProps} />;
    return <input type="text" {...commonProps} />;
  }

  let display;
  if (type === "money") display = value || value === 0 ? formatMoney(value, field.currency) : <span className="cell-placeholder">Add…</span>;
  else if (type === "number") display = value || value === 0 ? String(value) : <span className="cell-placeholder">Add…</span>;
  else if (type === "url")
    display = value ? (
      <a href={value} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
        {value}
      </a>
    ) : (
      <span className="cell-placeholder">Add link…</span>
    );
  else if (type === "email")
    display = value ? (
      <a href={`mailto:${value}`} onClick={(e) => e.stopPropagation()}>
        {value}
      </a>
    ) : (
      <span className="cell-placeholder">Add email…</span>
    );
  else if (type === "phone")
    display = value ? (
      <a href={`tel:${value}`} onClick={(e) => e.stopPropagation()}>
        {value}
      </a>
    ) : (
      <span className="cell-placeholder">Add phone…</span>
    );
  else if (type === "longtext")
    display = value ? (
      field.wrap ? (
        <span>{value}</span>
      ) : (
        <span title={value}>{value.length > 42 ? `${value.slice(0, 42)}…` : value}</span>
      )
    ) : (
      <span className="cell-placeholder">Add notes…</span>
    );
  else display = value ? String(value) : <span className="cell-placeholder">{field.id === "title" ? "Untitled project" : "Empty"}</span>;

  return (
    <span className={`cell-value${field.wrap ? " is-wrapped" : ""}`} onClick={() => setEditing(true)} style={{ cursor: "text" }}>
      {display}
    </span>
  );
}
