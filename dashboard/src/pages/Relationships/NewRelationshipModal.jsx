/*
 * Innov8 Studios — "Add Relationship" modal. One shared modal for all
 * five types rather than five near-identical forms: `type` is fixed by
 * whichever tab was open when "Add" was clicked (Relationships.jsx),
 * and the type-specific field block below adapts to it.
 */
import { useEffect, useState } from "react";
import Modal from "../../components/Modal.jsx";
import { useToast } from "../../lib/ToastContext.jsx";
import { TEAM, SOURCES, TAGS, SERVICES, PARTNER_TYPES, INTEREST_LEVELS, PRIORITIES } from "./relationshipsMock.js";

function emptyForType(type) {
  return {
    personName: "",
    brandName: "",
    role: "",
    email: "",
    phone: "",
    website: "",
    location: "",
    owner: TEAM[0].name,
    source: SOURCES[0],
    tags: [],
    notes: "",
    potentialService: SERVICES[0],
    interestLevel: "Medium",
    priority: "Normal",
    opportunity: "",
    serviceInterest: SERVICES[0],
    estimatedValue: "",
    servicesUsed: [],
    partnerType: PARTNER_TYPES[0],
    capabilities: "",
    type
  };
}

export default function NewRelationshipModal({ open, type, onClose, relationships }) {
  const { show } = useToast();
  const [form, setForm] = useState(() => emptyForType(type));

  useEffect(() => {
    if (open) setForm(emptyForType(type));
  }, [open, type]);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function toggleTag(tag) {
    setForm((f) => ({ ...f, tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag] }));
  }

  function toggleService(service) {
    setForm((f) => ({ ...f, servicesUsed: f.servicesUsed.includes(service) ? f.servicesUsed.filter((s) => s !== service) : [...f.servicesUsed, service] }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.personName.trim()) return;

    const typeFields = {};
    if (type === "Prospect") {
      typeFields.potentialService = form.potentialService;
      typeFields.interestLevel = form.interestLevel;
      typeFields.priority = form.priority;
    } else if (type === "Lead") {
      typeFields.opportunity = form.opportunity;
      typeFields.serviceInterest = form.serviceInterest;
      typeFields.estimatedValue = Number(form.estimatedValue) || 0;
      typeFields.priority = form.priority;
      typeFields.status = "New";
    } else if (type === "Client") {
      typeFields.servicesUsed = form.servicesUsed;
      typeFields.projects = [];
      typeFields.relationshipHealth = "Healthy";
    } else if (type === "Partner") {
      typeFields.partnerType = form.partnerType;
      typeFields.capabilities = form.capabilities
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
    }

    const record = relationships.addRelationship({
      type,
      personName: form.personName.trim(),
      brandName: form.brandName.trim() || form.personName.trim(),
      role: form.role,
      email: form.email,
      phone: form.phone,
      website: form.website,
      location: form.location,
      owner: form.owner,
      source: form.source,
      tags: form.tags,
      notes: form.notes,
      ...typeFields
    });

    onClose();
    show(`"${record.brandName}" added to ${type}s.`);
  }

  return (
    <Modal open={open} onClose={onClose} title={`Add ${type}`} description={`Create a new ${type.toLowerCase()} relationship record.`}>
      <form onSubmit={handleSubmit}>
        <div className="field-grid">
          <div className="field">
            <label className="field-label" htmlFor="rel-person">
              Person name
            </label>
            <input className="input" id="rel-person" type="text" placeholder="e.g. Grace Chebet" value={form.personName} onChange={(e) => set("personName", e.target.value)} required />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="rel-brand">
              Brand name
            </label>
            <input className="input" id="rel-brand" type="text" placeholder="Same as person if individual" value={form.brandName} onChange={(e) => set("brandName", e.target.value)} />
          </div>
        </div>

        <div className="field-grid">
          <div className="field">
            <label className="field-label" htmlFor="rel-role">
              Role / position
            </label>
            <input className="input" id="rel-role" type="text" placeholder="e.g. Marketing Lead" value={form.role} onChange={(e) => set("role", e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="rel-location">
              Location
            </label>
            <input className="input" id="rel-location" type="text" placeholder="e.g. Nairobi" value={form.location} onChange={(e) => set("location", e.target.value)} />
          </div>
        </div>

        <div className="field-grid">
          <div className="field">
            <label className="field-label" htmlFor="rel-email">
              Email
            </label>
            <input className="input" id="rel-email" type="email" placeholder="name@business.co.ke" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="rel-phone">
              Phone
            </label>
            <input className="input" id="rel-phone" type="text" placeholder="+254 7…" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
        </div>

        <div className="field-grid">
          <div className="field">
            <label className="field-label" htmlFor="rel-owner">
              Owner
            </label>
            <select className="input select" id="rel-owner" value={form.owner} onChange={(e) => set("owner", e.target.value)}>
              {TEAM.map((t) => (
                <option key={t.name} value={t.name}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="rel-source">
              Source
            </label>
            <select className="input select" id="rel-source" value={form.source} onChange={(e) => set("source", e.target.value)}>
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        {type === "Prospect" && (
          <div className="field-grid">
            <div className="field">
              <label className="field-label" htmlFor="rel-potential-service">
                Potential service
              </label>
              <select className="input select" id="rel-potential-service" value={form.potentialService} onChange={(e) => set("potentialService", e.target.value)}>
                {SERVICES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="rel-interest">
                Interest level
              </label>
              <select className="input select" id="rel-interest" value={form.interestLevel} onChange={(e) => set("interestLevel", e.target.value)}>
                {INTEREST_LEVELS.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {type === "Lead" && (
          <>
            <div className="field-grid">
              <div className="field">
                <label className="field-label" htmlFor="rel-opportunity">
                  Opportunity
                </label>
                <input className="input" id="rel-opportunity" type="text" placeholder="e.g. Website redesign" value={form.opportunity} onChange={(e) => set("opportunity", e.target.value)} />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="rel-service-interest">
                  Service interested in
                </label>
                <select className="input select" id="rel-service-interest" value={form.serviceInterest} onChange={(e) => set("serviceInterest", e.target.value)}>
                  {SERVICES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="field-grid">
              <div className="field">
                <label className="field-label" htmlFor="rel-value">
                  Estimated value (KES)
                </label>
                <input className="input" id="rel-value" type="number" min="0" placeholder="e.g. 350000" value={form.estimatedValue} onChange={(e) => set("estimatedValue", e.target.value)} />
              </div>
            </div>
          </>
        )}

        {type === "Client" && (
          <div className="field">
            <span className="field-label">Services used</span>
            <div className="chip-select">
              {SERVICES.map((s) => (
                <label key={s}>
                  <input type="checkbox" checked={form.servicesUsed.includes(s)} onChange={() => toggleService(s)} />
                  <span>{s}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {type === "Partner" && (
          <div className="field-grid">
            <div className="field">
              <label className="field-label" htmlFor="rel-partner-type">
                Partner type
              </label>
              <select className="input select" id="rel-partner-type" value={form.partnerType} onChange={(e) => set("partnerType", e.target.value)}>
                {PARTNER_TYPES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="rel-capabilities">
                Capabilities
              </label>
              <input className="input" id="rel-capabilities" type="text" placeholder="Comma separated, e.g. Photography, Video" value={form.capabilities} onChange={(e) => set("capabilities", e.target.value)} />
            </div>
          </div>
        )}

        {(type === "Prospect" || type === "Lead") && (
          <div className="field">
            <label className="field-label" htmlFor="rel-priority">
              Priority
            </label>
            <select className="input select" id="rel-priority" value={form.priority} onChange={(e) => set("priority", e.target.value)} style={{ maxWidth: "12rem" }}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="field">
          <span className="field-label">Tags</span>
          <div className="chip-select">
            {TAGS.map((t) => (
              <label key={t}>
                <input type="checkbox" checked={form.tags.includes(t)} onChange={() => toggleTag(t)} />
                <span>{t}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="field">
          <label className="field-label" htmlFor="rel-notes">
            Notes
          </label>
          <textarea className="input" id="rel-notes" rows={3} placeholder="Any context worth keeping?" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>

        <div className="dash-modal-actions">
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" type="submit">
            Add {type}
          </button>
        </div>
      </form>
    </Modal>
  );
}
