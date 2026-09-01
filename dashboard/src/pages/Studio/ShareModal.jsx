/*
 * Innov8 Studios — "Share with client" modal, ported from studio.js's
 * openShareModal(). Presentation-only, exactly like the legacy
 * implementation: generates a mock client-access link and copies it to
 * the clipboard. There is no real client-facing backend for this link
 * yet (no client auth/role — see the architecture notes), so this stays
 * a visual prototype, matching the legacy page's own description.
 */
import Modal from "../../components/Modal.jsx";
import { useToast } from "../../lib/ToastContext.jsx";

export default function ShareModal({ open, onClose, project }) {
  const { show } = useToast();
  const link = project ? `https://innov8.studio/client/project/${project.id}` : "";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Clipboard unavailable — the link stays visible/selectable in the input.
    }
    show("Client link copied.");
  }

  return (
    <Modal open={open} onClose={onClose} title="Share with client" description="Generates a mock client-access link for this Project.">
      <div className="share-link-row">
        <input className="input" type="text" readOnly value={link} />
        <button className="btn btn-primary" type="button" onClick={handleCopy}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: "1rem", height: "1rem" }}>
            <path d="M9.5 14.5 14.5 9.5" />
            <path d="M11 6.5 12.7 4.8a3.6 3.6 0 0 1 5 5L16 11.5" />
            <path d="M13 17.5 11.3 19.2a3.6 3.6 0 0 1-5-5L8 12.5" />
          </svg>
          Copy
        </button>
      </div>
      <p className="field-label" style={{ marginBottom: "0.5rem" }}>
        What the client can see
      </p>
      <ul className="share-visibility-list">
        <li>Overview, progress &amp; milestones</li>
        <li>Client-visible files &amp; deliverables</li>
        <li>Comments &amp; feedback</li>
        <li className="is-denied">Internal notes &amp; time tracking</li>
        <li className="is-denied">Team workload &amp; internal activity</li>
      </ul>
    </Modal>
  );
}
