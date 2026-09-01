/*
 * Innov8 Studios — "Add Prospect" modal, ported from marketing.html's
 * #form-new-prospect + marketing.js's submit handler.
 */
import { useState } from "react";
import Modal from "../../components/Modal.jsx";
import { useToast } from "../../lib/ToastContext.jsx";

const SERVICES = ["Motion Graphics", "3D Commercial", "Social Media Design", "Website Design", "Branding", "Creative Retainer"];
const CHANNELS = ["Instagram", "Email", "LinkedIn", "WhatsApp", "Phone"];

const EMPTY = { business: "", contact: "", industry: "", serviceInterest: SERVICES[0], channel: CHANNELS[0], nextFollowUp: "", notes: "" };

export default function NewProspectModal({ open, onClose, marketing }) {
  const { show } = useToast();
  const [form, setForm] = useState(EMPTY);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const prospect = marketing.addProspect(form);
    setForm(EMPTY);
    onClose();
    show(`"${prospect.business}" added to Outreach.`);
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        setForm(EMPTY);
        onClose();
      }}
      title="Add Prospect"
      description="Track a new business you're reaching out to."
    >
      <form onSubmit={handleSubmit}>
        <div className="field-grid">
          <div className="field">
            <label className="field-label" htmlFor="prospect-business">
              Business name
            </label>
            <input className="input" id="prospect-business" type="text" placeholder="e.g. Savanna Fitness Club" value={form.business} onChange={(e) => set("business", e.target.value)} required />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="prospect-contact">
              Contact name
            </label>
            <input className="input" id="prospect-contact" type="text" placeholder="e.g. Grace Chebet" value={form.contact} onChange={(e) => set("contact", e.target.value)} required />
          </div>
        </div>
        <div className="field-grid">
          <div className="field">
            <label className="field-label" htmlFor="prospect-industry">
              Industry
            </label>
            <input className="input" id="prospect-industry" type="text" placeholder="e.g. Hospitality" value={form.industry} onChange={(e) => set("industry", e.target.value)} required />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="prospect-service">
              Service interest
            </label>
            <select className="input select" id="prospect-service" value={form.serviceInterest} onChange={(e) => set("serviceInterest", e.target.value)}>
              {SERVICES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="field-grid">
          <div className="field">
            <label className="field-label" htmlFor="prospect-channel">
              Channel
            </label>
            <select className="input select" id="prospect-channel" value={form.channel} onChange={(e) => set("channel", e.target.value)}>
              {CHANNELS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="prospect-followup">
              Next follow-up
            </label>
            <input className="input" id="prospect-followup" type="date" value={form.nextFollowUp} onChange={(e) => set("nextFollowUp", e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label className="field-label" htmlFor="prospect-notes">
            Notes
          </label>
          <textarea className="input" id="prospect-notes" rows={3} placeholder="What are they interested in?" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
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
            Add prospect
          </button>
        </div>
      </form>
    </Modal>
  );
}
