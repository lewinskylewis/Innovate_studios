/*
 * Innov8 Studios — "Share with client" modal, ported from studio.js's
 * openShareModal(). Generates the real, working public Client View URL
 * for this project — {PUBLIC_ORIGIN}/project/:publicSlug (see
 * pages/Studio/SharedProject.jsx + data/sharedProject.js for the
 * unauthenticated route that URL actually opens). Studio View sharing
 * was deliberately abandoned — this link always opens Client View, with
 * no mode to get wrong.
 *
 * PUBLIC_ORIGIN is the actual deployed Vercel URL — innov8.studio isn't
 * pointed at this deployment (or registered) yet. Swap this back to
 * https://innov8.studio once that domain's DNS is configured to point
 * here; dashboard/vercel.json's catch-all rewrite already makes
 * /project/:slug work correctly on direct load/refresh under either
 * domain, so no other change is needed when that happens.
 */
import Modal from "../../components/Modal.jsx";
import { useToast } from "../../lib/ToastContext.jsx";

const PUBLIC_ORIGIN = "https://innov8-dashboard.vercel.app";

export default function ShareModal({ open, onClose, project }) {
  const { show } = useToast();
  const link = project?.publicSlug ? `${PUBLIC_ORIGIN}/project/${project.publicSlug}` : "";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      // Clipboard unavailable — the link stays visible/selectable in the input.
    }
    show("Client link copied.");
  }

  return (
    <Modal open={open} onClose={onClose} title="Share with client" description="Copies the real client-access link for this Project.">
      {link ? (
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
      ) : (
        <div className="empty-state">
          <strong>No share link yet</strong>
          <span>This project doesn't have a public link yet — try reloading.</span>
        </div>
      )}
      <p className="field-label" style={{ marginBottom: "0.5rem" }}>
        What the client can see
      </p>
      <ul className="share-visibility-list">
        <li>Overview, progress &amp; milestones</li>
        <li>Client-visible files &amp; deliverables</li>
        {/* Comments were never client-visible (Comments.jsx never renders
            for Client Preview) — this list previously claimed otherwise
            even before this link was a real, working one. */}
        <li className="is-denied">Comments &amp; feedback</li>
        <li className="is-denied">Internal notes &amp; time tracking</li>
        <li className="is-denied">Team workload &amp; internal activity</li>
      </ul>
    </Modal>
  );
}
