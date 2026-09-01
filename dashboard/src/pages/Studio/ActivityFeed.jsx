/*
 * Innov8 Studios — the read-only Activity log: every project_activity
 * row (see src/data/studio.js's loadProjectActivity — each one comes
 * from a database trigger, this app never inserts one). Shown in full
 * to both Studio and Client Preview — the only things that differ
 * between the two views are handled elsewhere (Comments.jsx is
 * Studio-only; FilesSection.jsx offers Download instead of upload/
 * delete for the client).
 */
import { relativeTime } from "../../lib/format.js";

const ACTIVITY_ICON = {
  project_created: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  status_changed: (
    <>
      <rect x="4" y="12" width="3.2" height="8" rx="1" />
      <rect x="10.4" y="6" width="3.2" height="14" rx="1" />
      <rect x="16.8" y="9" width="3.2" height="11" rx="1" />
    </>
  ),
  priority_changed: (
    <>
      <rect x="4" y="12" width="3.2" height="8" rx="1" />
      <rect x="10.4" y="6" width="3.2" height="14" rx="1" />
      <rect x="16.8" y="9" width="3.2" height="11" rx="1" />
    </>
  ),
  milestone_created: (
    <>
      <rect x="3.5" y="5.5" width="17" height="15" rx="2" />
      <path d="M8 3.5v4" />
      <path d="M16 3.5v4" />
      <path d="M3.5 10.5h17" />
    </>
  ),
  milestone_completed: (
    <>
      <rect x="3.5" y="5.5" width="17" height="15" rx="2" />
      <path d="M8 3.5v4" />
      <path d="M16 3.5v4" />
      <path d="M3.5 10.5h17" />
    </>
  ),
  assignment_changed: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M15.5 14.2c2.4.4 4.2 2.4 4.5 5.8" />
    </>
  ),
  file_uploaded: (
    <>
      <path d="M7 3.5h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1z" />
      <path d="M14 3.5v4h4" />
    </>
  ),
  file_downloaded: (
    <>
      <path d="M12 15.5V5.5" />
      <path d="M7.5 11 12 15.5 16.5 11" />
      <path d="M5 16.5v2a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2" />
    </>
  ),
  comment_added: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9z" />
      <path d="M9.5 17a2.5 2.5 0 0 0 5 0" />
    </>
  )
};

function ActivityIcon({ type }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ACTIVITY_ICON[type] || ACTIVITY_ICON.comment_added}
    </svg>
  );
}

export default function ActivityFeed({ project }) {
  const items = [...project.activity].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (!items.length) {
    return (
      <div className="empty-state">
        <strong>No activity yet</strong>
        <span>Updates, files, and status changes will show up here.</span>
      </div>
    );
  }

  return (
    <>
      {items.map((item) => (
        <div key={item.id} className="timeline-item">
          <span className="timeline-icon">
            <ActivityIcon type={item.type} />
          </span>
          <div className="timeline-body">
            <p>{item.description}</p>
            <time>{relativeTime(item.createdAt)}</time>
          </div>
        </div>
      ))}
    </>
  );
}
