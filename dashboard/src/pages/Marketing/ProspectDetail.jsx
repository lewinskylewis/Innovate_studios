/*
 * Innov8 Studios — prospect detail drawer, ported from marketing.js's
 * buildProspectDetailHtml/wireProspectDetail.
 */
import { useState } from "react";
import { colorForName, initials } from "../../lib/avatar.js";
import { formatDate } from "../../lib/format.js";
import { MKT_STATUS_META } from "./marketingMock.js";
import { followupState } from "./marketingFormat.js";
import { useToast } from "../../lib/ToastContext.jsx";

export default function ProspectDetail({ prospect, marketing, onClose }) {
  const { show } = useToast();
  const [note, setNote] = useState("");

  if (!prospect) return null;
  const fu = followupState(prospect);

  function handleSubmit(e) {
    e.preventDefault();
    const label = note.trim();
    if (!label) return;
    marketing.addProspectNote(prospect.id, label);
    setNote("");
    show("Note added.");
  }

  return (
    <>
      <button className="icon-btn" type="button" onClick={onClose} aria-label="Close" style={{ position: "absolute", top: "1.25rem", right: "1.25rem" }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 6l12 12" />
          <path d="M18 6 6 18" />
        </svg>
      </button>

      <div className="detail-header">
        <div>
          <div className="detail-title-row">
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
        <h3>Contact</h3>
        <div className="detail-row">
          <span className="avatar" style={{ background: colorForName(prospect.contact.name) }}>
            {initials(prospect.contact.name)}
          </span>
          <div className="detail-row-main">
            <strong>{prospect.contact.name}</strong>
            <span>{prospect.contact.role}</span>
          </div>
        </div>
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
      </div>

      <div className="detail-section">
        <h3>Notes</h3>
        <p className="detail-description">{prospect.notes || "No notes yet."}</p>
      </div>

      <div className="detail-section">
        <h3>Next action</h3>
        <div className="detail-row">
          <span className="file-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 7.5V12l3 2" />
            </svg>
          </span>
          <div className="detail-row-main">
            <strong>{fu === "overdue" ? "Follow-up overdue" : "Follow up"}</strong>
            <span>{prospect.nextFollowUp ? formatDate(prospect.nextFollowUp) : "No follow-up scheduled"}</span>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <h3>Outreach history</h3>
        {prospect.history.length ? (
          <div className="milestone-timeline">
            {prospect.history.map((h, i) => (
              <div key={i} className="milestone-item is-complete">
                <span className="milestone-marker">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12l4 4 10-10" />
                  </svg>
                </span>
                <div className="milestone-head">
                  <strong>{h.label}</strong>
                  <span className="milestone-tags">{formatDate(h.date)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>No outreach logged yet</strong>
            <span>Add a note or log activity to start the history.</span>
          </div>
        )}
        <form className="note-composer" onSubmit={handleSubmit}>
          <input className="input" type="text" placeholder="Add a note…" value={note} onChange={(e) => setNote(e.target.value)} required />
          <button className="btn" type="submit">
            Add Note
          </button>
        </form>
      </div>
    </>
  );
}
