/*
 * Innov8 Studios — "New Campaign" modal, ported from marketing.html's
 * #form-new-campaign + marketing.js's submit handler.
 */
import { useState } from "react";
import Modal from "../../components/Modal.jsx";
import { useToast } from "../../lib/ToastContext.jsx";

const OBJECTIVES = ["Generate leads", "Generate enquiries", "Build brand awareness", "Promote a service launch"];
const SERVICES = ["Motion Graphics", "3D Commercial", "Social Media Design", "Website Design", "Branding", "Creative Retainer"];
const PLATFORM_OPTIONS = ["Instagram", "TikTok", "Facebook", "LinkedIn"];

const EMPTY = {
  name: "",
  objective: OBJECTIVES[0],
  service: SERVICES[0],
  description: "",
  platforms: ["Instagram", "TikTok"],
  startDate: "",
  endDate: "",
  budget: "",
  cta: "",
  targetAudience: ""
};

export default function NewCampaignModal({ open, onClose, marketing }) {
  const { show } = useToast();
  const [form, setForm] = useState(EMPTY);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function togglePlatform(platform) {
    setForm((f) => ({
      ...f,
      platforms: f.platforms.includes(platform) ? f.platforms.filter((p) => p !== platform) : [...f.platforms, platform]
    }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const campaign = marketing.addCampaign(form);
    setForm(EMPTY);
    onClose();
    show(`"${campaign.name}" created as a draft.`);
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        setForm(EMPTY);
        onClose();
      }}
      title="New Campaign"
      description="Set up a campaign to market the Studio itself."
    >
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label className="field-label" htmlFor="campaign-name">
            Campaign name
          </label>
          <input className="input" id="campaign-name" type="text" placeholder="e.g. Motion Graphics — September" value={form.name} onChange={(e) => set("name", e.target.value)} required />
        </div>
        <div className="field-grid">
          <div className="field">
            <label className="field-label" htmlFor="campaign-objective">
              Objective
            </label>
            <select className="input select" id="campaign-objective" value={form.objective} onChange={(e) => set("objective", e.target.value)}>
              {OBJECTIVES.map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="campaign-service">
              Service
            </label>
            <select className="input select" id="campaign-service" value={form.service} onChange={(e) => set("service", e.target.value)}>
              {SERVICES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="campaign-description">
            Description
          </label>
          <textarea className="input" id="campaign-description" rows={2} placeholder="What is this campaign about?" value={form.description} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div className="field">
          <span className="field-label">Platforms</span>
          <div className="mkt-checkbox-row">
            {PLATFORM_OPTIONS.map((p) => (
              <label key={p} className="mkt-checkbox">
                <input type="checkbox" checked={form.platforms.includes(p)} onChange={() => togglePlatform(p)} /> {p}
              </label>
            ))}
          </div>
        </div>
        <div className="field-grid">
          <div className="field">
            <label className="field-label" htmlFor="campaign-start">
              Start date
            </label>
            <input className="input" id="campaign-start" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} required />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="campaign-end">
              End date
            </label>
            <input className="input" id="campaign-end" type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} required />
          </div>
        </div>
        <div className="field-grid">
          <div className="field">
            <label className="field-label" htmlFor="campaign-budget">
              Budget (KES)
            </label>
            <input className="input" id="campaign-budget" type="number" min="0" step="500" placeholder="e.g. 5000" value={form.budget} onChange={(e) => set("budget", e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="campaign-cta">
              Call to action
            </label>
            <input className="input" id="campaign-cta" type="text" placeholder="e.g. Get a quote" value={form.cta} onChange={(e) => set("cta", e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="campaign-target">
            Target audience
          </label>
          <input className="input" id="campaign-target" type="text" placeholder="e.g. Nairobi businesses" value={form.targetAudience} onChange={(e) => set("targetAudience", e.target.value)} />
        </div>
        <div className="dash-modal-actions">
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => {
              setForm(EMPTY);
              onClose();
            }}
          >
            Cancel
          </button>
          <button className="btn btn-primary" type="submit">
            Create Campaign
          </button>
        </div>
      </form>
    </Modal>
  );
}
