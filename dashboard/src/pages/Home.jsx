/*
 * Innov8 Studios — "/" route. Ported from legacy/index.html +
 * legacy/home.js. "Active work" (the stat card + the Active Work list,
 * src/data/home.js), "Recent enquiries" (useEnquiries.js) and the
 * Relationships panel's list (useRelationships.js) are real Supabase
 * data, each reusing the exact same hook its own module uses — no
 * second data layer for Home. Everything else (income, the other 3
 * stat cards, Website Analytics, Activity) stays the same placeholder
 * content legacy/home.js itself used, documented as mock until wired
 * up — see src/pages/homeMock.js. "View all work" / "View all
 * enquiries" / "View all contacts" route to their real modules;
 * "Message", "Add project to Portfolio" and "Collect a testimonial"
 * stay inert — no Messages module or portfolio/testimonial backend
 * exists yet.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Topbar from "../components/Topbar.jsx";
import LineChart from "../components/LineChart.jsx";
import Modal from "../components/Modal.jsx";
import Drawer from "../components/Drawer.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import { useToast } from "../lib/ToastContext.jsx";
import { colorForName, initials } from "../lib/avatar.js";
import { loadActiveWork } from "../data/home.js";
import { useEnquiries } from "./Enquiries/useEnquiries.js";
import { useRelationships } from "./Relationships/useRelationships.js";
import EnquiryDetail from "./Enquiries/EnquiryDetail.jsx";
import { STATUS_BADGE, formatServiceList } from "./Enquiries/enquiriesFormat.js";
import * as mock from "./homeMock.js";

function greeting(fullName) {
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
  const firstName = (fullName || "there").split(" ")[0];
  return `Good ${timeOfDay}, ${firstName}`;
}

function dueLabel(dateStr) {
  if (!dateStr) return "No date";
  const diffDays = Math.round((new Date(dateStr) - new Date(new Date().toISOString().slice(0, 10))) / 86400000);
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  if (diffDays < 0) return `Overdue by ${Math.abs(diffDays)}d`;
  if (diffDays <= 6) return `Due in ${diffDays}d`;
  return `Due ${new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

const WORK_STATUS_BADGE = { Planning: "soon", Active: "active", "Under Review": "pending", Stuck: "urgent", Completed: "active", Archived: "soon" };

function SegmentedBar({ percent, segments = 8 }) {
  const filled = Math.round((percent / 100) * segments);
  return (
    <>
      <div className="segmented-bar">
        {Array.from({ length: segments }, (_, i) => (
          <span key={i} className={i < filled ? "is-filled" : ""} />
        ))}
      </div>
      <span className="segmented-bar-pct">{percent}%</span>
    </>
  );
}

function Delta({ value }) {
  if (value === undefined || value === null) return null;
  const up = value >= 0;
  return <span className={`stat-delta ${up ? "is-up" : "is-down"}`}>{up ? "+" : ""}{value}%</span>;
}

function emptyState(title, body) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{body}</span>
    </div>
  );
}

export default function Home() {
  const { profile } = useAuth();
  const { show } = useToast();
  const navigate = useNavigate();
  const enquiries = useEnquiries();
  const relationships = useRelationships();

  const [incomePeriod, setIncomePeriod] = useState("last-month");
  const [analyticsPeriod, setAnalyticsPeriod] = useState("7d");
  const [activeWork, setActiveWork] = useState({ activeCount: null, items: [] });
  const [workLoading, setWorkLoading] = useState(true);
  const [workError, setWorkError] = useState(null);
  const [openModal, setOpenModal] = useState(null); // "portfolio" | "testimonial" | null
  const [openEnquiryId, setOpenEnquiryId] = useState(null);

  useEffect(() => {
    let active = true;
    loadActiveWork(4)
      .then((data) => {
        if (active) setActiveWork(data);
      })
      .catch((err) => {
        console.error("[home] failed to load active work", err);
        if (active) setWorkError(err.message || "Check your connection and try reloading.");
      })
      .finally(() => {
        if (active) setWorkLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const incomeData = mock.income.periods[incomePeriod] || mock.income.periods["last-month"];
  const analyticsData = mock.websiteAnalytics.periods[analyticsPeriod] || mock.websiteAnalytics.periods["7d"];
  const sessionsTotal = analyticsData.sessions.reduce((sum, v) => sum + v, 0).toLocaleString("en-KE");
  const recentEnquiries = enquiries.enquiries.slice(0, 5);
  const openEnquiry = enquiries.findEnquiry(openEnquiryId);
  const recentContacts = [...relationships.relationships].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded)).slice(0, 4);

  const stats = [
    { label: "Active work", value: activeWork.activeCount === null ? "—" : String(activeWork.activeCount) },
    ...mock.otherStats
  ];

  function handlePlaceholderSubmit(event, successMessage) {
    event.preventDefault();
    setOpenModal(null);
    event.currentTarget.reset();
    show(successMessage);
  }

  return (
    <>
      <Topbar title={greeting(profile?.full_name)} />

      <section className="panel dash-hero-stat" aria-label="This month's income">
        <select className="input select dash-hero-period" aria-label="Income period" value={incomePeriod} onChange={(e) => setIncomePeriod(e.target.value)}>
          <option value="last-month">Last month</option>
          <option value="avg-3">Avg. last 3 months</option>
          <option value="avg-6">Avg. last 6 months</option>
        </select>
        <div className="dash-hero-stat-main">
          <div className="dash-hero-label">This month's income</div>
          <strong>{incomeData.value}</strong>
          <span className={`dash-stat-trend is-${incomeData.direction}`}>{incomeData.trend}</span>
        </div>
        <div className="dash-hero-chart">
          <LineChart series={incomeData.series} height={80} width={320} gridLines />
        </div>
      </section>

      <section className="dash-stat-cards" aria-label="Studio snapshot">
        {stats.map((stat) => (
          <div key={stat.label} className="panel dash-stat-card">
            <div>
              <strong>{stat.value}</strong>
              <span className="dash-stat-label">{stat.label}</span>
              {stat.trend && <span className={`dash-stat-trend is-${stat.direction}`}>{stat.trend}</span>}
            </div>
          </div>
        ))}
      </section>

      <div className="panel">
        <div className="panel-header">
          <h2>Recent enquiries</h2>
          <button className="panel-link" type="button" onClick={() => navigate("/enquiries")}>
            View all enquiries
          </button>
        </div>
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Interested service</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {enquiries.loading ? (
                <tr>
                  <td colSpan={5}>
                    <p className="sub" style={{ padding: "0.5rem 0" }}>
                      Loading…
                    </p>
                  </td>
                </tr>
              ) : enquiries.error ? (
                <tr>
                  <td colSpan={5}>{emptyState("Couldn't load enquiries", enquiries.error)}</td>
                </tr>
              ) : recentEnquiries.length ? (
                recentEnquiries.map((enquiry) => (
                  <tr key={enquiry.id}>
                    <td className="dash-table-name">
                      <span className="dash-table-person" style={{ cursor: "pointer" }} onClick={() => setOpenEnquiryId(enquiry.id)}>
                        <span className="avatar" style={{ background: colorForName(enquiry.personName) }}>
                          {initials(enquiry.personName)}
                        </span>{" "}
                        {enquiry.personName}
                      </span>
                    </td>
                    <td className="dash-table-muted">{enquiry.phone || "—"}</td>
                    <td className="dash-table-muted">{enquiry.email || "—"}</td>
                    <td>{formatServiceList(enquiry.services)}</td>
                    <td>
                      <span className={`badge badge--${STATUS_BADGE[enquiry.status] || "soon"}`}>{enquiry.status}</span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>{emptyState("No enquiries yet", "New enquiries will appear here.")}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="dash-action-row">
        <button className="btn btn-primary btn-block" type="button" onClick={() => setOpenModal("portfolio")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: "1.125rem", height: "1.125rem" }}>
            <rect x="3" y="5" width="14" height="12" rx="2" />
            <circle cx="8" cy="10" r="1.3" />
            <path d="M4 15.5 7.5 12 10 14l3-3 4 4" />
            <path d="M18.5 3.5v4" />
            <path d="M16.5 5.5h4" />
          </svg>
          <span>Add project to Portfolio</span>
        </button>
        <button className="btn btn-block" type="button" onClick={() => setOpenModal("testimonial")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: "1.125rem", height: "1.125rem" }}>
            <path d="M7 8.2c-2 0-3.4 1.6-3.4 3.9v4h4v-4H6.1c0-1.1.8-1.9 1.9-1.9z" />
            <path d="M15.4 8.2c-2 0-3.4 1.6-3.4 3.9v4h4v-4h-1.5c0-1.1.8-1.9 1.9-1.9z" />
          </svg>
          <span>Collect a testimonial</span>
        </button>
      </div>

      <section className="dash-grid">
        <div className="dash-column">
          <div className="panel">
            <div className="panel-header">
              <h2>Active work</h2>
              <button className="panel-link" type="button" onClick={() => navigate("/studio")}>
                View all work
              </button>
            </div>
            <div className="dash-work-list">
              {workLoading ? (
                <p className="sub" style={{ padding: "0 1.5rem 1.5rem" }}>
                  Loading…
                </p>
              ) : workError ? (
                emptyState("Couldn't load active work", workError)
              ) : activeWork.items.length ? (
                activeWork.items.map((item) => {
                  const progress = item.milestoneTotal ? Math.round((item.milestoneDone / item.milestoneTotal) * 100) : 0;
                  return (
                    <div key={item.id} className="dash-work-row">
                      <div className="dash-work-row-main">
                        <div className="dash-work-title">{item.title}</div>
                        <div className="dash-work-client">{item.client}</div>
                      </div>
                      <div className="dash-work-row-progress">
                        <SegmentedBar percent={progress} />
                      </div>
                      <div className="dash-work-row-status">
                        <span className={`badge badge--${WORK_STATUS_BADGE[item.status] || "soon"}`}>{item.status}</span>
                        <span className="dash-work-due">{dueLabel(item.dueDate)}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                emptyState("No active work", "New projects will show up here.")
              )}
            </div>
          </div>
        </div>

        <div className="dash-column">
          <div className="panel">
            <div className="panel-header">
              <h2>Relationships</h2>
              <button className="panel-link" type="button" onClick={() => navigate("/relationships")}>
                View all contacts
              </button>
            </div>
            <div className="dash-relationship-list">
              {relationships.loading ? (
                <p className="sub" style={{ padding: "0 1.5rem 1.5rem" }}>
                  Loading…
                </p>
              ) : relationships.error ? (
                emptyState("Couldn't load contacts", relationships.error)
              ) : recentContacts.length ? (
                recentContacts.map((person) => {
                  // Same person-name-may-be-empty fallback already used
                  // elsewhere (e.g. NewRelationshipModal's brandName ||
                  // personName) — some existing Contacts were created via
                  // free text before Studio's Contact picker and have no
                  // person_name on file.
                  const displayName = person.personName || person.brandName;
                  return (
                    <div key={person.id} className="dash-relationship-row">
                      <span className="avatar" style={{ background: colorForName(displayName) }}>
                        {initials(displayName)}
                      </span>
                      <div className="dash-relationship-main">
                        <p>{displayName}</p>
                        <span>{person.source || "—"}</span>
                      </div>
                      <button className="message-btn" type="button" aria-label={`Message ${displayName}`} onClick={() => show(`Messaging ${displayName} will live in the Messages module.`)}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
                        </svg>
                      </button>
                    </div>
                  );
                })
              ) : (
                emptyState("No contacts yet", "New contacts will appear here.")
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Website Analytics</h2>
              <select className="input select" aria-label="Analytics period" value={analyticsPeriod} onChange={(e) => setAnalyticsPeriod(e.target.value)}>
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="14d">Last 14 days</option>
                <option value="30d">Last 30 days</option>
              </select>
            </div>
            <div className="dash-insights-chart">
              <LineChart series={analyticsData.sessions} height={96} width={320} gridLines />
            </div>
            <div className="dash-insights-stats">
              <div>
                <strong>{sessionsTotal}</strong>
                <span>Sessions</span>
              </div>
              <div>
                <strong>
                  {analyticsData.bounceRate}
                  <Delta value={analyticsData.bounceDelta} />
                </strong>
                <span>Bounce rate</span>
              </div>
              <div>
                <strong>
                  {analyticsData.avgSession}
                  <Delta value={analyticsData.avgSessionDelta} />
                </strong>
                <span>Avg. session</span>
              </div>
            </div>
            <div className="dash-insights-gsc">
              <div className="dash-insights-section-label" style={{ gridColumn: "1 / -1" }}>
                Search Console
              </div>
              <div>
                <strong>
                  {analyticsData.impressions}
                  <Delta value={analyticsData.impressionsDelta} />
                </strong>
                <span>Impressions</span>
              </div>
              <div>
                <strong>
                  {analyticsData.clicks}
                  <Delta value={analyticsData.clicksDelta} />
                </strong>
                <span>Clicks</span>
              </div>
              <div>
                <strong>
                  {analyticsData.ctr}
                  <Delta value={analyticsData.ctrDelta} />
                </strong>
                <span>CTR</span>
              </div>
              <div>
                <strong>
                  {analyticsData.avgPosition}
                  <Delta value={analyticsData.avgPositionDelta} />
                </strong>
                <span>Avg. position</span>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Activity</h2>
              <span className="panel-meta">Website + Studio</span>
            </div>
            <div className="timeline" style={{ padding: "0 1.5rem 1.5rem" }}>
              {mock.activity.map((event, i) => (
                <div key={i} className="timeline-item">
                  <span className="timeline-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      {event.type === "website" ? (
                        <>
                          <circle cx="12" cy="12" r="8.5" />
                          <path d="M3.7 12h16.6" />
                          <path d="M12 3.5c2.4 2.3 3.7 5.3 3.7 8.5s-1.3 6.2-3.7 8.5c-2.4-2.3-3.7-5.3-3.7-8.5S9.6 5.8 12 3.5z" />
                        </>
                      ) : (
                        <>
                          <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 1.5 5.5H4.5S6 13 6 9z" />
                          <path d="M9.5 17a2.5 2.5 0 0 0 5 0" />
                        </>
                      )}
                    </svg>
                  </span>
                  <div className="timeline-body">
                    <p>{event.text}</p>
                    <time>{event.time}</time>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Modal
        open={openModal === "portfolio"}
        onClose={() => setOpenModal(null)}
        title="Add project to Portfolio"
        description="Queued here until the Studio module can publish it live."
      >
        <form onSubmit={(e) => handlePlaceholderSubmit(e, "Queued for Portfolio — publish it once Studio is live.")}>
          <div className="field">
            <label className="field-label" htmlFor="portfolio-title">
              Project title
            </label>
            <input className="input" id="portfolio-title" type="text" placeholder="e.g. Stanbic Bank — Brand Campaign" required />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="portfolio-client">
              Client
            </label>
            <input className="input" id="portfolio-client" type="text" placeholder="Client name" required />
          </div>
          <div className="dash-modal-actions">
            <button className="btn btn-ghost" type="button" onClick={() => setOpenModal(null)}>
              Cancel
            </button>
            <button className="btn btn-primary" type="submit">
              Add project
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        open={openModal === "testimonial"}
        onClose={() => setOpenModal(null)}
        title="Collect a testimonial"
        description="Saved to Relationships for the client's record."
      >
        <form onSubmit={(e) => handlePlaceholderSubmit(e, "Testimonial request saved to Relationships.")}>
          <div className="field">
            <label className="field-label" htmlFor="testimonial-client">
              Client
            </label>
            <input className="input" id="testimonial-client" type="text" placeholder="Client name" required />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="testimonial-quote">
              Quote
            </label>
            <input className="input" id="testimonial-quote" type="text" placeholder="What did they say?" required />
          </div>
          <div className="dash-modal-actions">
            <button className="btn btn-ghost" type="button" onClick={() => setOpenModal(null)}>
              Cancel
            </button>
            <button className="btn btn-primary" type="submit">
              Save testimonial
            </button>
          </div>
        </form>
      </Modal>

      <Drawer open={Boolean(openEnquiry)} onClose={() => setOpenEnquiryId(null)} ariaLabel="Enquiry detail">
        {openEnquiry && <EnquiryDetail enquiry={openEnquiry} enquiries={enquiries} onClose={() => setOpenEnquiryId(null)} />}
      </Drawer>
    </>
  );
}
