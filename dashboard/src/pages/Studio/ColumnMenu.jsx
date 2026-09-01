/*
 * Innov8 Studios — the column header menu (Edit property / Change type /
 * Filter / Sort / Calculate / Hide / Wrap / Insert / Duplicate / Delete).
 * One floating panel with an in-place "drill down" for each ">" row
 * rather than true flyout sub-panels — same reachable functionality,
 * far simpler than juggling multiple anchored popovers at once.
 */
import { useState } from "react";
import { useToast } from "../../lib/ToastContext.jsx";
import { PROPERTY_TYPES, PROPERTY_TYPE_ICONS, effectiveType, storageForType } from "./propertyTypes.js";

const TEXT_FILTER_OPS = [
  ["contains", "Contains"],
  ["not_contains", "Does not contain"],
  ["is", "Is"],
  ["is_not", "Is not"],
  ["is_empty", "Is empty"],
  ["is_not_empty", "Is not empty"]
];
const NUMBER_FILTER_OPS = [
  ["eq", "="],
  ["neq", "≠"],
  ["gt", ">"],
  ["lt", "<"],
  ["gte", "≥"],
  ["lte", "≤"]
];
const SELECT_FILTER_OPS = [
  ["is", "Is"],
  ["is_not", "Is not"]
];
const MULTI_FILTER_OPS = [
  ["contains", "Contains"],
  ["not_contains", "Does not contain"]
];
const DATE_FILTER_OPS = [
  ["is", "Is"],
  ["before", "Before"],
  ["after", "After"]
];
const CHECKBOX_FILTER_OPS = [
  ["checked", "Checked"],
  ["unchecked", "Unchecked"]
];

function filterOpsFor(type) {
  if (type === "number" || type === "money") return NUMBER_FILTER_OPS;
  if (type === "select" || type === "status" || type === "person") return SELECT_FILTER_OPS;
  if (type === "multiselect") return MULTI_FILTER_OPS;
  if (type === "date") return DATE_FILTER_OPS;
  if (type === "checkbox") return CHECKBOX_FILTER_OPS;
  return TEXT_FILTER_OPS;
}

function NumericCalcOptions() {
  return (
    <>
      <button type="button" data-calc="sum">Sum</button>
      <button type="button" data-calc="average">Average</button>
      <button type="button" data-calc="min">Minimum</button>
      <button type="button" data-calc="max">Maximum</button>
      <button type="button" data-calc="count">Count</button>
    </>
  );
}

function Icon({ name, className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: PROPERTY_TYPE_ICONS[name] || "" }} />
  );
}

function ChevronRight() {
  return (
    <svg className="menu-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

export default function ColumnMenu({
  field,
  studio,
  onClose,
  filter,
  onFilterChange,
  sort,
  onSortChange,
  calculation,
  onCalculationChange,
  hidden,
  onToggleHide,
  wrapped,
  onToggleWrap,
  frozen,
  onToggleFreeze,
  onInsertAfter,
  onDeleteRequest
}) {
  const { show } = useToast();
  const [view, setView] = useState("root");
  const [nameDraft, setNameDraft] = useState(field.name);
  const type = effectiveType(field);
  const isProtected = field.id === "title";
  const isNumeric = type === "number" || type === "money";

  async function handleRename(e) {
    e.preventDefault();
    const name = nameDraft.trim();
    if (name && name !== field.name) {
      try {
        await studio.renameField(field, name);
      } catch (err) {
        show(err.message || "Couldn't rename that column — try again.");
      }
    }
    onClose();
  }

  async function handleChangeType(semanticType) {
    const { type: dbType, isMulti } = storageForType(semanticType);
    try {
      await studio.changeFieldType(field, dbType, isMulti);
      onClose();
    } catch (err) {
      show(err.message || "Couldn't change that column's type — try again.");
    }
  }

  async function handleDuplicate() {
    try {
      const copy = await studio.duplicateField(field);
      show(`Column "${copy.name}" added.`);
    } catch (err) {
      show(err.message || "Couldn't duplicate that column — try again.");
    } finally {
      onClose();
    }
  }

  if (view === "edit") {
    return (
      <div className="column-menu">
        <MenuHeader label="Edit property" onBack={() => setView("root")} />
        <form className="column-menu-edit-form" onSubmit={handleRename}>
          <label className="field-label" htmlFor="edit-property-name">
            Property name
          </label>
          <input id="edit-property-name" className="input" type="text" autoFocus value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} />
          <button className="btn btn-primary btn-block" type="submit">
            Save
          </button>
        </form>
      </div>
    );
  }

  if (view === "type") {
    return (
      <div className="column-menu">
        <MenuHeader label="Change type" onBack={() => setView("root")} />
        <div className="property-type-list">
          {PROPERTY_TYPES.map((t) => (
            <button key={t.value} type="button" className={`property-type-row${t.value === type ? " is-current" : ""}`} onClick={() => handleChangeType(t.value)}>
              <Icon name={t.icon} className="property-type-icon" />
              <span className="property-type-text">
                <strong>{t.label}</strong>
                <small>{t.description}</small>
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (view === "filter") {
    const ops = filterOpsFor(type);
    const needsValue = !["is_empty", "is_not_empty", "checked", "unchecked"].includes(filter?.op);
    return (
      <div className="column-menu">
        <MenuHeader label="Filter" onBack={() => setView("root")} />
        <div className="column-menu-section">
          <select
            className="input select"
            value={filter?.op || ops[0][0]}
            onChange={(e) => onFilterChange(field.id, { op: e.target.value, value: filter?.value || "" })}
          >
            {ops.map(([op, label]) => (
              <option key={op} value={op}>
                {label}
              </option>
            ))}
          </select>
          {type !== "checkbox" && needsValue && (
            <input
              className="input"
              type={isNumeric ? "number" : "text"}
              placeholder="Value…"
              value={filter?.value ?? ""}
              onChange={(e) => onFilterChange(field.id, { op: filter?.op || ops[0][0], value: e.target.value })}
              style={{ marginTop: "0.375rem" }}
            />
          )}
          {filter && (
            <button type="button" className="column-menu-clear" onClick={() => onFilterChange(field.id, null)}>
              Clear filter
            </button>
          )}
        </div>
      </div>
    );
  }

  if (view === "sort") {
    return (
      <div className="column-menu">
        <MenuHeader label="Sort" onBack={() => setView("root")} />
        <div className="popover-menu">
          <button type="button" className={sort?.direction === "asc" ? "is-active" : ""} onClick={() => { onSortChange({ fieldId: field.id, direction: "asc" }); onClose(); }}>
            Ascending
          </button>
          <button type="button" className={sort?.direction === "desc" ? "is-active" : ""} onClick={() => { onSortChange({ fieldId: field.id, direction: "desc" }); onClose(); }}>
            Descending
          </button>
          {sort?.fieldId === field.id && (
            <button type="button" onClick={() => { onSortChange(null); onClose(); }}>
              Clear sort
            </button>
          )}
        </div>
      </div>
    );
  }

  if (view === "calculate") {
    return (
      <div className="column-menu">
        <MenuHeader label="Calculate" onBack={() => setView("root")} />
        <div
          className="popover-menu"
          onClick={(e) => {
            const target = e.target.closest("[data-calc]");
            if (!target) return;
            if (target.hasAttribute("data-clear")) {
              onCalculationChange(field.id, null);
              onClose();
              return;
            }
            const calc = target.getAttribute("data-calc");
            if (calc) {
              onCalculationChange(field.id, calc);
              onClose();
            }
          }}
        >
          {isNumeric ? (
            <NumericCalcOptions />
          ) : (
            <>
              <button type="button" data-calc="count_all">Count all</button>
              <button type="button" data-calc="count_values">Count values</button>
              <button type="button" data-calc="count_unique">Count unique</button>
            </>
          )}
          {calculation && (
            <button type="button" data-calc="clear" data-clear="true">
              Clear calculation
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="column-menu">
      <div className="popover-menu">
        <button type="button" onClick={() => setView("edit")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15.5 4.5 19.5 8.5 8 20H4v-4Z"/></svg>
          <span className="menu-label">Edit property</span>
          <ChevronRight />
        </button>
        <button type="button" onClick={() => setView("type")}>
          <Icon name={type} />
          <span className="menu-label">Change type</span>
          <ChevronRight />
        </button>
        <button type="button" onClick={() => setView("filter")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 6h16"/><path d="M7.5 12h9"/><path d="M10.5 18h3"/></svg>
          <span className="menu-label">Filter{filter ? " •" : ""}</span>
          <ChevronRight />
        </button>
        <button type="button" onClick={() => setView("sort")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 4v16"/><path d="m2.5 8 3.5-4 3.5 4"/><path d="M18 20V4"/><path d="m14.5 16 3.5 4 3.5-4"/></svg>
          <span className="menu-label">Sort{sort?.fieldId === field.id ? " •" : ""}</span>
          <ChevronRight />
        </button>
        <button type="button" onClick={() => setView("calculate")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8"/><path d="M8 13h8"/><path d="M8 17h4"/></svg>
          <span className="menu-label">Calculate{calculation ? " •" : ""}</span>
          <ChevronRight />
        </button>
        <button type="button" onClick={() => { onToggleFreeze(field.id); onClose(); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v18"/><path d="m7 7-5 5 5 5"/><path d="m17 7 5 5-5 5"/><path d="M4 12h16"/></svg>
          <span className="menu-label">{frozen ? "Unfreeze" : "Freeze"}{frozen ? " •" : ""}</span>
        </button>

        <div className="popover-separator" />

        <button type="button" onClick={() => { onToggleHide(field.id); onClose(); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c5 0 9 4 10.5 7-.6 1.2-1.5 2.5-2.7 3.6M6.2 6.2C4 7.6 2.4 9.6 1.5 12 3 15 7 19 12 19c1.4 0 2.7-.3 3.9-.8"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>
          <span className="menu-label">{hidden ? "Show" : "Hide"}</span>
        </button>
        <button type="button" onClick={() => { onToggleWrap(field.id); onClose(); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 6h16"/><path d="M4 12h12a3 3 0 0 1 0 6h-2"/><path d="m14 15 2 3-2 3"/><path d="M4 18h4"/></svg>
          <span className="menu-label">{wrapped ? "Un-wrap content" : "Wrap content"}</span>
        </button>

        <div className="popover-separator" />

        <button type="button" onClick={() => { onInsertAfter(field.id, "left"); onClose(); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
          <span className="menu-label">Insert left</span>
        </button>
        <button type="button" onClick={() => { onInsertAfter(field.id, "right"); onClose(); }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5v14"/><path d="M5 12h14"/></svg>
          <span className="menu-label">Insert right</span>
        </button>

        <div className="popover-separator" />

        <button type="button" onClick={handleDuplicate}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="4" rx="1"/><path d="M4.5 9v9a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V9"/><path d="M10 13h4"/></svg>
          <span className="menu-label">Duplicate property</span>
        </button>
        {!isProtected && (
          <button
            type="button"
            className="is-danger"
            onClick={() => {
              onDeleteRequest(field);
              onClose();
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 7h14"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M7 7l1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12"/></svg>
            <span className="menu-label">Delete property</span>
          </button>
        )}
      </div>
    </div>
  );
}

function MenuHeader({ label, onBack }) {
  return (
    <button type="button" className="column-menu-back" onClick={onBack}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="m15 6-6 6 6 6" />
      </svg>
      {label}
    </button>
  );
}
