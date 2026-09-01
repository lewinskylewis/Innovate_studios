/*
 * Innov8 Studios — "New Enquiry" modal, for manually logging an
 * enquiry that came in outside the (not-yet-built) inbound channels —
 * a phone call, a walk-in, a forwarded email. Mirrors NewProspectModal
 * / NewRelationshipModal's shape and field-grid conventions.
 */
import { useState } from "react";
import Modal from "../../components/Modal.jsx";
import { useToast } from "../../lib/ToastContext.jsx";
import { TEAM, SOURCES, SERVICES, PRIORITIES } from "./enquiriesMock.js";

const EMPTY = { personName: "", brandName: "", email: "", phone: "", source: SOURCES[0], services: [], message: "", priority: "Normal", owner: TEAM[0].name, notes: "" };

export default function NewEnquiryModal({ open, onClose, enquiries }) {
  const { show } = useToast();
  const [form, setForm] = useState(EMPTY);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleService(service) {
    setForm((f) => ({ ...f, services: f.services.includes(service) ? f.services.filter((s) => s !== service) : [...f.services, service] }));
  }

  function reset() {
    setForm(EMPTY);
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.personName.trim()) return;
    const record = enquiries.addEnquiry({ ...form, personName: form.personName.trim(), brandName: form.brandName.trim() || form.personName.trim() });
    reset();
    onClose();
    show(`Enquiry from "${record.personName}" added.`);
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="New Enquiry"
      description="Log an enquiry received outside the normal intake channels."
    >
      <form onSubmit={handleSubmit}>
        <div className="field-grid">
          <div className="field">
            <label className="field-label" htmlFor="enq-new-person">
              Name
            </label>
            <input className="input" id="enq-new-person" type="text" placeholder="e.g. Amina Wanjiku" value={form.personName} onChange={(e) => set("personName", e.target.value)} required />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="enq-new-brand">
              Brand / Company
            </label>
            <input className="input" id="enq-new-brand" type="text" placeholder="Same as name if individual" value={form.brandName} onChange={(e) => set("brandName", e.target.value)} />
          </div>
        </div>

        <div className="field-grid">
          <div className="field">
            <label className="field-label" htmlFor="enq-new-email">
              Email
            </label>
            <input className="input" id="enq-new-email" type="email" placeholder="name@business.co.ke" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="enq-new-phone">
              Phone
            </label>
            <input className="input" id="enq-new-phone" type="text" placeholder="+254 7…" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
        </div>

        <div className="field-grid">
          <div className="field">
            <label className="field-label" htmlFor="enq-new-source">
              Source
            </label>
            <select className="input select" id="enq-new-source" value={form.source} onChange={(e) => set("source", e.target.value)}>
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="enq-new-priority">
              Priority
            </label>
            <select className="input select" id="enq-new-priority" value={form.priority} onChange={(e) => set("priority", e.target.value)}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <span className="field-label">Service</span>
          <div className="chip-select">
            {SERVICES.map((s) => (
              <label key={s}>
                <input type="checkbox" checked={form.services.includes(s)} onChange={() => toggleService(s)} />
                <span>{s}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="enq-new-owner">
            Owner
          </label>
          <select className="input select" id="enq-new-owner" value={form.owner} onChange={(e) => set("owner", e.target.value)} style={{ maxWidth: "12rem" }}>
            {TEAM.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="enq-new-message">
            Message
          </label>
          <textarea className="input" id="enq-new-message" rows={3} placeholder="What did they ask for?" value={form.message} onChange={(e) => set("message", e.target.value)} />
        </div>

        <div className="field">
          <label className="field-label" htmlFor="enq-new-notes">
            Notes
          </label>
          <textarea className="input" id="enq-new-notes" rows={2} placeholder="Any internal context worth keeping?" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>

        <div className="dash-modal-actions">
          <button
            className="btn btn-ghost"
            type="button"
            onClick={() => {
              reset();
              onClose();
            }}
          >
            Cancel
          </button>
          <button className="btn btn-primary" type="submit">
            Add Enquiry
          </button>
        </div>
      </form>
    </Modal>
  );
}
