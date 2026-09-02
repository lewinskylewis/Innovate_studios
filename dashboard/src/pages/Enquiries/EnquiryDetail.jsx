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
 *
 * Everything below is scoped under the .enq-detail wrapper class so
 * its typography/sizing refinements never leak into Studio's
 * ProjectDetail or Relationships' RelationshipDetail — both share the
 * same generic .detail-drawer/.detail-section/.detail-row markup via
 * components/Drawer.jsx.
 */
import { useState } from "react";
import Popover, { usePopoverAnchor } from "../../components/Popover.jsx";
import { colorForName, initials } from "../../lib/avatar.js";
import { formatDate, formatMoney, PRIORITY_DOT } from "../../lib/format.js";
import { useToast } from "../../lib/ToastContext.jsx";
import { TEAM, SOURCES, SERVICES, PRIORITIES, CONVERSION_TYPES } from "./enquiriesMock.js";
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

/* The detail panel's "Enquiry status" control intentionally offers a
   smaller, relabeled set of options than the full lifecycle the table/
   badges use elsewhere (New/Contacted/Qualifying/Qualified/Converted/
   Closed stay exactly as they are everywhere else — see STATUS_BADGE,
   EnquiryList's filters, Overview's stats). "New" reads as
   "Not contacted" here only; writes still store "New" underneath, so
   nothing about the stored lifecycle values changes. If an enquiry is
   sitting in a status this control doesn't offer (e.g. "Qualifying",
   set from the table), its current value is shown as an extra option
   rather than silently reassigned. */
const ENQUIRY_STATUS_OPTIONS = ["Not contacted", "Contacted", "Qualified", "Closed"];
const STATUS_DB_TO_DISPLAY = { New: "Not contacted", Contacted: "Contacted", Qualified: "Qualified", Closed: "Closed" };
const STATUS_DISPLAY_TO_DB = { "Not contacted": "New", Contacted: "Contacted", Qualified: "Qualified", Closed: "Closed" };

function ServicesField({ value, onToggle }) {
  const { anchor, open, close } = usePopoverAnchor();

  return (
    <div className="field field--full">
      <span className="field-label">Services</span>
      <button type="button" className="input select enq-service-trigger" onClick={(e) => open(e.currentTarget)}>
        <span className={value.length ? "" : "cell-placeholder"}>{value.length ? value.join(", ") : "Select a service"}</span>
        <svg className="enq-service-chevron" viewBox="0 0 12 8" fill="none" aria-hidden="true">
          <path d="M1 1.5L6 6.5L11 1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>
      <Popover anchor={anchor} onClose={close} width={anchor?.offsetWidth || 320} className="enq-service-popover">
        <div className="popover-options-list">
          {SERVICES.map((s) => (
            <div key={s} className={`popover-option-row${value.includes(s) ? " is-selected" : ""}`} onClick={() => onToggle(s)}>
              <span className="option-label">{s}</span>
              {value.includes(s) && (
                <svg className="option-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12l4 4 10-10" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </Popover>
    </div>
  );
}

export default function EnquiryDetail({ enquiry, enquiries, onClose }) {
  const { show } = useToast();
  const [note, setNote] = useState("");
  const [followUpDate, setFollowUpDate] = useState(enquiry.nextFollowUp || "");
  const [followUpNote, setFollowUpNote] = useState(enquiry.followUpNote || "");
  const [estimatedValue, setEstimatedValue] = useState(enquiry.estimatedValue ?? "");
  const [desiredTimeline, setDesiredTimeline] = useState(enquiry.desiredTimeline || "");
  const [qualificationNotes, setQualificationNotes] = useState(enquiry.qualificationNotes || "");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!enquiry) return null;

  const fu = followupState(enquiry);
  const timeline = buildTimeline(enquiry).slice(0, 12);
  const converted = Boolean(enquiry.conversion);
  const statusDisplay = STATUS_DB_TO_DISPLAY[enquiry.status] || enquiry.status;

  function setDraftField(key, value) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function toggleDraftService(service) {
    setDraft((d) => ({ ...d, services: d.services.includes(service) ? d.services.filter((s) => s !== service) : [...d.services, service] }));
  }

  function startEdit() {
    setDraft({
      personName: enquiry.personName,
      brandName: enquiry.brandName,
      email: enquiry.email,
      phone: enquiry.phone,
      message: enquiry.message,
      services: enquiry.services,
      source: enquiry.source,
      priority: enquiry.priority
    });
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(null);
    setEditing(false);
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!draft.personName.trim()) {
      show("Name is required.");
      return;
    }
    setSaving(true);
    try {
      await enquiries.updateDetails(enquiry.id, { ...draft, personName: draft.personName.trim(), brandName: draft.brandName.trim() || draft.personName.trim() });
      setDraft(null);
      setEditing(false);
      show("Enquiry updated.");
    } catch (err) {
      show(err.message || "Couldn't save those changes — try again.");
    } finally {
      setSaving(false);
    }
  }

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

  async function handleDeleteEnquiry() {
    setDeleting(true);
    try {
      await enquiries.deleteEnquiry(enquiry.id);
      show("Enquiry deleted.");
      onClose();
    } catch (err) {
      show(err.message || "Couldn't delete that enquiry — try again.");
      setDeleting(false);
      setConfirmingDelete(false);
    }
  }

  return (
    <div className="enq-detail">
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
            <span className={`badge badge--${STATUS_BADGE[enquiry.status] || "soon"}`}>{statusDisplay}</span>
            {converted && <span className={`badge badge--${CONVERSION_BADGE[enquiry.conversion.type] || "active"}`}>→ {enquiry.conversion.type}</span>}
          </div>
          <div className="detail-meta">
            <span>{enquiry.brandName}</span>
            <span>
              <span className={`status-dot status-dot--${PRIORITY_DOT[enquiry.priority] || ""}`} /> {enquiry.priority}
            </span>
          </div>
        </div>
        <div className="detail-actions">
          {!converted && (
            <div className="field enq-status-field">
              <label className="field-label" htmlFor="enq-status">
                Enquiry status
              </label>
              <select id="enq-status" className="input select" value={statusDisplay} onChange={(e) => enquiries.updateStatus(enquiry.id, STATUS_DISPLAY_TO_DB[e.target.value] || e.target.value)}>
                {ENQUIRY_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                {!ENQUIRY_STATUS_OPTIONS.includes(statusDisplay) && <option value={statusDisplay}>{statusDisplay}</option>}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="detail-section">
        <div className="detail-section-head">
          <h3>Identity</h3>
          {!editing && (
            <button className="btn enq-edit-btn" type="button" onClick={startEdit}>
              Edit
            </button>
          )}
        </div>
        <div className="detail-row enq-identity-row">
          <span className="avatar" style={{ background: colorForName(enquiry.personName) }}>
            {initials(enquiry.personName)}
          </span>
          <div className="detail-row-main">
            <strong>{enquiry.personName}</strong>
            <span>{enquiry.brandName}</span>
          </div>
        </div>

        {editing ? (
          <div className="field-grid" style={{ marginTop: "0.75rem" }}>
            <div className="field">
              <label className="field-label" htmlFor="enq-edit-name">
                Name
              </label>
              <input className="input" id="enq-edit-name" type="text" value={draft.personName} onChange={(e) => setDraftField("personName", e.target.value)} required />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="enq-edit-brand">
                Brand / Company
              </label>
              <input className="input" id="enq-edit-brand" type="text" value={draft.brandName} onChange={(e) => setDraftField("brandName", e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="enq-edit-email">
                Email
              </label>
              <input className="input" id="enq-edit-email" type="email" value={draft.email} onChange={(e) => setDraftField("email", e.target.value)} />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="enq-edit-phone">
                Phone
              </label>
              <input className="input" id="enq-edit-phone" type="text" value={draft.phone} onChange={(e) => setDraftField("phone", e.target.value)} />
            </div>
          </div>
        ) : (
          <>
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
          </>
        )}
      </div>

      <div className="detail-section">
        <h3>Enquiry</h3>

        {editing ? (
          <>
            <div className="field">
              <label className="field-label" htmlFor="enq-edit-message">
                Enquiry / message
              </label>
              <textarea className="input" id="enq-edit-message" rows={3} value={draft.message} onChange={(e) => setDraftField("message", e.target.value)} />
            </div>
            <ServicesField value={draft.services} onToggle={toggleDraftService} />
            <div className="field-grid">
              <div className="field">
                <label className="field-label" htmlFor="enq-edit-source">
                  Source
                </label>
                <select className="input select" id="enq-edit-source" value={draft.source} onChange={(e) => setDraftField("source", e.target.value)}>
                  {SOURCES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field-label" htmlFor="enq-edit-priority">
                  Priority
                </label>
                <select className="input select" id="enq-edit-priority" value={draft.priority} onChange={(e) => setDraftField("priority", e.target.value)}>
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="detail-overview-actions">
              <button className="btn btn-ghost" type="button" onClick={cancelEdit} disabled={saving}>
                Cancel
              </button>
              <button className="btn btn-primary" type="button" onClick={saveEdit} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </>
        ) : (
          <>
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
                <strong>Priority</strong>
                <span>{enquiry.priority}</span>
              </div>
            </div>
            <div className="detail-row">
              <div className="detail-row-main">
                <strong>Date received</strong>
                <span>{formatDate(enquiry.dateReceived)}</span>
              </div>
            </div>
          </>
        )}
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

      <div className="detail-section enq-relationship-panel">
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
            <div className="enq-convert-actions">
              {CONVERSION_TYPES.map((t) => (
                <button key={t} className="btn enq-convert-btn" type="button" onClick={() => handleConvert(t)}>
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

      <div className="detail-section enq-delete-section">
        {confirmingDelete ? (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn" type="button" style={{ flex: 1 }} onClick={() => setConfirmingDelete(false)} disabled={deleting}>
              Cancel
            </button>
            <button className="btn" type="button" style={{ flex: 1, color: "#fff", background: "var(--danger)", borderColor: "transparent" }} onClick={handleDeleteEnquiry} disabled={deleting}>
              {deleting ? "Deleting…" : "Confirm delete"}
            </button>
          </div>
        ) : (
          <button className="btn" type="button" style={{ width: "100%", color: "var(--danger)", borderColor: "rgba(255,90,95,0.4)" }} onClick={() => setConfirmingDelete(true)}>
            Delete Enquiry
          </button>
        )}
      </div>
    </div>
  );
}
