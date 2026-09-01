/*
 * Innov8 Studios — "Log Outreach Activity" modal, ported from
 * marketing.html's #form-outreach-activity + marketing.js's submit
 * handler.
 */
import { useEffect, useState } from "react";
import Modal from "../../components/Modal.jsx";
import { useToast } from "../../lib/ToastContext.jsx";

export default function OutreachActivityModal({ open, onClose, marketing }) {
  const { show } = useToast();
  const [prospectId, setProspectId] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (open && marketing.prospects.length && !prospectId) setProspectId(marketing.prospects[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleSubmit(e) {
    e.preventDefault();
    const updated = marketing.logOutreachActivity(prospectId, note);
    setNote("");
    onClose();
    show(`Activity logged for "${updated?.business}".`);
  }

  return (
    <Modal open={open} onClose={onClose} title="Log Outreach Activity" description="Record a touchpoint with an existing prospect.">
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label className="field-label" htmlFor="activity-prospect">
            Prospect
          </label>
          <select className="input select" id="activity-prospect" value={prospectId} onChange={(e) => setProspectId(e.target.value)}>
            {marketing.prospects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.business}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="activity-note">
            What happened?
          </label>
          <input className="input" id="activity-note" type="text" placeholder="e.g. Sent portfolio via email" value={note} onChange={(e) => setNote(e.target.value)} required />
        </div>
        <div className="dash-modal-actions">
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" type="submit">
            Log activity
          </button>
        </div>
      </form>
    </Modal>
  );
}
