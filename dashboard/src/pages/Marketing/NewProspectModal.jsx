/*
 * Innov8 Studios — "Add Prospect" modal, ported from marketing.html's
 * #form-new-prospect + marketing.js's submit handler. Visually matches
 * the refined NewEnquiryModal.jsx — same "dash-modal--*-wide" treatment
 * (width/typography/spacing, see dashboard.css's combined rule set) and
 * the same safe-close behavior (dismissOnBackdrop=false, so an
 * accidental outside click can't discard what's been typed).
 *
 * Channel vs Source are deliberately separate fields sharing one
 * vocabulary: Channel is how this Prospect is currently being reached
 * (kept in contacts.channel, unchanged by this addition); Source is
 * which platform they were originally found on (contacts.source — the
 * same freeform column Relationships/Enquiries already use for "how
 * this Contact originated", now given a fixed set of options here
 * instead of free text).
 */
import { useState } from "react";
import Modal from "../../components/Modal.jsx";
import { useToast } from "../../lib/ToastContext.jsx";

const SERVICES = ["Motion Graphics", "3D Commercial", "Social Media Design", "Website Design", "Branding", "Creative Retainer"];
const CHANNELS = ["Instagram", "Email", "LinkedIn", "WhatsApp", "Phone", "TikTok", "Facebook"];
// Source (where the prospect was found) reuses the exact same
// vocabulary as Channel (how they're currently being reached) — the
// two are deliberately independent fields tracking different things
// on the same contacts row (contacts.source / no dedicated Channel
// column existed before this — see the outreach_fields migration).
const SOURCES = CHANNELS;

const EMPTY = { business: "", contact: "", email: "", phone: "", industry: "", serviceInterest: SERVICES[0], channel: CHANNELS[0], source: SOURCES[0], nextFollowUp: "", notes: "" };

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
      className="dash-modal--outreach-wide"
      dismissOnBackdrop={false}
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
            <label className="field-label" htmlFor="prospect-email">
              Email
            </label>
            <input className="input" id="prospect-email" type="email" placeholder="name@business.co.ke" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="prospect-phone">
              Phone
            </label>
            <input className="input" id="prospect-phone" type="text" placeholder="+254 7…" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
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
            <label className="field-label" htmlFor="prospect-source">
              Source
            </label>
            <select className="input select" id="prospect-source" value={form.source} onChange={(e) => set("source", e.target.value)}>
              {SOURCES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="field" style={{ maxWidth: "12rem" }}>
          <label className="field-label" htmlFor="prospect-followup">
            Next follow-up
          </label>
          <input className="input" id="prospect-followup" type="date" value={form.nextFollowUp} onChange={(e) => set("nextFollowUp", e.target.value)} />
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
