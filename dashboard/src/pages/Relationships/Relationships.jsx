/*
 * Innov8 Studios — /relationships route. The central relationship
 * management layer: Overview + Contacts / Prospects / Leads / Clients /
 * Partners, following the same tabbed-page shape as Marketing.jsx and
 * Studio.jsx. Entirely in-memory (useRelationships.js) — no Supabase,
 * matching this module's explicit V1 UI/UX-only constraint.
 */
import { useState } from "react";
import Topbar from "../../components/Topbar.jsx";
import Drawer from "../../components/Drawer.jsx";
import { colorForName, initials } from "../../lib/avatar.js";
import { formatMoney } from "../../lib/format.js";
import { useStoredTab } from "../../lib/useStoredTab.js";
import { useRelationships } from "./useRelationships.js";
import { SERVICES, PARTNER_TYPES, LEAD_STATUSES, PRIORITIES } from "./relationshipsMock.js";
import { LEAD_STATUS_BADGE, HEALTH_BADGE, activeBadge, formatServiceList, activeProjects } from "./relationshipsFormat.js";
import Overview from "./Overview.jsx";
import RelationshipList, { DEFAULT_LIST_FILTERS, followUpCell } from "./RelationshipList.jsx";
import RelationshipDetail from "./RelationshipDetail.jsx";
import NewRelationshipModal from "./NewRelationshipModal.jsx";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "contacts", label: "Contacts", type: "Contact" },
  { id: "prospects", label: "Prospects", type: "Prospect" },
  { id: "leads", label: "Leads", type: "Lead" },
  { id: "clients", label: "Clients", type: "Client" },
  { id: "partners", label: "Partners", type: "Partner" }
];

function personCell(r) {
  return (
    <span className="dash-table-person">
      <span className="avatar" style={{ background: colorForName(r.personName) }}>
        {initials(r.personName)}
      </span>{" "}
      <span>{r.personName}</span>
    </span>
  );
}

function ownerCell(r) {
  return r.owner || "Unassigned";
}

function tagList(list) {
  return formatServiceList(list);
}

const TAB_CONFIG = {
  Contact: {
    columns: [
      { key: "person", header: "Person", cell: personCell },
      { key: "brand", header: "Brand", className: "dash-table-name", cell: (r) => r.brandName },
      { key: "email", header: "Email", className: "dash-table-muted", cell: (r) => r.email || "—" },
      { key: "location", header: "Location", className: "dash-table-muted", cell: (r) => r.location || "—" },
      { key: "source", header: "Source", className: "dash-table-muted", cell: (r) => r.source },
      { key: "owner", header: "Owner", className: "dash-table-muted", cell: ownerCell },
      { key: "status", header: "Status", cell: (r) => <span className={`badge badge--${activeBadge(r)}`}>{r.active ? "Active" : "Inactive"}</span> }
    ],
    extraFilters: [],
    summaryCards: (rows) => [
      { label: "Total Contacts", value: rows.length },
      { label: "Active", value: rows.filter((r) => r.active).length },
      { label: "From Enquiries", value: rows.filter((r) => r.originContext?.kind === "enquiry").length },
      { label: "No Owner", value: rows.filter((r) => !r.owner).length }
    ],
    emptyTitle: "No Contacts",
    emptyBody: "New contacts from enquiries, outreach, or networking will appear here.",
    newLabel: "Add Contact"
  },
  Prospect: {
    columns: [
      { key: "person", header: "Person", cell: personCell },
      { key: "brand", header: "Brand", className: "dash-table-name", cell: (r) => r.brandName },
      { key: "service", header: "Potential Service", className: "dash-table-muted", cell: (r) => r.potentialService },
      { key: "interest", header: "Interest", className: "dash-table-muted", cell: (r) => r.interestLevel },
      { key: "priority", header: "Priority", className: "dash-table-muted", cell: (r) => r.priority },
      { key: "owner", header: "Owner", className: "dash-table-muted", cell: ownerCell },
      { key: "followup", header: "Next Follow-up", cell: followUpCell }
    ],
    extraFilters: [{ stateKey: "service", label: "Service", options: SERVICES, match: (r, v) => r.potentialService === v }],
    summaryCards: (rows) => [
      { label: "Total Prospects", value: rows.length },
      { label: "High Interest", value: rows.filter((r) => r.interestLevel === "High").length },
      { label: "High Priority", value: rows.filter((r) => r.priority === "High").length },
      { label: "From Outreach", value: rows.filter((r) => r.originContext?.kind === "outreach").length }
    ],
    emptyTitle: "No Prospects",
    emptyBody: "Contacts showing genuine interest will move here.",
    newLabel: "Add Prospect"
  },
  Lead: {
    columns: [
      { key: "person", header: "Person", cell: personCell },
      { key: "brand", header: "Brand", className: "dash-table-name", cell: (r) => r.brandName },
      { key: "opportunity", header: "Opportunity", className: "dash-table-muted", cell: (r) => r.opportunity || "—" },
      { key: "service", header: "Service", className: "dash-table-muted", cell: (r) => r.serviceInterest },
      { key: "value", header: "Est. Value", className: "dash-table-muted", cell: (r) => formatMoney(r.estimatedValue) },
      { key: "status", header: "Status", cell: (r) => <span className={`badge badge--${LEAD_STATUS_BADGE[r.status] || "soon"}`}>{r.status}</span> },
      { key: "priority", header: "Priority", className: "dash-table-muted", cell: (r) => r.priority },
      { key: "owner", header: "Owner", className: "dash-table-muted", cell: ownerCell },
      { key: "followup", header: "Next Follow-up", cell: followUpCell }
    ],
    extraFilters: [
      { stateKey: "status", label: "Status", options: LEAD_STATUSES, match: (r, v) => r.status === v },
      { stateKey: "service", label: "Service", options: SERVICES, match: (r, v) => r.serviceInterest === v },
      { stateKey: "priority", label: "Priority", options: PRIORITIES.concat("Urgent"), match: (r, v) => r.priority === v }
    ],
    summaryCards: (rows) => [
      { label: "Total Leads", value: rows.length },
      { label: "Open Opportunities", value: rows.filter((r) => !["Won", "Lost"].includes(r.status)).length },
      { label: "Pipeline Value", value: formatMoney(rows.filter((r) => !["Won", "Lost"].includes(r.status)).reduce((s, r) => s + (r.estimatedValue || 0), 0)) },
      { label: "Won", value: rows.filter((r) => r.status === "Won").length }
    ],
    emptyTitle: "No Leads",
    emptyBody: "Qualified opportunities that deserve active follow-up will appear here.",
    newLabel: "Add Lead"
  },
  Client: {
    columns: [
      { key: "person", header: "Person", cell: personCell },
      { key: "brand", header: "Brand", className: "dash-table-name", cell: (r) => r.brandName },
      { key: "services", header: "Services Used", className: "dash-table-muted", cell: (r) => tagList(r.servicesUsed) },
      { key: "projects", header: "Active Projects", className: "dash-table-muted", cell: (r) => activeProjects(r).length },
      { key: "health", header: "Health", cell: (r) => <span className={`badge badge--${HEALTH_BADGE[r.relationshipHealth] || "soon"}`}>{r.relationshipHealth}</span> },
      { key: "owner", header: "Owner", className: "dash-table-muted", cell: ownerCell },
      { key: "followup", header: "Next Follow-up", cell: followUpCell }
    ],
    extraFilters: [
      { stateKey: "health", label: "Health", options: ["Healthy", "At Risk", "Inactive"], match: (r, v) => r.relationshipHealth === v },
      { stateKey: "service", label: "Service", options: SERVICES, match: (r, v) => (r.servicesUsed || []).includes(v) }
    ],
    summaryCards: (rows) => [
      { label: "Total Clients", value: rows.length },
      { label: "Healthy", value: rows.filter((r) => r.relationshipHealth === "Healthy").length },
      { label: "At Risk", value: rows.filter((r) => r.relationshipHealth === "At Risk").length },
      { label: "Total Project Value", value: formatMoney(rows.reduce((s, r) => s + (r.projects || []).reduce((ps, p) => ps + (p.value || 0), 0), 0)) }
    ],
    emptyTitle: "No Clients",
    emptyBody: "Leads that convert into working relationships will appear here.",
    newLabel: "Add Client"
  },
  Partner: {
    columns: [
      { key: "person", header: "Person", cell: personCell },
      { key: "brand", header: "Brand", className: "dash-table-name", cell: (r) => r.brandName },
      { key: "type", header: "Partner Type", className: "dash-table-muted", cell: (r) => r.partnerType },
      { key: "capabilities", header: "Capabilities", className: "dash-table-muted", cell: (r) => tagList(r.capabilities) },
      { key: "status", header: "Status", cell: (r) => <span className={`badge badge--${activeBadge(r)}`}>{r.active ? "Active" : "Inactive"}</span> },
      { key: "owner", header: "Owner", className: "dash-table-muted", cell: ownerCell },
      { key: "followup", header: "Next Follow-up", cell: followUpCell }
    ],
    extraFilters: [{ stateKey: "partnerType", label: "Partner Type", options: PARTNER_TYPES, match: (r, v) => r.partnerType === v }],
    summaryCards: (rows) => [
      { label: "Total Partners", value: rows.length },
      { label: "Active", value: rows.filter((r) => r.active).length },
      { label: "Creative", value: rows.filter((r) => r.partnerType === "Creative").length },
      { label: "Referral", value: rows.filter((r) => r.partnerType === "Referral").length }
    ],
    emptyTitle: "No Partners",
    emptyBody: "Creative collaborators, production partners, and suppliers will appear here.",
    newLabel: "Add Partner"
  }
};

export default function Relationships() {
  const relationships = useRelationships();
  const [tab, setTab] = useStoredTab("innov8-dashboard-tab-relationships", "overview");
  const [filtersByTab, setFiltersByTab] = useState({});
  const [openRecordId, setOpenRecordId] = useState(null);
  const [newModalType, setNewModalType] = useState(null);

  const activeTab = TABS.find((t) => t.id === tab);
  const config = activeTab?.type ? TAB_CONFIG[activeTab.type] : null;
  const filters = filtersByTab[tab] || DEFAULT_LIST_FILTERS;

  function setFilters(next) {
    setFiltersByTab((prev) => ({ ...prev, [tab]: next }));
  }

  const openRecord = relationships.findRelationship(openRecordId);

  return (
    <>
      <Topbar title="Relationships" />

      <div className="work-toolbar-row">
        <div className="work-tabs">
          {TABS.map((t) => (
            <button key={t.id} type="button" className={`work-tab${tab === t.id ? " is-active" : ""}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "overview" ? (
        <Overview relationships={relationships.relationships} onOpenRecord={setOpenRecordId} />
      ) : (
        config && (
          <RelationshipList
            // The Contacts tab is the master view — every Contact, regardless
            // of classification (including unclassified/NULL contact_type,
            // mapped to type "Contact" — see src/data/relationships.js). Every
            // other tab filters to its one classification, same as before.
            rows={tab === "contacts" ? relationships.relationships : relationships.relationships.filter((r) => r.type === activeTab.type)}
            filters={filters}
            onFiltersChange={setFilters}
            columns={config.columns}
            extraFilters={config.extraFilters}
            summaryCards={config.summaryCards(tab === "contacts" ? relationships.relationships : relationships.relationships.filter((r) => r.type === activeTab.type))}
            emptyTitle={config.emptyTitle}
            emptyBody={config.emptyBody}
            newLabel={config.newLabel}
            onOpenNew={() => setNewModalType(activeTab.type)}
            onOpenRecord={setOpenRecordId}
          />
        )
      )}

      <Drawer open={Boolean(openRecord)} onClose={() => setOpenRecordId(null)} ariaLabel="Relationship detail">
        {openRecord && <RelationshipDetail key={openRecord.id} record={openRecord} relationships={relationships} onClose={() => setOpenRecordId(null)} />}
      </Drawer>

      <NewRelationshipModal open={Boolean(newModalType)} type={newModalType || "Contact"} onClose={() => setNewModalType(null)} relationships={relationships} />
    </>
  );
}
