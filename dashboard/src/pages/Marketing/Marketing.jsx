/*
 * Innov8 Studios — /marketing route. Ported from legacy/marketing.html +
 * legacy/marketing.js + legacy/marketing-data.js. Entirely in-memory —
 * no Supabase client, matching the legacy page's own explicit,
 * documented constraint (see marketingMock.js).
 */
import { useState } from "react";
import Topbar from "../../components/Topbar.jsx";
import Drawer from "../../components/Drawer.jsx";
import { useMarketing } from "./useMarketing.js";
import Overview from "./Overview.jsx";
import Outreach, { OutreachFilterBar } from "./Outreach.jsx";
import ProspectDetail from "./ProspectDetail.jsx";
import Campaigns from "./Campaigns.jsx";
import CampaignDetail from "./CampaignDetail.jsx";
import NewProspectModal from "./NewProspectModal.jsx";
import OutreachActivityModal from "./OutreachActivityModal.jsx";
import NewCampaignModal from "./NewCampaignModal.jsx";

const DEFAULT_PROSPECT_FILTERS = { search: "", industry: "All", status: "All", channel: "All", serviceInterest: "All", followup: "All" };

export default function Marketing() {
  const marketing = useMarketing();
  const [tab, setTab] = useState("overview");
  const [prospectFilters, setProspectFilters] = useState(DEFAULT_PROSPECT_FILTERS);
  const [openProspectId, setOpenProspectId] = useState(null);
  const [activeCampaignId, setActiveCampaignId] = useState(null);
  const [newProspectOpen, setNewProspectOpen] = useState(false);
  const [logActivityOpen, setLogActivityOpen] = useState(false);
  const [newCampaignOpen, setNewCampaignOpen] = useState(false);

  function gotoTab(next) {
    setTab(next);
    if (next !== "campaigns") setActiveCampaignId(null);
  }

  const openProspect = marketing.prospects.find((p) => p.id === openProspectId) || null;
  const activeCampaign = marketing.campaigns.find((c) => c.id === activeCampaignId) || null;

  return (
    <>
      <Topbar title="Marketing & Sales" />

      <div className="work-toolbar-row">
        <div className="work-tabs">
          <button className={`work-tab${tab === "overview" ? " is-active" : ""}`} type="button" onClick={() => gotoTab("overview")}>
            Overview
          </button>
          <button className={`work-tab${tab === "outreach" ? " is-active" : ""}`} type="button" onClick={() => gotoTab("outreach")}>
            Outreach
          </button>
          <button className={`work-tab${tab === "campaigns" ? " is-active" : ""}`} type="button" onClick={() => gotoTab("campaigns")}>
            Studio Campaigns
          </button>
        </div>

        {tab === "overview" && (
          <div className="work-toolbar-actions">
            <button className="work-toolbar-control work-toolbar-new" type="button" onClick={() => setNewCampaignOpen(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: "1rem", height: "1rem" }}>
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              New Campaign
            </button>
          </div>
        )}

        {tab === "outreach" && (
          <OutreachFilterBar
            marketing={marketing}
            filters={prospectFilters}
            onFiltersChange={setProspectFilters}
            onOpenNewProspect={() => setNewProspectOpen(true)}
            onOpenLogActivity={() => setLogActivityOpen(true)}
          />
        )}

        {tab === "campaigns" && !activeCampaign && (
          <div className="work-toolbar-actions">
            <button className="work-toolbar-control work-toolbar-new" type="button" onClick={() => setNewCampaignOpen(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ width: "1rem", height: "1rem" }}>
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              New Campaign
            </button>
          </div>
        )}
      </div>

      {tab === "overview" && (
        <Overview
          marketing={marketing}
          onOpenProspect={(id) => {
            gotoTab("outreach");
            setOpenProspectId(id);
          }}
          onViewCampaign={setActiveCampaignId}
          onGotoTab={gotoTab}
        />
      )}

      {tab === "outreach" && <Outreach marketing={marketing} filters={prospectFilters} onOpenProspect={setOpenProspectId} />}

      {tab === "campaigns" &&
        (activeCampaign ? (
          <CampaignDetail campaign={activeCampaign} marketing={marketing} onBack={() => setActiveCampaignId(null)} />
        ) : (
          <Campaigns campaigns={marketing.campaigns} onView={setActiveCampaignId} />
        ))}

      <Drawer open={Boolean(openProspect)} onClose={() => setOpenProspectId(null)} ariaLabel="Prospect detail">
        {openProspect && <ProspectDetail prospect={openProspect} marketing={marketing} onClose={() => setOpenProspectId(null)} />}
      </Drawer>

      <NewProspectModal open={newProspectOpen} onClose={() => setNewProspectOpen(false)} marketing={marketing} />
      <OutreachActivityModal open={logActivityOpen} onClose={() => setLogActivityOpen(false)} marketing={marketing} />
      <NewCampaignModal open={newCampaignOpen} onClose={() => setNewCampaignOpen(false)} marketing={marketing} />
    </>
  );
}
