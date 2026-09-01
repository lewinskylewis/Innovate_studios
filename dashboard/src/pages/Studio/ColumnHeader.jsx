/*
 * Innov8 Studios — one Ongoing Projects column header: type icon,
 * drag-reorder, resize handle, and the ColumnMenu (rename / change type
 * / filter / sort / calculate / freeze / hide / wrap / insert /
 * duplicate / delete). Ported from studio.js's renderHeaderRow()/
 * openColumnMenu()/column resize+drag wiring, now metadata-driven by
 * propertyTypes.js.
 *
 * Resize drags the <col> element (matched by data-field-col) rather
 * than this <th>'s own width — see StudioTable.jsx's renderColGroup()
 * for why: under `table-layout: fixed` the colgroup is authoritative,
 * so mutating the <th> style here would have no visual effect. Every
 * month group renders its own <table>, so the drag updates the
 * matching <col> in all of them at once, keeping every group's table in
 * sync while the mouse moves.
 */
import { useState } from "react";
import Popover from "../../components/Popover.jsx";
import { useToast } from "../../lib/ToastContext.jsx";
import ColumnMenu from "./ColumnMenu.jsx";
import { PROPERTY_TYPE_ICONS, effectiveType } from "./propertyTypes.js";

export default function ColumnHeader({
  field,
  studio,
  isDragging,
  isDropTarget,
  stickyLeft,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onInsertAfter,
  onDeleteRequest,
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
  onToggleFreeze
}) {
  const { show } = useToast();
  const [anchor, setAnchor] = useState(null);

  function startResize(e) {
    e.preventDefault();
    e.stopPropagation();
    const cols = document.querySelectorAll(`.studio-table col[data-field-col="${field.id}"]`);
    if (!cols.length) return;
    const tables = document.querySelectorAll("table.studio-table");
    const startWidth = field.width || (field.id === "title" ? 240 : 170);
    const startTableWidth = tables[0] ? tables[0].getBoundingClientRect().width : 0;
    const startX = e.clientX;

    function onMove(ev) {
      const delta = ev.clientX - startX;
      const w = Math.max(70, startWidth + delta);
      cols.forEach((col) => {
        col.style.width = `${w}px`;
      });
      // The table's own width is what makes table-layout:fixed treat the
      // colgroup widths above as authoritative instead of redistributing
      // them to fit the container — grow it by the same delta live so the
      // resized column (and the scrollable area) actually expand while
      // dragging, not just once the write below round-trips.
      tables.forEach((t) => {
        t.style.width = `${startTableWidth + (w - startWidth)}px`;
      });
    }
    async function onUp(ev) {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      const w = Math.max(70, startWidth + (ev.clientX - startX));
      try {
        await studio.resizeField(field, w);
      } catch (err) {
        console.error("[studio] resizeField failed", err);
        show(err.message || "Couldn't save that column width.");
      }
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  return (
    <th
      draggable
      data-field-th={field.id}
      className={`${stickyLeft !== undefined ? "studio-cell-sticky studio-th-sticky" : ""} ${field.id === "title" ? "studio-th-title" : ""} ${isDragging ? "is-dragging" : ""} ${isDropTarget ? "is-drop-target" : ""}`}
      style={stickyLeft !== undefined ? { left: stickyLeft } : undefined}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div className="th-inner">
        <span className="th-type-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: PROPERTY_TYPE_ICONS[effectiveType(field)] || "" }} />
        </span>
        <span
          className="th-label"
          onClick={(e) => {
            e.stopPropagation();
            setAnchor(e.currentTarget);
          }}
        >
          {field.name}
        </span>
      </div>
      <span className="col-resize-handle" onMouseDown={startResize} />

      <Popover anchor={anchor} onClose={() => setAnchor(null)} width={230} className="column-menu-popover">
        <ColumnMenu
          field={field}
          studio={studio}
          onClose={() => setAnchor(null)}
          filter={filter}
          onFilterChange={onFilterChange}
          sort={sort}
          onSortChange={onSortChange}
          calculation={calculation}
          onCalculationChange={onCalculationChange}
          hidden={hidden}
          onToggleHide={onToggleHide}
          wrapped={wrapped}
          onToggleWrap={onToggleWrap}
          frozen={frozen}
          onToggleFreeze={onToggleFreeze}
          onInsertAfter={onInsertAfter}
          onDeleteRequest={onDeleteRequest}
        />
      </Popover>
    </th>
  );
}
