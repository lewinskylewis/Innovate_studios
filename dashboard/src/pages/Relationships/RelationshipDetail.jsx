/*
 * Innov8 Studios — relationship detail drawer. Adapts its "relationship
 * context" section to whichever type the record currently is (Contact /
 * Prospect / Lead / Client / Partner), and exposes the deliberate
 * conversion actions (Contact→Prospect, Prospect→Lead, Lead→Client,
 * any→Inactive) described in the module spec. Client → Projects is
 * read-only here: Studio owns project data, Relationships only
 * surfaces it (see mock `projects` on Client records).
 */
import { useState } from "react";
import { colorForName, initials } from "../../lib/avatar.js";
import { formatDate, formatMoney, PRIORITY_DOT } from "../../lib/format.js";
import { useToast } from "../../lib/ToastContext.jsx";
import { LEAD_STATUSES } from "./relationshipsMock.js";
import {
  statusLabel,
  statusBadgeClass,
  followupState,
  buildTimeline,
  totalProjectValue,
  activeProjects,
  completedProjects,
  PROJECT_STATUS_BADGE,
  formatServiceList
} from "./relationshipsFormat.js";

const INTERACTION_TYPES = ["Email", "Call", "Meeting", "Message", "Enquiry", "Outreach", "Note", "Other"];

const TIMELINE_ICON = {
  created: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  email: '<path d="M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z"/><path d="m3.5 7 8.5 6 8.5-6"/>',
  call: '<path d="M6 4h3l1.5 4-2 1.5a11 11 0 0 0 5 5l1.5-2 4 1.5v3a2 2 0 0 1-2 2C10 19 5 14 4 6a2 2 0 0 1 2-2z"/>',
  meeting: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.2c2.4.4 4.2 2.4 4.5 5.8"/>',
  message: '<path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"/>',
  enquiry: '<path d="M3 12h4l2 3h6l2-3h4"/><path d="M5 12 3 6a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1l-2 6"/><path d="M3 12v6a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-6"/>',
  outreach: '<path d="M3 10v4a1 1 0 0 0 1 1h2l1 5h2l-1-5h1l9 4V6l-9 4H4a1 1 0 0 0-1 1z"/><path d="M19 9.5v5"/>',
  followup: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  proposal: '<path d="M7 3.5h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1z"/><path d="M14 3.5v4h4"/>',
  project_started: '<rect x="3.5" y="5.5" width="17" height="15" rx="2"/><path d="M8 3.5v4"/><path d="M16 3.5v4"/><path d="M3.5 10.5h17"/>',
  project_completed: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.5l2.5 2.5 4.5-5"/>',
  status_change: '<rect x="4" y="12" width="3.2" height="8" rx="1"/><rect x="10.4" y="6" width="3.2" height="14" rx="1"/><rect x="16.8" y="9" width="3.2" height="11" rx="1"/>',
  note: '<path d="M5 4h11l3 3v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z"/><path d="M8 10h8"/><path d="M8 14h5"/>',
  other: '<circle cx="12" cy="12" r="8.5"/>'
};

function TimelineIcon({ kind }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: TIMELINE_ICON[kind] || TIMELINE_ICON.other }} />
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

export default function RelationshipDetail({ record, relationships, onClose }) {
  const { show } = useToast();
  const [note, setNote] = useState("");
  const [interactionType, setInteractionType] = useState("Call");
  const [interactionNote, setInteractionNote] = useState("");
  const [followUpDate, setFollowUpDate] = useState(record.nextFollowUp || "");
  const [followUpReason, setFollowUpReason] = useState(record.followUpReason || "");

  if (!record) return null;

  const fu = followupState(record);
  const timeline = buildTimeline(record).slice(0, 12);

  function handleAddNote(e) {
    e.preventDefault();
    const text = note.trim();
    if (!text) return;
    relationships.addNote(record.id, text);
    setNote("");
    show("Note added.");
  }

  function handleLogInteraction(e) {
    e.preventDefault();
    const description = interactionNote.trim();
    if (!description) return;
    relationships.logInteraction(record.id, { type: interactionType, description });
    setInteractionNote("");
    show("Interaction logged.");
  }

  function handleSaveFollowUp(e) {
    e.preventDefault();
    relationships.setFollowUp(record.id, { date: followUpDate, reason: followUpReason });
    show("Follow-up updated.");
  }

  function handleConvert(newType) {
    relationships.convertType(record.id, newType);
    show(`Converted to ${newType}.`);
  }

  function handleToggleActive() {
    if (record.active) {
      relationships.markInactive(record.id);
      show("Marked Inactive.");
    } else {
      relationships.reactivate(record.id);
      show("Reactivated.");
    }
  }

  const convertTarget = { Contact: "Prospect", Prospect: "Lead", Lead: "Client" }[record.type];

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
            <h2>{record.personName}</h2>
            <span className="badge badge--soon">{record.type}</span>
            <span className={`badge badge--${statusBadgeClass(record)}`}>{statusLabel(record)}</span>
          </div>
          <div className="detail-meta">
            {record.brandName && record.brandName !== record.personName && <span>{record.brandName}</span>}
            {record.role && <span>{record.role}</span>}
            {record.location && <span>{record.location}</span>}
          </div>
        </div>
        <div className="detail-actions">
          {convertTarget && (
            <button className="btn btn-primary" type="button" onClick={() => handleConvert(convertTarget)}>
              {record.type === "Lead" ? "Convert to Client" : `Mark as ${convertTarget}`}
            </button>
          )}
          <button className="btn btn-ghost" type="button" onClick={handleToggleActive}>
            {record.active ? "Mark Inactive" : "Reactivate"}
          </button>
        </div>
      </div>

      <div className="detail-section">
        <h3>Contact</h3>
        <div className="detail-row">
          <span className="avatar" style={{ background: colorForName(record.personName) }}>
            {initials(record.personName)}
          </span>
          <div className="detail-row-main">
            <strong>{record.personName}</strong>
            <span>{record.role || "—"}</span>
          </div>
        </div>
        <div className="detail-row">
          <div className="detail-row-main">
            <strong>Email</strong>
            <span>{record.email || "—"}</span>
          </div>
        </div>
        <div className="detail-row">
          <div className="detail-row-main">
            <strong>Phone</strong>
            <span>{record.phone || "—"}</span>
          </div>
        </div>
        <div className="detail-row">
          <div className="detail-row-main">
            <strong>Website</strong>
            <span>{record.website || "—"}</span>
          </div>
        </div>
      </div>

      <div className="detail-section">
        <h3>Classification</h3>
        <div className="detail-row">
          <span className="avatar" style={{ background: colorForName(record.owner || "?") }}>
            {initials(record.owner || "?")}
          </span>
          <div className="detail-row-main">
            <strong>Owner</strong>
            <span>{record.owner || "Unassigned"}</span>
          </div>
        </div>
        <div className="detail-row">
          <div className="detail-row-main">
            <strong>Source</strong>
            <span>{record.source || "—"}</span>
          </div>
        </div>
        <div className="detail-row">
          <div className="detail-row-main" style={{ width: "100%" }}>
            <strong>Tags</strong>
            <span style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap", marginTop: "0.375rem" }}>
              {record.tags && record.tags.length ? record.tags.map((t) => <span key={t} className="badge badge--waiting">{t}</span>) : "No tags"}
            </span>
          </div>
        </div>
      </div>

      {record.type === "Prospect" && (
        <div className="detail-section">
          <h3>Opportunity</h3>
          <div className="detail-row">
            <div className="detail-row-main">
              <strong>Potential service</strong>
              <span>{record.potentialService || "—"}</span>
            </div>
          </div>
          <div className="detail-row">
            <div className="detail-row-main">
              <strong>Interest level</strong>
              <span>{record.interestLevel}</span>
            </div>
          </div>
          <div className="detail-row">
            <span className={`status-dot status-dot--${PRIORITY_DOT[record.priority] || ""}`} />
            <div className="detail-row-main">
              <strong>Priority</strong>
              <span>{record.priority}</span>
            </div>
          </div>
        </div>
      )}

      {record.type === "Lead" && (
        <div className="detail-section">
          <h3>Opportunity</h3>
          <div className="detail-row">
            <div className="detail-row-main">
              <strong>Opportunity</strong>
              <span>{record.opportunity || "—"}</span>
            </div>
          </div>
          <div className="detail-row">
            <div className="detail-row-main">
              <strong>Service interested in</strong>
              <span>{record.serviceInterest || "—"}</span>
            </div>
          </div>
          <div className="detail-row">
            <div className="detail-row-main">
              <strong>Estimated value</strong>
              <span>{formatMoney(record.estimatedValue)}</span>
            </div>
          </div>
          <div className="detail-row">
            <div className="detail-row-main">
              <strong>Status</strong>
              <select className="input select" value={record.status} onChange={(e) => relationships.updateLeadStatus(record.id, e.target.value)} style={{ marginTop: "0.375rem", maxWidth: "12rem" }}>
                {LEAD_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="detail-row">
            <span className={`status-dot status-dot--${PRIORITY_DOT[record.priority] || ""}`} />
            <div className="detail-row-main">
              <strong>Priority</strong>
              <span>{record.priority}</span>
            </div>
          </div>
        </div>
      )}

      {record.type === "Client" && (
        <div className="detail-section">
          <h3>Client relationship</h3>
          <div className="detail-row">
            <div className="detail-row-main">
              <strong>Services used</strong>
              <span>{formatServiceList(record.servicesUsed)}</span>
            </div>
          </div>
          <div className="detail-row">
            <div className="detail-row-main">
              <strong>Client since</strong>
              <span>{formatDate(record.clientSince)}</span>
            </div>
          </div>
          <div className="detail-row">
            <div className="detail-row-main">
              <strong>Relationship health</strong>
              <select className="input select" value={record.relationshipHealth} onChange={(e) => relationships.updateClientHealth(record.id, e.target.value)} style={{ marginTop: "0.375rem", maxWidth: "12rem" }}>
                {["Healthy", "At Risk", "Inactive"].map((h) => (
                  <option key={h} value={h}>
                    {h}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="detail-row">
            <div className="detail-row-main">
              <strong>Total project value</strong>
              <span>{formatMoney(totalProjectValue(record))}</span>
            </div>
          </div>

          <h3 style={{ marginTop: "var(--space-4)" }}>Active Projects</h3>
          {activeProjects(record).length ? (
            activeProjects(record).map((p) => (
              <div key={p.id} className="detail-row">
                <div className="detail-row-main">
                  <strong>{p.name}</strong>
                  <span>
                    {formatDate(p.startDate)} – {formatDate(p.endDate)} · {formatMoney(p.value)}
                  </span>
                </div>
                <span className={`badge badge--${PROJECT_STATUS_BADGE[p.status] || "soon"}`}>{p.status}</span>
              </div>
            ))
          ) : (
            emptyState("No active projects", "This client has no active Studio projects right now.")
          )}

          <h3 style={{ marginTop: "var(--space-4)" }}>Completed Projects</h3>
          {completedProjects(record).length ? (
            completedProjects(record).map((p) => (
              <div key={p.id} className="detail-row">
                <div className="detail-row-main">
                  <strong>{p.name}</strong>
                  <span>
                    {formatDate(p.startDate)} – {formatDate(p.endDate)} · {formatMoney(p.value)}
                  </span>
                </div>
                <span className={`badge badge--${PROJECT_STATUS_BADGE[p.status] || "soon"}`}>{p.status}</span>
              </div>
            ))
          ) : (
            emptyState("No completed projects", "Finished Studio projects for this client will appear here.")
          )}
        </div>
      )}

      {record.type === "Partner" && (
        <div className="detail-section">
          <h3>Partnership</h3>
          <div className="detail-row">
            <div className="detail-row-main">
              <strong>Partner type</strong>
              <span>{record.partnerType}</span>
            </div>
          </div>
          <div className="detail-row">
            <div className="detail-row-main">
              <strong>Capabilities</strong>
              <span>{formatServiceList(record.capabilities)}</span>
            </div>
          </div>
        </div>
      )}

      {record.originContext && (
        <div className="detail-section">
          <h3>Origin</h3>
          {record.originContext.kind === "enquiry" ? (
            <>
              <div className="detail-row">
                <div className="detail-row-main">
                  <strong>Enquiry date</strong>
                  <span>{formatDate(record.originContext.date)}</span>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-row-main">
                  <strong>Subject</strong>
                  <span>{record.originContext.subject}</span>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-row-main">
                  <strong>Service requested</strong>
                  <span>{record.originContext.service}</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="detail-row">
                <div className="detail-row-main">
                  <strong>Campaign</strong>
                  <span>{record.originContext.campaign}</span>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-row-main">
                  <strong>Last outreach</strong>
                  <span>{formatDate(record.originContext.lastOutreach)}</span>
                </div>
              </div>
              <div className="detail-row">
                <div className="detail-row-main">
                  <strong>Outreach status</strong>
                  <span>{record.originContext.status}</span>
                </div>
              </div>
              {record.originContext.response && (
                <div className="detail-row">
                  <div className="detail-row-main">
                    <strong>Response</strong>
                    <span>{record.originContext.response}</span>
                  </div>
                </div>
              )}
              <div className="detail-row">
                <div className="detail-row-main">
                  <strong>Next action</strong>
                  <span>{record.originContext.nextAction}</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

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
            <span>{record.nextFollowUp ? `${formatDate(record.nextFollowUp)} — ${record.followUpReason || "No reason set"}` : "No follow-up scheduled"}</span>
          </div>
        </div>
        <form className="field-grid" onSubmit={handleSaveFollowUp} style={{ marginTop: "0.75rem" }}>
          <div className="field">
            <label className="field-label" htmlFor="followup-date">
              Follow-up date
            </label>
            <input className="input" id="followup-date" type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="followup-reason">
              Reason
            </label>
            <input className="input" id="followup-reason" type="text" placeholder="e.g. Send proposal" value={followUpReason} onChange={(e) => setFollowUpReason(e.target.value)} />
          </div>
          <button className="btn" type="submit" style={{ gridColumn: "1 / -1", justifySelf: "start" }}>
            Save follow-up
          </button>
        </form>
      </div>

      <div className="detail-section">
        <h3>Activity</h3>
        {timeline.length ? (
          <>
            {timeline.map((item) => (
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
            ))}
          </>
        ) : (
          emptyState("No activity yet", "Interactions, notes, and status changes will appear here.")
        )}

        <form className="note-composer" onSubmit={handleLogInteraction} style={{ marginTop: "var(--space-3)" }}>
          <select className="input select" value={interactionType} onChange={(e) => setInteractionType(e.target.value)} style={{ maxWidth: "8.5rem" }}>
            {INTERACTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input className="input" type="text" placeholder="Log an interaction…" value={interactionNote} onChange={(e) => setInteractionNote(e.target.value)} required />
          <button className="btn" type="submit">
            Log
          </button>
        </form>
      </div>

      <div className="detail-section">
        <h3>Notes</h3>
        {record.notes.length ? (
          record.notes
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
