/*
 * Innov8 Studios — enquiry detail drawer. Mirrors the shape of
 * Relationships' RelationshipDetail.jsx: identity, the enquiry itself,
 * qualification, follow-up, a merged activity timeline, and notes —
 * plus the one thing unique to Enquiries, the Relationship handoff
 * (section 10 of the module spec): a clear "Not converted" vs
 * "Converted → {type}" state, and the Convert action that produces it.
 * Conversion is local/mock only — it records which Relationship type
 * the enquiry became, it does not create or link an actual
 * Relationships record (that's a future backend concern).
 */
import { useState } from "react";
import { colorForName, initials } from "../../lib/avatar.js";
import { formatDate, formatMoney, PRIORITY_DOT } from "../../lib/format.js";
import { useToast } from "../../lib/ToastContext.jsx";
import { TEAM, STATUSES, CONVERSION_TYPES } from "./enquiriesMock.js";
import { STATUS_BADGE, CONVERSION_BADGE, followupState, buildTimeline, formatServiceList } from "./enquiriesFormat.js";

const TIMELINE_ICON = {
  received: '<path d="M3 12h4l2 3h6l2-3h4"/><path d="M5 12 3 6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1l-2 6"/><path d="M3 12v6a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6"/>',
  contacted: '<path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>',
  qualifying: '<circle cx="12" cy="12" r="8.5"/><path d="M9.5 9.5a2.5 2.5 0 0 1 4.9.8c0 1.7-2.4 1.9-2.4 3.5"/><path d="M12 16.8h.01"/>',
  qualified: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
  status: '<rect x="4" y="12" width="3.2" height="8" rx="1"/><rect x="10.4" y="6" width="3.2" height="14" rx="1"/><rect x="16.8" y="9" width="3.2" height="11" rx="1"/>',
  followup: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  converted: '<path d="M3 10v4a1 1 0 0 0 1 1h2l1 5h2l-1-5h1l9 4V6l-9 4H4a1 1 0 0 0-1 1z"/><path d="M19 9.5v5"/>',
  closed: '<circle cx="12" cy="12" r="8.5"/><path d="M9 9l6 6"/><path d="M15 9l-6 6"/>',
  note: '<path d="M5 4h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M8 10h8"/><path d="M8 14h5"/>'
};

function TimelineIcon({ kind }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: TIMELINE_ICON[kind] || TIMELINE_ICON.note }} />
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

const MANUAL_STATUSES = STATUSES.filter((s) => s !== "Converted");

export default function EnquiryDetail({ enquiry, enquiries, onClose }) {
  const { show } = useToast();
  const [note, setNote] = useState("");
  const [followUpDate, setFollowUpDate] = useState(enquiry.nextFollowUp || "");
  const [followUpNote, setFollowUpNote] = useState(enquiry.followUpNote || "");
  const [estimatedValue, setEstimatedValue] = useState(enquiry.estimatedValue ?? "");
  const [desiredTimeline, setDesiredTimeline] = useState(enquiry.desiredTimeline || "");
  const [qualificationNotes, setQualificationNotes] = useState(enquiry.qualificationNotes || "");

  if (!enquiry) return null;

  const fu = followupState(enquiry);
  const timeline = buildTimeline(enquiry).slice(0, 12);
  const converted = Boolean(enquiry.conversion);

  function handleAddNote(e) {
    e.preventDefault();
    const text = note.trim();
    if (!text) return;
    enquiries.addNote(enquiry.id, text);
    setNote("");
    show("Note added.");
  }

  function handleSaveFollowUp(e) {
    e.preventDefault();
    enquiries.setFollowUp(enquiry.id, { date: followUpDate, note: followUpNote });
    show("Follow-up updated.");
  }

  function handleCompleteFollowUp() {
    enquiries.completeFollowUp(enquiry.id);
    setFollowUpDate("");
    setFollowUpNote("");
    show("Follow-up marked complete.");
  }

  function handleSaveQualification(e) {
    e.preventDefault();
    enquiries.updateQualification(enquiry.id, {
      estimatedValue: estimatedValue === "" ? null : Number(estimatedValue),
      desiredTimeline,
      qualificationNotes
    });
    show("Qualification updated.");
  }

  function handleConvert(type) {
    enquiries.convertEnquiry(enquiry.id, type);
    show(`Converted to ${type}. A ${type} record now exists in Relationships.`);
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
        <div style={{ width: "100%" }}>
          <div className="detail-title-row" style={{ display: "flex", alignItems: "center", gap: "0.625rem", flexWrap: "wrap" }}>
            <h2>{enquiry.personName}</h2>
            <span className={`badge badge--${STATUS_BADGE[enquiry.status] || "soon"}`}>{enquiry.status}</span>
            {converted && <span className={`badge badge--${CONVERSION_BADGE[enquiry.conversion.type] || "active"}`}>→ {enquiry.conversion.type}</span>}
          </div>
          <div className="detail-meta">
            <span>{enquiry.brandName}</span>
            <span>
              <span className={`status-dot status-dot--${PRIORITY_DOT[enquiry.priority] || ""}`} /> {enquiry.priority}
            </span>
            {enquiry.location && <span>{enquiry.location}</span>}
          </div>
        </div>
        {!converted && (
          <div className="detail-actions">
            <select className="input select" value={enquiry.status} onChange={(e) => enquiries.updateStatus(enquiry.id, e.target.value)} style={{ maxWidth: "10rem" }}>
              {MANUAL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="detail-section">
        <h3>Identity</h3>
        <div className="detail-row">
          <span className="avatar" style={{ background: colorForName(enquiry.personName) }}>
            {initials(enquiry.personName)}
          </span>
          <div className="detail-row-main">
            <strong>{enquiry.personName}</strong>
            <span>{enquiry.brandName}</span>
          </div>
        </div>
        <div className="detail-row">
          <div className="detail-row-main">
            <strong>Email</strong>
            <span>{enquiry.email || "—"}</span>
          </div>
        </div>
        <div className="detail-row">
          <div className="detail-row-main">
            <strong>Phone</strong>
            <span>{enquiry.phone || "—"}</span>
          </div>
        </div>
        <div className="detail-row">
          <div className="detail-row-main">
            <strong>Location</strong>
            <span>{enquiry.location || "—"}</span>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <h3>Enquiry</h3>
        <p className="detail-description">{enquiry.message || "No message provided."}</p>
        <div className="detail-row">
          <div className="detail-row-main">
            <strong>Services requested</strong>
            <span>{formatServiceList(enquiry.services)}</span>
          </div>
        </div>
        <div className="detail-row">
          <div className="detail-row-main">
            <strong>Source</strong>
            <span>{enquiry.source}{enquiry.originCampaign ? ` — ${enquiry.originCampaign}` : ""}</span>
          </div>
        </div>
        <div className="detail-row">
          <div className="detail-row-main">
            <strong>Date received</strong>
            <span>{formatDate(enquiry.dateReceived)}</span>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <h3>Qualification</h3>
        <div className="detail-row">
          <span className="avatar" style={{ background: colorForName(enquiry.owner || "?") }}>
            {initials(enquiry.owner || "?")}
          </span>
          <div className="detail-row-main">
            <strong>Owner</strong>
            <select className="input select" value={enquiry.owner || ""} onChange={(e) => enquiries.reassignOwner(enquiry.id, e.target.value)} style={{ marginTop: "0.375rem", maxWidth: "12rem" }}>
              {TEAM.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <form className="field-grid" onSubmit={handleSaveQualification} style={{ marginTop: "0.5rem" }}>
          <div className="field">
            <label className="field-label" htmlFor="enq-value">
              Estimated value (KES)
            </label>
            <input className="input" id="enq-value" type="number" min="0" placeholder="e.g. 350000" value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="enq-timeline">
              Desired timeline
            </label>
            <input className="input" id="enq-timeline" type="text" placeholder="e.g. Launch in October" value={desiredTimeline} onChange={(e) => setDesiredTimeline(e.target.value)} />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label className="field-label" htmlFor="enq-qual-notes">
              Qualification notes
            </label>
            <textarea className="input" id="enq-qual-notes" rows={2} placeholder="Budget, fit, decision-maker…" value={qualificationNotes} onChange={(e) => setQualificationNotes(e.target.value)} />
          </div>
          <button className="btn" type="submit" style={{ gridColumn: "1 / -1", justifySelf: "start" }}>
            Save qualification
          </button>
        </form>
        {enquiry.estimatedValue != null && (
          <div className="detail-row" style={{ marginTop: "0.5rem" }}>
            <div className="detail-row-main">
              <strong>Current estimated value</strong>
              <span>{formatMoney(enquiry.estimatedValue)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="detail-section">
        <h3>Relationship</h3>
        {converted ? (
          <>
            <div className="detail-row">
              <div className="detail-row-main">
                <strong>Converted → {enquiry.conversion.type}</strong>
                <span>
                  {enquiry.conversion.brandName} · {formatDate(enquiry.conversion.date)}
                </span>
              </div>
            </div>
            <div className="detail-row">
              <div className="detail-row-main">
                <strong>Relationship owner</strong>
                <span>{enquiry.conversion.owner || "Unassigned"}</span>
              </div>
            </div>
            <p className="detail-description">This enquiry is now tracked as a {enquiry.conversion.type} in Relationships — it no longer moves through the Enquiries funnel.</p>
          </>
        ) : (
          <>
            <p className="detail-description">Not converted. Converting creates the corresponding Relationship record and moves this enquiry out of the intake funnel.</p>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
              {CONVERSION_TYPES.map((t) => (
                <button key={t} className="btn btn-ghost" type="button" onClick={() => handleConvert(t)}>
                  Convert to {t}
                </button>
              ))}
            </div>
          </>
        )}
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
            <span>{enquiry.nextFollowUp ? `${formatDate(enquiry.nextFollowUp)} — ${enquiry.followUpNote || "No note"}` : "No follow-up scheduled"}</span>
          </div>
          {enquiry.nextFollowUp && (
            <button className="btn btn-ghost" type="button" onClick={handleCompleteFollowUp}>
              Mark complete
            </button>
          )}
        </div>
        <form className="field-grid" onSubmit={handleSaveFollowUp} style={{ marginTop: "0.75rem" }}>
          <div className="field">
            <label className="field-label" htmlFor="enq-followup-date">
              Follow-up date
            </label>
            <input className="input" id="enq-followup-date" type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="enq-followup-note">
              Note
            </label>
            <input className="input" id="enq-followup-note" type="text" placeholder="e.g. Send proposal" value={followUpNote} onChange={(e) => setFollowUpNote(e.target.value)} />
          </div>
          <button className="btn" type="submit" style={{ gridColumn: "1 / -1", justifySelf: "start" }}>
            Save follow-up
          </button>
        </form>
      </div>

      <div className="detail-section">
        <h3>Activity</h3>
        {timeline.length ? (
          timeline.map((item) => (
            <div key={item.id} className="timeline-item">
              <span className="timeline-icon">
                <TimelineIcon kind={item.kind} />
              </span>
              <div className="timeline-body">
                <p>{item.label}</p>
                <time>
                  {formatDate(item.date)}
                  {item.meta ? ` · ${item.meta}` : ""}
                </time>
              </div>
            </div>
          ))
        ) : (
          emptyState("No activity yet", "Contact, notes, and status changes will appear here.")
        )}
      </div>

      <div className="detail-section">
        <h3>Notes</h3>
        {enquiry.notes.length ? (
          enquiry.notes
            .slice()
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .map((n) => (
              <div key={n.id} className="comment-item is-studio">
                <span className="avatar" style={{ background: colorForName(n.author || "?") }}>
                  {initials(n.author || "?")}
                </span>
                <div className="comment-body">
                  <div className="comment-head">
                    <strong>{n.author || "Team"}</strong>
                    <time>{formatDate(n.date)}</time>
                  </div>
                  <p>{n.text}</p>
                </div>
              </div>
            ))
        ) : (
          emptyState("No notes yet", "Add a note to start the record.")
        )}
        <form className="note-composer" onSubmit={handleAddNote}>
          <input className="input" type="text" placeholder="Add a note…" value={note} onChange={(e) => setNote(e.target.value)} required />
          <button className="btn" type="submit">
            Add Note
          </button>
        </form>
      </div>
    </>
  );
}
