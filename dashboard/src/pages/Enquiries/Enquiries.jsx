/*
 * Innov8 Studios — /enquiries route. The intake funnel: Incoming
 * Interest → Qualification → Follow-up → Conversion → Relationship.
 * Follows the same tabbed-page shape as Marketing.jsx and
 * Relationships.jsx. Entirely in-memory (useEnquiries.js) — no
 * Supabase, matching this module's V1 UI/UX-only constraint.
 */
import { useState } from "react";
import Topbar from "../../components/Topbar.jsx";
import Drawer from "../../components/Drawer.jsx";
import { useEnquiries } from "./useEnquiries.js";
import Overview from "./Overview.jsx";
import EnquiryList, { DEFAULT_LIST_FILTERS } from "./EnquiryList.jsx";
import EnquiryDetail from "./EnquiryDetail.jsx";
import NewEnquiryModal from "./NewEnquiryModal.jsx";

export default function Enquiries() {
  const enquiries = useEnquiries();
  const [tab, setTab] = useState("overview");
  const [filters, setFilters] = useState(DEFAULT_LIST_FILTERS);
  const [openRecordId, setOpenRecordId] = useState(null);
  const [newOpen, setNewOpen] = useState(false);

  const openRecord = enquiries.findEnquiry(openRecordId);

  function openFromOverview(id) {
    setTab("enquiries");
    setOpenRecordId(id);
  }

  const summaryCards = [
    { label: "Total", value: enquiries.enquiries.length },
    { label: "New", value: enquiries.enquiries.filter((e) => e.status === "New").length },
    { label: "Qualified", value: enquiries.enquiries.filter((e) => e.status === "Qualified").length },
    { label: "Converted", value: enquiries.enquiries.filter((e) => e.status === "Converted").length }
  ];

  return (
    <>
      <Topbar title="Enquiries" />

      <div className="work-toolbar-row">
        <div className="work-tabs">
          <button className={`work-tab${tab === "overview" ? " is-active" : ""}`} type="button" onClick={() => setTab("overview")}>
            Overview
          </button>
          <button className={`work-tab${tab === "enquiries" ? " is-active" : ""}`} type="button" onClick={() => setTab("enquiries")}>
            Enquiries
          </button>
        </div>
      </div>

      {tab === "overview" ? (
        <Overview enquiries={enquiries.enquiries} onOpenRecord={openFromOverview} />
      ) : (
        <EnquiryList
          rows={enquiries.enquiries}
          filters={filters}
          onFiltersChange={setFilters}
          summaryCards={summaryCards}
          onOpenNew={() => setNewOpen(true)}
          onOpenRecord={setOpenRecordId}
        />
      )}

      <Drawer open={Boolean(openRecord)} onClose={() => setOpenRecordId(null)} ariaLabel="Enquiry detail">
        {openRecord && <EnquiryDetail enquiry={openRecord} enquiries={enquiries} onClose={() => setOpenRecordId(null)} />}
      </Drawer>

      <NewEnquiryModal open={newOpen} onClose={() => setNewOpen(false)} enquiries={enquiries} />
    </>
  );
}
