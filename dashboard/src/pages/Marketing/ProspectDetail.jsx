/*
 * Innov8 Studios — prospect detail drawer. Visually matches the
 * refined EnquiryDetail.jsx / RelationshipDetail.jsx pattern exactly —
 * scoped under .mkt-detail, which dashboard.css's combined Enquiry +
 * Relationship + Outreach detail-panel rule set now also styles (same
 * typography/control refinements, one shared rule set for all three).
 *
 * Contact info (business name, contact name, email, phone) and
 * Follow-up (date + reason) are the only editable fields, matching
 * Enquiry/Relationship's Edit → Save/Cancel language exactly. Both
 * reuse the existing, unmodified updateContactDetails() /
 * updateContactFollowUp() from data/relationships.js via
 * useOutreach.js's updateProspectDetails()/setFollowUp() — a Prospect
 * is a contacts row, so the same functions RelationshipDetail.jsx
 * already calls for the identical columns apply here unchanged. No new
 * Supabase query, no schema change. Industry / Service interest /
 * Channel / Notes / Outreach status have no update path anywhere in
 * the app (nothing this phase adds one for) and stay read-only, same
 * as before.
 */
import { useState } from "react";
import { colorForName, initials } from "../../lib/avatar.js";
import { formatDate } from "../../lib/format.js";
import { MKT_STATUS_META } from "./marketingMock.js";
import { followupState } from "./marketingFormat.js";
import { useToast } from "../../lib/ToastContext.jsx";

const HISTORY_ICON = '<path d="M3 10v4a1 1 0 0 0 1 1h2l1 5h2l-1-5h1l9 4V6l-9 4H4a1 1 0 0 0-1 1z"/><path d="M19 9.5v5"/>';

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: HISTORY_ICON }} />
  );
}

function emptyState(title, body) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  );
}

export default function ProspectDetail({ prospect, marketing, onClose }) {
  const { show } = useToast();
  const [note, setNote] = useState("");
  const [followUpDate, setFollowUpDate] = useState(prospect.nextFollowUp || "");
  const [followUpReason, setFollowUpReason] = useState(prospect.followUpReason || "");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);

  if (!prospect) return null;
  const fu = followupState(prospect);

  function setDraftField(key, value) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function startEdit() {
    setDraft({ business: prospect.business, contactName: prospect.contact.name, email: prospect.email, phone: prospect.phone });
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(null);
    setEditing(false);
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!draft.business.trim()) {
      show("Business name is required.");
      return;
    }
    setSaving(true);
    try {
      await marketing.updateProspectDetails(prospect.id, {
        personName: draft.contactName.trim(),
        brandName: draft.business.trim(),
        email: draft.email,
        phone: draft.phone
      });
      setDraft(null);
      setEditing(false);
      show("Prospect updated.");
    } catch (err) {
      show(err.message || "Couldn't save those changes — try again.");
    } finally {
      setSaving(false);
    }
  }

  function handleSubmitNote(e) {
    e.preventDefault();
    const label = note.trim();
    if (!label) return;
    marketing.addProspectNote(prospect.id, label);
    setNote("");
    show("Note added.");
  }

  function handleSaveFollowUp(e) {
    e.preventDefault();
    marketing.setFollowUp(prospect.id, { date: followUpDate, reason: followUpReason });
    show("Follow-up updated.");
  }

  return (
    <div className="mkt-detail">
      <button className="icon-btn" type="button" onClick={onClose} aria-label="Close" style={{ position: "absolute", top: "1.25rem", right: "1.25rem" }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 6l12 12" />
          <path d="M18 6 6 18" />
        </svg>
      </button>

      <div className="detail-header">
        <div style={{ width: "100%" }}>
          <div className="detail-title-row" style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexWrap: "wrap" }}>
            <h2>{prospect.business}</h2>
            <span className={`badge badge--${MKT_STATUS_META[prospect.status]?.badge || "soon"}`}>{prospect.status}</span>
          </div>
          <div className="detail-meta">
            <span>{prospect.industry}</span>
            <span>{prospect.serviceInterest}</span>
            <span>{prospect.channel}</span>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-head">
          <h3>Contact</h3>
          {!editing && (
            <button className="btn enq-edit-btn" type="button" onClick={startEdit}>
              Edit
            </button>
          )}
        </div>
        <div className="detail-row enq-identity-row">
          <span className="avatar" style={{ background: colorForName(prospect.contact.name || prospect.business) }}>
            {initials(prospect.contact.name || prospect.business)}
          </span>
          <div className="detail-row-main">
            <strong>{prospect.contact.name || "—"}</strong>
            <span>{prospect.contact.role || "—"}</span>
          </div>
        </div>

        {editing ? (
          <form onSubmit={saveEdit} style={{ marginTop: "0.75rem" }}>
            <div className="field-grid">
              <div className="field">
                <label className="field-label" htmlFor="mkt-edit-business">
                  Business name
                </label>
                <input className="input" id="mkt-edit-business" type="text" value={draft.business} onChange={(e) => setDraftField("business", e.target.value)} required />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="mkt-edit-contact">
                  Contact name
                </label>
                <input className="input" id="mkt-edit-contact" type="text" value={draft.contactName} onChange={(e) => setDraftField("contactName", e.target.value)} />
              </div>
            </div>
            <div className="field-grid">
              <div className="field">
                <label className="field-label" htmlFor="mkt-edit-email">
                  Email
                </label>
                <input className="input" id="mkt-edit-email" type="email" value={draft.email} onChange={(e) => setDraftField("email", e.target.value)} />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="mkt-edit-phone">
                  Phone
                </label>
                <input className="input" id="mkt-edit-phone" type="text" value={draft.phone} onChange={(e) => setDraftField("phone", e.target.value)} />
              </div>
            </div>
            <div className="detail-overview-actions">
              <button className="btn btn-ghost" type="button" onClick={cancelEdit} disabled={saving}>
                Cancel
              </button>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="detail-row">
              <div className="detail-row-main">
                <strong>Email</strong>
                <span>{prospect.email || "—"}</span>
              </div>
            </div>
            <div className="detail-row">
              <div className="detail-row-main">
                <strong>Phone</strong>
                <span>{prospect.phone || "—"}</span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="detail-section">
        <h3>Outreach</h3>
        <div className="detail-row">
          <div className="detail-row-main">
            <strong>Industry</strong>
            <span>{prospect.industry || "—"}</span>
          </div>
        </div>
        <div className="detail-row">
          <div className="detail-row-main">
            <strong>Service interest</strong>
            <span>{prospect.serviceInterest || "—"}</span>
          </div>
        </div>
        <div className="detail-row">
          <div className="detail-row-main">
            <strong>Channel</strong>
            <span>{prospect.channel || "—"}</span>
          </div>
        </div>
        <div className="detail-row">
          <div className="detail-row-main">
            <strong>Source</strong>
            <span>{prospect.source || "—"}</span>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <h3>Notes</h3>
        <p className="detail-description">{prospect.notes || "No notes yet."}</p>
      </div>

      <div className="detail-section">
        <h3>Follow-up</h3>
        <div className="detail-row">
          <span className="file-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 7.5V12l3 2" />
            </svg>
          </span>
          <div className="detail-row-main">
            <strong>{fu === "overdue" ? "Follow-up overdue" : "Next follow-up"}</strong>
            <span>{prospect.nextFollowUp ? `${formatDate(prospect.nextFollowUp)}${prospect.followUpReason ? ` — ${prospect.followUpReason}` : ""}` : "No follow-up scheduled"}</span>
          </div>
        </div>
        <form className="field-grid" onSubmit={handleSaveFollowUp} style={{ marginTop: "0.75rem" }}>
          <div className="field">
            <label className="field-label" htmlFor="mkt-followup-date">
              Follow-up date
            </label>
            <input className="input" id="mkt-followup-date" type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="mkt-followup-reason">
              Reason
            </label>
            <input className="input" id="mkt-followup-reason" type="text" placeholder="e.g. Send proposal" value={followUpReason} onChange={(e) => setFollowUpReason(e.target.value)} />
          </div>
          <button className="btn" type="submit" style={{ gridColumn: "1 / -1", justifySelf: "start" }}>
            Save follow-up
          </button>
        </form>
      </div>

      <div className="detail-section">
        <h3>Outreach history</h3>
        {prospect.history.length ? (
          prospect.history.map((h, i) => (
            <div key={i} className="timeline-item">
              <span className="timeline-icon">
                <HistoryIcon />
              </span>
              <div className="timeline-body">
                <p>{h.label}</p>
                <time>{formatDate(h.date)}</time>
              </div>
            </div>
          ))
        ) : (
          emptyState("No outreach logged yet", "Add a note or log activity to start the history.")
        )}
        <form className="note-composer" onSubmit={handleSubmitNote}>
          <input className="input" type="text" placeholder="Add a note…" value={note} onChange={(e) => setNote(e.target.value)} required />
          <button className="btn" type="submit">
            Add Note
          </button>
        </form>
      </div>
    </div>
  );
}
