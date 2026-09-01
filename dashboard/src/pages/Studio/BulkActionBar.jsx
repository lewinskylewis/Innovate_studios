/*
 * Innov8 Studios — the floating bulk-action bar, shown when one or more
 * project rows are selected. Monday.com-style: bottom-fixed, compact,
 * never a modal, always leaves the table visible/usable.
 */
export default function BulkActionBar({ count, onMassEmail, onDuplicate, onExport, onArchive, onDelete, onClose }) {
  if (!count) return null;

  return (
    <div className="bulk-action-bar" role="toolbar" aria-label="Bulk project actions">
      <span className="bulk-action-count">
        {count} project{count === 1 ? "" : "s"} selected
      </span>
      <span className="bulk-action-sep" />
      <button type="button" onClick={onMassEmail}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4.5 7 7.5 6 7.5-6"/></svg>
        Mass email
      </button>
      <button type="button" onClick={onDuplicate}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="4" rx="1"/><path d="M4.5 9v9a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V9"/><path d="M10 13h4"/></svg>
        Duplicate
      </button>
      <button type="button" onClick={onExport}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7.5 10 4.5 5 4.5-5"/><path d="M4.5 19.5h15"/></svg>
        Export
      </button>
      <button type="button" onClick={onArchive}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3.5" y="5" width="17" height="4" rx="1"/><path d="M4.5 9v9a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V9"/><path d="M10 13h4"/></svg>
        Archive
      </button>
      <button type="button" className="is-danger" onClick={onDelete}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 7h14"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M7 7l1 12a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1l1-12"/></svg>
        Delete
      </button>
      <button type="button" className="bulk-action-close" aria-label="Clear selection" onClick={onClose}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 6l12 12"/><path d="M18 6 6 18"/></svg>
      </button>
    </div>
  );
}
