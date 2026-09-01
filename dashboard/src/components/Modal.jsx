/*
 * Innov8 Studios — generic centered modal, ported from shell.js's
 * openModal()/closeAllModals() + dashboard.css's .dash-modal. Renders
 * nothing (not even the scrim) when closed, rather than the legacy
 * always-in-the-DOM-but-hidden approach — simpler in React since there's
 * no risk of stale event listeners on a hidden node.
 */
export default function Modal({ open, onClose, title, description, actions, children, ariaLabel }) {
  if (!open) return null;

  return (
    <>
      <div className="dash-modal glass-surface is-open" role="dialog" aria-modal="true" aria-label={ariaLabel || title}>
        {(title || onClose) && (
          <div className="dash-modal-header">
            <div>
              {title && <h2>{title}</h2>}
              {description && <p>{description}</p>}
            </div>
            {onClose && (
              <button className="icon-btn" type="button" onClick={onClose} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 6l12 12" />
                  <path d="M18 6 6 18" />
                </svg>
              </button>
            )}
          </div>
        )}
        {children}
        {actions && <div className="dash-modal-actions">{actions}</div>}
      </div>
      <div data-scrim className="is-open" onClick={onClose} />
    </>
  );
}
