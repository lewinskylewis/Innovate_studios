/*
 * Innov8 Studios — the Ongoing Projects table: an in-table database, not
 * a card UI. Just the month bands and the table itself — search/filter
 * controls live in the tab row (Studio.jsx) so they stay visible even
 * when every month is collapsed. Owns per-column filter/sort/calculate/
 * hide/wrap/freeze view-state (client-side only, not persisted), row
 * selection + the floating bulk-action bar, and the "+" add-property
 * flow. Column headers, drag-reorder and resize are shared across every
 * month group's own <table> because they all render the very same
 * studio.fields array — resizing or reordering in one group's header
 * immediately reflects in every other group's.
 *
 * Every visible column gets an explicit pixel width via a <colgroup>
 * and `table-layout: fixed` (see renderColGroup/widthFor below) rather
 * than the browser's default content-driven "auto" layout. That's what
 * makes resize keep working reliably once the table has scrolled or has
 * many columns — under auto layout, an explicit width on just the <th>
 * is only ever a hint the browser can override once content or a
 * scrolling container is involved; under fixed layout + colgroup, the
 * column width is authoritative, so dragging a handle always changes
 * exactly the column you grabbed, regardless of scroll position. The
 * same colgroup widths are reused to compute each frozen column's
 * sticky `left` offset (see stickyLefts), so the two features can never
 * drift out of sync with each other the way separately-tracked width
 * state could.
 *
 * Cell editing itself lives in Cell.jsx and always happens in place;
 * this component never opens a drawer/modal for an ordinary edit — the
 * Project Detail drawer only opens via the row's small hover-revealed
 * "open" affordance (ProjectRow.jsx), for the handful of things that
 * still need it (milestones, comments, files, activity, client preview).
 */
import { useMemo, useState } from "react";
import Modal from "../../components/Modal.jsx";
import { useToast } from "../../lib/ToastContext.jsx";
import { getCellValue } from "./Cell.jsx";
import ColumnHeader from "./ColumnHeader.jsx";
import CreatePropertyMenu from "./CreatePropertyMenu.jsx";
import MonthGroup from "./MonthGroup.jsx";
import ProjectRow from "./ProjectRow.jsx";
import BulkActionBar from "./BulkActionBar.jsx";
import { effectiveType } from "./propertyTypes.js";

const SELECT_COL_WIDTH = 32;
const ADD_COL_WIDTH = 44;
const TITLE_COL_WIDTH = 240;
const DEFAULT_COL_WIDTH = 170;

const CALC_LABELS = {
  sum: "SUM",
  average: "AVG",
  min: "MIN",
  max: "MAX",
  count: "COUNT",
  count_all: "COUNT",
  count_values: "FILLED",
  count_unique: "UNIQUE"
};

function widthFor(field) {
  return field.width || (field.id === "title" ? TITLE_COL_WIDTH : DEFAULT_COL_WIDTH);
}

function monthKeyOf(project) {
  return (project.deadline || "").slice(0, 7);
}

function currentMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function monthLabel(key) {
  if (!key) return "NO DUE DATE";
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return "NO DUE DATE";
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase();
}

function matchesColumnFilter(project, field, filter, studio) {
  if (!filter || !filter.op) return true;
  const type = effectiveType(field);
  const raw = getCellValue(project, field, studio);
  const { op, value } = filter;

  if (type === "checkbox") {
    const checked = Boolean(raw);
    if (op === "checked") return checked;
    if (op === "unchecked") return !checked;
    return true;
  }
  if (type === "multiselect") {
    const values = Array.isArray(raw) ? raw : [];
    if (op === "contains") return value ? values.includes(value) : true;
    if (op === "not_contains") return value ? !values.includes(value) : true;
    return true;
  }
  if (type === "person") {
    const names = (Array.isArray(raw) ? raw : []).map((id) => studio.teamName(id));
    if (op === "is") return value ? names.includes(value) : true;
    if (op === "is_not") return value ? !names.includes(value) : true;
    return true;
  }
  if (type === "select" || type === "status") {
    if (op === "is") return value ? raw === value : true;
    if (op === "is_not") return value ? raw !== value : true;
    return true;
  }
  if (type === "number" || type === "money") {
    if (value === "" || value === undefined) return true;
    const num = raw === null || raw === undefined || raw === "" ? null : Number(raw);
    const target = Number(value);
    if (Number.isNaN(target) || num === null) return false;
    if (op === "eq") return num === target;
    if (op === "neq") return num !== target;
    if (op === "gt") return num > target;
    if (op === "lt") return num < target;
    if (op === "gte") return num >= target;
    if (op === "lte") return num <= target;
    return true;
  }
  if (type === "date") {
    if (!value) return true;
    if (op === "is") return raw === value;
    if (op === "before") return raw ? raw < value : false;
    if (op === "after") return raw ? raw > value : false;
    return true;
  }

  const str = raw === null || raw === undefined ? "" : String(raw).toLowerCase();
  const q = (value || "").toLowerCase();
  if (op === "contains") return str.includes(q);
  if (op === "not_contains") return !str.includes(q);
  if (op === "is") return str === q;
  if (op === "is_not") return str !== q;
  if (op === "is_empty") return !str;
  if (op === "is_not_empty") return Boolean(str);
  return true;
}

function sortValue(project, field, studio) {
  const type = effectiveType(field);
  const raw = getCellValue(project, field, studio);
  if (type === "person") return (Array.isArray(raw) ? raw : []).map((id) => studio.teamName(id)).join(", ").toLowerCase();
  if (type === "multiselect") return (Array.isArray(raw) ? raw : []).join(", ").toLowerCase();
  if (type === "number" || type === "money") return raw === null || raw === undefined || raw === "" ? -Infinity : Number(raw);
  if (type === "checkbox") return raw ? 1 : 0;
  return raw === null || raw === undefined ? "" : String(raw).toLowerCase();
}

function computeCalculation(projects, field, calc, studio) {
  if (!calc) return null;
  const values = projects.map((p) => getCellValue(p, field, studio));
  const label = CALC_LABELS[calc] || calc.toUpperCase();

  if (calc === "count_all") return `${label} ${projects.length}`;
  if (calc === "count_values")
    return `${label} ${values.filter((v) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0)).length}`;
  if (calc === "count_unique") {
    const set = new Set(values.map((v) => (Array.isArray(v) ? v.join(",") : String(v ?? ""))));
    return `${label} ${set.size}`;
  }
  if (["sum", "average", "min", "max", "count"].includes(calc)) {
    const nums = values.map((v) => Number(v)).filter((n) => !Number.isNaN(n));
    if (calc === "count") return `${label} ${nums.length}`;
    if (!nums.length) return `${label} —`;
    if (calc === "sum") return `${label} ${nums.reduce((a, b) => a + b, 0).toLocaleString()}`;
    if (calc === "average") return `${label} ${(nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1)}`;
    if (calc === "min") return `${label} ${Math.min(...nums).toLocaleString()}`;
    if (calc === "max") return `${label} ${Math.max(...nums).toLocaleString()}`;
  }
  return null;
}

function downloadCsv(fields, projects, studio) {
  const header = fields.map((f) => f.name);
  const rows = projects.map((p) =>
    fields.map((f) => {
      const type = effectiveType(f);
      const raw = getCellValue(p, f, studio);
      let out;
      if (type === "person") out = (Array.isArray(raw) ? raw : []).map((id) => studio.teamName(id)).join("; ");
      else if (type === "multiselect") out = (Array.isArray(raw) ? raw : []).join("; ");
      else out = raw === null || raw === undefined ? "" : String(raw);
      return `"${out.replace(/"/g, '""')}"`;
    })
  );
  const csv = [header.map((h) => `"${h.replace(/"/g, '""')}"`).join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ongoing-projects-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function StudioTable({ studio, onOpen, onNewProject, creating, filters, hiddenFields, onToggleHide, orderedFields }) {
  const { show } = useToast();
  const [selected, setSelected] = useState(() => new Set());
  const [columnFilters, setColumnFilters] = useState({});
  const [sort, setSort] = useState(null);
  const [calculations, setCalculations] = useState({});
  const [wrappedFields, setWrappedFields] = useState(() => new Set());
  const [frozenFieldId, setFrozenFieldId] = useState("title");
  const [collapsedMonths, setCollapsedMonths] = useState(() => {
    const currentKey = currentMonthKey();
    const keys = new Set(studio.projects.map(monthKeyOf));
    const initial = new Set();
    keys.forEach((k) => {
      if (k && k !== currentKey) initial.add(k);
    });
    return initial;
  });

  const [draggingId, setDraggingId] = useState(null);
  const [dropTargetId, setDropTargetId] = useState(null);
  const [createAnchor, setCreateAnchor] = useState(null);
  const [insertAfterId, setInsertAfterId] = useState(undefined);
  const [pendingFieldDelete, setPendingFieldDelete] = useState(null);
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);

  const visibleFields = useMemo(() => orderedFields.filter((f) => !hiddenFields.has(f.id)), [orderedFields, hiddenFields]);

  /* table-layout: fixed treats an explicit total table width as
     authoritative; leaving it at "auto" lets the browser proportionally
     redistribute the colgroup's widths to fit whatever container space
     happens to be available instead of honoring them exactly — which is
     what silently broke resizing once the table had many columns.
     Computed from the very same per-field widths as the colgroup below,
     so the two can never drift apart. */
  const totalTableWidth = useMemo(
    () => SELECT_COL_WIDTH + visibleFields.reduce((sum, f) => sum + widthFor(f), 0) + ADD_COL_WIDTH,
    [visibleFields]
  );

  const frozenIndex = useMemo(() => {
    if (!frozenFieldId) return -1;
    return visibleFields.findIndex((f) => f.id === frozenFieldId);
  }, [visibleFields, frozenFieldId]);

  const stickyLefts = useMemo(() => {
    const map = {};
    if (frozenIndex < 0) return map;
    let left = SELECT_COL_WIDTH;
    for (let i = 0; i <= frozenIndex; i++) {
      const f = visibleFields[i];
      map[f.id] = left;
      left += widthFor(f);
    }
    return map;
  }, [visibleFields, frozenIndex]);

  function handleToggleFreeze(fieldId) {
    setFrozenFieldId((cur) => (cur === fieldId ? (fieldId === "title" ? null : "title") : fieldId));
  }

  const filteredProjects = useMemo(() => {
    let items = [...studio.projects];
    const { search, status, priority, assignee } = filters;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.client.toLowerCase().includes(q) ||
          p.team.some((id) => studio.teamName(id).toLowerCase().includes(q)) ||
          (p.description || "").toLowerCase().includes(q)
      );
    }
    if (status !== "All") items = items.filter((p) => studio.labelFor("status", p.statusId) === status);
    if (priority !== "All") items = items.filter((p) => studio.labelFor("priority", p.priorityId) === priority);
    if (assignee !== "All") items = items.filter((p) => p.team.includes(assignee));

    Object.entries(columnFilters).forEach(([fieldId, filter]) => {
      const field = orderedFields.find((f) => f.id === fieldId);
      if (!field || !filter) return;
      items = items.filter((p) => matchesColumnFilter(p, field, filter, studio));
    });

    if (sort) {
      const field = orderedFields.find((f) => f.id === sort.fieldId);
      if (field) {
        items.sort((a, b) => {
          const av = sortValue(a, field, studio);
          const bv = sortValue(b, field, studio);
          const cmp = av < bv ? -1 : av > bv ? 1 : 0;
          return sort.direction === "desc" ? -cmp : cmp;
        });
      }
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studio.projects, filters, columnFilters, sort, orderedFields]);

  const groups = useMemo(() => {
    const byKey = new Map();
    filteredProjects.forEach((p) => {
      const key = monthKeyOf(p) || "undated";
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(p);
    });
    const currentKey = currentMonthKey();
    if (!byKey.has(currentKey)) byKey.set(currentKey, []);
    if (!sort) {
      byKey.forEach((items) => {
        items.sort((a, b) => (a.isDraft === b.isDraft ? new Date(a.deadline) - new Date(b.deadline) : a.isDraft ? 1 : -1));
      });
    }
    const keys = [...byKey.keys()].filter((k) => k !== "undated").sort();
    if (byKey.has("undated")) keys.push("undated");
    return keys.map((key) => ({ key, label: monthLabel(key === "undated" ? "" : key), projects: byKey.get(key), isCurrent: key === currentKey }));
  }, [filteredProjects, sort]);

  function toggleMonth(key) {
    setCollapsedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelected(new Set());
  }

  const selectedProjects = useMemo(() => studio.projects.filter((p) => selected.has(p.id)), [studio.projects, selected]);

  /* ---------- column filter/sort/calc/wrap/freeze ---------- */

  function handleFilterChange(fieldId, filter) {
    setColumnFilters((prev) => {
      const next = { ...prev };
      if (filter) next[fieldId] = filter;
      else delete next[fieldId];
      return next;
    });
  }

  function handleSortChange(next) {
    setSort(next);
  }

  function handleCalculationChange(fieldId, calc) {
    setCalculations((prev) => {
      const next = { ...prev };
      if (calc) next[fieldId] = calc;
      else delete next[fieldId];
      return next;
    });
  }

  function handleToggleWrap(fieldId) {
    setWrappedFields((prev) => {
      const next = new Set(prev);
      if (next.has(fieldId)) next.delete(fieldId);
      else next.add(fieldId);
      return next;
    });
  }

  const fieldsForRows = useMemo(
    () => visibleFields.map((f) => ({ ...f, wrap: wrappedFields.has(f.id), stickyLeft: stickyLefts[f.id] })),
    [visibleFields, wrappedFields, stickyLefts]
  );

  /* ---------- column drag-reorder ---------- */

  function handleDragStart(field) {
    return () => setDraggingId(field.id);
  }
  function handleDragOver(field) {
    return (e) => {
      e.preventDefault();
      if (field.id !== draggingId) setDropTargetId(field.id);
    };
  }
  function handleDragLeave(field) {
    return () => setDropTargetId((cur) => (cur === field.id ? null : cur));
  }
  function handleDrop(field) {
    return async (e) => {
      e.preventDefault();
      setDropTargetId(null);
      const sourceId = draggingId;
      setDraggingId(null);
      if (!sourceId || sourceId === field.id) return;
      const sorted = [...orderedFields];
      const fromIndex = sorted.findIndex((f) => f.id === sourceId);
      const toIndex = sorted.findIndex((f) => f.id === field.id);
      if (fromIndex === -1 || toIndex === -1) return;
      const [moved] = sorted.splice(fromIndex, 1);
      sorted.splice(toIndex, 0, moved);
      try {
        await studio.reorderFields(sorted);
      } catch (err) {
        console.error("[studio] reorderFields failed", err);
        show(err.message || "Couldn't reorder columns — try again.");
      }
    };
  }
  function handleDragEnd() {
    setDraggingId(null);
    setDropTargetId(null);
  }

  /* ---------- add / insert property ---------- */

  function openCreateMenu(e, afterId) {
    setInsertAfterId(afterId);
    setCreateAnchor(e.currentTarget);
  }

  async function handleCreateField(input) {
    try {
      await studio.createField(input);
    } catch (err) {
      show(err.message || "Couldn't add that column — try again.");
      throw err;
    }
  }

  function handleInsertAfter(fieldId, side) {
    if (side === "left") {
      const sorted = orderedFields;
      const idx = sorted.findIndex((f) => f.id === fieldId);
      const before = idx > 0 ? sorted[idx - 1] : null;
      setInsertAfterId(before ? before.id : undefined);
    } else {
      setInsertAfterId(fieldId);
    }
    const th = document.querySelector(`[data-field-th="${fieldId}"]`);
    if (th) setCreateAnchor(th);
  }

  async function handleDeleteFieldConfirm() {
    const field = pendingFieldDelete;
    setPendingFieldDelete(null);
    try {
      await studio.deleteField(field);
      show(`Column "${field.name}" deleted.`);
    } catch (err) {
      show(err.message || "Couldn't delete that column — try again.");
    }
  }

  /* ---------- bulk actions ---------- */

  function handleMassEmail() {
    const emails = new Set();
    selectedProjects.forEach((p) => {
      const client = studio.clientsByName.get((p.client || "").toLowerCase());
      if (client?.email) emails.add(client.email);
    });
    if (!emails.size) {
      show("None of the selected projects have a client email on file.");
      return;
    }
    window.location.href = `mailto:?bcc=${encodeURIComponent([...emails].join(","))}`;
  }

  async function handleBulkDuplicate() {
    setBulkBusy(true);
    try {
      for (const project of selectedProjects) {
        // eslint-disable-next-line no-await-in-loop
        await studio.duplicateProject(project);
      }
      show(`${selectedProjects.length} project${selectedProjects.length === 1 ? "" : "s"} duplicated.`);
      clearSelection();
    } catch (err) {
      show(err.message || "Couldn't duplicate every selected project.");
    } finally {
      setBulkBusy(false);
    }
  }

  function handleExport() {
    downloadCsv(orderedFields, selectedProjects, studio);
  }

  async function handleBulkArchive() {
    setBulkBusy(true);
    try {
      for (const project of selectedProjects) {
        // eslint-disable-next-line no-await-in-loop
        await studio.archiveProject(project);
      }
      show(`${selectedProjects.length} project${selectedProjects.length === 1 ? "" : "s"} archived.`);
      clearSelection();
    } catch (err) {
      show(err.message || "Couldn't archive every selected project.");
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleBulkDeleteConfirm() {
    setPendingBulkDelete(false);
    setBulkBusy(true);
    try {
      for (const project of selectedProjects) {
        // eslint-disable-next-line no-await-in-loop
        await studio.softDeleteProject(project);
      }
      show(`${selectedProjects.length} project${selectedProjects.length === 1 ? "" : "s"} deleted.`);
      clearSelection();
    } catch (err) {
      show(err.message || "Couldn't delete every selected project.");
    } finally {
      setBulkBusy(false);
    }
  }

  function renderColGroup() {
    return (
      <colgroup>
        <col style={{ width: SELECT_COL_WIDTH }} />
        {visibleFields.map((field) => (
          <col key={field.id} data-field-col={field.id} style={{ width: widthFor(field) }} />
        ))}
        <col style={{ width: ADD_COL_WIDTH }} />
      </colgroup>
    );
  }

  function renderHeaderRow() {
    return (
      <tr>
        <th className="select-cell-header" />
        {visibleFields.map((field) => (
          <ColumnHeader
            key={field.id}
            field={field}
            studio={studio}
            isDragging={draggingId === field.id}
            isDropTarget={dropTargetId === field.id}
            stickyLeft={stickyLefts[field.id]}
            onDragStart={handleDragStart(field)}
            onDragOver={handleDragOver(field)}
            onDragLeave={handleDragLeave(field)}
            onDrop={handleDrop(field)}
            onDragEnd={handleDragEnd}
            onInsertAfter={handleInsertAfter}
            onDeleteRequest={setPendingFieldDelete}
            filter={columnFilters[field.id]}
            onFilterChange={handleFilterChange}
            sort={sort}
            onSortChange={handleSortChange}
            calculation={calculations[field.id]}
            onCalculationChange={handleCalculationChange}
            hidden={false}
            onToggleHide={onToggleHide}
            wrapped={wrappedFields.has(field.id)}
            onToggleWrap={handleToggleWrap}
            frozen={frozenFieldId === field.id}
            onToggleFreeze={handleToggleFreeze}
          />
        ))}
        <th className="studio-th-add">
          <button type="button" aria-label="Add property" onClick={(e) => openCreateMenu(e, visibleFields[visibleFields.length - 1]?.id)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
          </button>
        </th>
      </tr>
    );
  }

  function renderCalcFooter(projects) {
    const active = visibleFields.filter((f) => calculations[f.id]);
    if (!active.length) return null;
    return (
      <tr className="studio-calc-row">
        <td className="select-cell" />
        {visibleFields.map((field) => (
          <td
            key={field.id}
            className={`${stickyLefts[field.id] !== undefined ? "studio-cell-sticky" : ""}${field.id === "title" ? " studio-td-title" : ""}`}
            style={stickyLefts[field.id] !== undefined ? { left: stickyLefts[field.id] } : undefined}
          >
            {calculations[field.id] ? <span className="studio-calc-value">{computeCalculation(projects, field, calculations[field.id], studio)}</span> : null}
          </td>
        ))}
        <td />
      </tr>
    );
  }

  function renderAddRow() {
    // No trailing <td> for the add-property column here (unlike the
    // header row and calc footer) — ProjectRow.jsx's ordinary data rows
    // already omit it the same way, which is why they never show the
    // empty bordered cell this row used to have under the "+" column.
    return (
      <tr className="studio-add-row" onClick={creating ? undefined : onNewProject} aria-disabled={creating}>
        <td className="select-cell" />
        {visibleFields.map((field) => (
          <td
            key={field.id}
            className={`cell-wrap${stickyLefts[field.id] !== undefined ? " studio-cell-sticky" : ""}${field.id === "title" ? " studio-td-title" : ""}`}
            style={stickyLefts[field.id] !== undefined ? { left: stickyLefts[field.id] } : undefined}
          >
            {field.id === "title" && (
              <span className="studio-add-row-cell">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
                {creating ? "Adding project…" : "Add project"}
              </span>
            )}
          </td>
        ))}
      </tr>
    );
  }

  return (
    <div className="studio-table-shell">
      {groups.length ? (
        groups.map((group) => (
          <MonthGroup
            key={group.key}
            monthKey={group.key}
            label={group.label}
            count={group.projects.length}
            collapsed={collapsedMonths.has(group.key)}
            onToggle={() => toggleMonth(group.key)}
          >
            <div className="dash-table-wrap studio-table-wrap">
              <table className="studio-table" style={{ width: totalTableWidth }}>
                {renderColGroup()}
                <thead>{renderHeaderRow()}</thead>
                <tbody>
                  {group.projects.map((project) => (
                    <ProjectRow
                      key={project.id}
                      project={project}
                      studio={studio}
                      fields={fieldsForRows}
                      selected={selected.has(project.id)}
                      onToggleSelect={toggleSelect}
                      onOpen={onOpen}
                    />
                  ))}
                  {renderCalcFooter(group.projects)}
                  {group.isCurrent && renderAddRow()}
                </tbody>
              </table>
            </div>
          </MonthGroup>
        ))
      ) : (
        <div className="panel">
          <div className="empty-state">
            <strong>No matching projects</strong>
            <span>Try a different search or filter.</span>
          </div>
        </div>
      )}

      <CreatePropertyMenu anchor={createAnchor} onClose={() => setCreateAnchor(null)} onCreate={handleCreateField} insertAfterId={insertAfterId} />

      <BulkActionBar
        count={selected.size}
        onMassEmail={handleMassEmail}
        onDuplicate={handleBulkDuplicate}
        onExport={handleExport}
        onArchive={handleBulkArchive}
        onDelete={() => setPendingBulkDelete(true)}
        onClose={clearSelection}
      />

      <Modal
        open={Boolean(pendingFieldDelete)}
        onClose={() => setPendingFieldDelete(null)}
        title={pendingFieldDelete ? `Delete "${pendingFieldDelete.name}"?` : ""}
        description="This removes the column and its values from every project. This can't be undone."
        actions={
          <>
            <button className="btn btn-ghost" type="button" onClick={() => setPendingFieldDelete(null)}>
              Cancel
            </button>
            <button className="btn" type="button" style={{ background: "var(--danger)", borderColor: "transparent", color: "#fff" }} onClick={handleDeleteFieldConfirm}>
              Delete
            </button>
          </>
        }
      />

      <Modal
        open={pendingBulkDelete}
        onClose={() => setPendingBulkDelete(false)}
        title={`Delete ${selected.size} project${selected.size === 1 ? "" : "s"}?`}
        description="This removes them from Ongoing Projects. Their history is kept, not destroyed."
        actions={
          <>
            <button className="btn btn-ghost" type="button" onClick={() => setPendingBulkDelete(false)}>
              Cancel
            </button>
            <button className="btn" type="button" disabled={bulkBusy} style={{ background: "var(--danger)", borderColor: "transparent", color: "#fff" }} onClick={handleBulkDeleteConfirm}>
              Delete
            </button>
          </>
        }
      />
    </div>
  );
}
