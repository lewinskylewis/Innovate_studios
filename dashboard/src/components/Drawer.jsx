/*
 * Innov8 Studios — generic slide-over drawer, ported from shell.js's
 * openDetail()/closeDetail() + dashboard.css's .detail-drawer. Used by
 * the Studio project detail view; any future module can reuse it the
 * same way.
 */
export default function Drawer({ open, onClose, children, ariaLabel = "Detail" }) {
  return (
    <>
      <aside className={`detail-drawer glass-surface${open ? " is-open" : ""}`} aria-label={ariaLabel}>
        {open && children}
      </aside>
      <div data-scrim className={open ? "is-open" : ""} onClick={onClose} />
    </>
  );
}
