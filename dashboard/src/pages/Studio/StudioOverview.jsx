/*
 * Innov8 Studios — Studio "Overview" tab: metric cards, upcoming
 * milestones, and the active-projects shortlist. Ported from studio.js's
 * renderMetricCards/renderUpcoming(milestones)/renderOverviewActiveProjects
 * — the Bills/Meetings/Invoices mock tabs and the cross-project
 * activity/pending-replies feeds are not part of this stage (they were
 * mock data / extra queries beyond Stage 2's required feature list; see
 * src/data/studio.js's file header).
 */
import { daysUntil, formatDate, isOverdue, STATUS_BADGE } from "../../lib/format.js";

function emptyState(title, body) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  );
}

export default function StudioOverview({ studio, onOpen }) {
  const { projects, labelFor } = studio;

  const active = projects.filter((p) => !["Completed", "Archived"].includes(labelFor("status", p.statusId)));
  const overdueMilestones = projects.reduce(
    (sum, p) => sum + p.milestones.filter((m) => labelFor("milestoneStatus", m.statusId) !== "Completed" && isOverdue(m.dueDate)).length,
    0
  );
  const overdueProjects = active.filter((p) => isOverdue(p.deadline)).length;
  const milestonesDueSoon = projects.reduce(
    (sum, p) =>
      sum +
      p.milestones.filter((m) => {
        if (labelFor("milestoneStatus", m.statusId) === "Completed") return false;
        const d = daysUntil(m.dueDate);
        return d !== null && d >= 0 && d <= 7;
      }).length,
    0
  );
  const needsAttention = new Set();
  projects.forEach((p) => {
    const status = labelFor("status", p.statusId);
    if (status === "Stuck") needsAttention.add(p.id);
    if (!["Completed", "Archived"].includes(status) && isOverdue(p.deadline)) needsAttention.add(p.id);
    if (!p.team.length) needsAttention.add(p.id);
  });

  const cards = [
    { label: "Active projects", value: active.length },
    { label: "Milestones due", value: milestonesDueSoon },
    { label: "Overdue", value: overdueProjects + overdueMilestones },
    { label: "Needs attention", value: needsAttention.size }
  ];

  const upcomingMilestones = [];
  projects.forEach((p) =>
    p.milestones.forEach((m) => {
      if (labelFor("milestoneStatus", m.statusId) !== "Completed") upcomingMilestones.push({ project: p.title, milestone: m.title, dueDate: m.dueDate });
    })
  );
  upcomingMilestones.sort((a, b) => new Date(a.dueDate || "9999-12-31") - new Date(b.dueDate || "9999-12-31"));

  const activeShortlist = [...active].sort((a, b) => new Date(a.deadline || "9999-12-31") - new Date(b.deadline || "9999-12-31")).slice(0, 6);

  return (
    <>
      <section className="dash-stat-cards" aria-label="Studio metrics">
        {cards.map((c) => (
          <div key={c.label} className="panel dash-stat-card">
            <div>
              <strong>{c.value}</strong>
              <span className="dash-stat-label">{c.label}</span>
            </div>
          </div>
        ))}
      </section>

      <section className="dash-grid">
        <div className="dash-column">
          <div className="panel">
            <div className="panel-header">
              <h2>Upcoming milestones</h2>
            </div>
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Milestone</th>
                    <th>Due date</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingMilestones.length ? (
                    upcomingMilestones.slice(0, 8).map((r, i) => (
                      <tr key={i}>
                        <td className="dash-table-muted">{r.project}</td>
                        <td className="dash-table-muted">{r.milestone}</td>
                        <td className="dash-table-muted">{formatDate(r.dueDate)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3}>{emptyState("Nothing upcoming", "New milestones will appear here.")}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="dash-column">
          <div className="panel">
            <div className="panel-header">
              <h2>Active projects</h2>
            </div>
            <div className="dash-table-wrap">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Project</th>
                    <th>Status</th>
                    <th>Due date</th>
                  </tr>
                </thead>
                <tbody>
                  {activeShortlist.length ? (
                    activeShortlist.map((p) => {
                      const status = labelFor("status", p.statusId);
                      return (
                        <tr key={p.id} style={{ cursor: "pointer" }} onClick={() => onOpen(p.id)}>
                          <td className="dash-table-name">{p.title}</td>
                          <td>
                            <span className={`badge badge--${STATUS_BADGE[status] || "soon"}`}>{status || "—"}</span>
                          </td>
                          <td className="dash-table-muted">{formatDate(p.deadline)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={3}>{emptyState("No active projects", "Everything is completed or archived.")}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
