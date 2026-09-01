/*
 * Innov8 Studios — the "+" add-column interaction. A dropdown anchored
 * directly under the + button (via Popover) — never a modal, sidebar or
 * page — where the user names the property and picks its type in one
 * continuous flow, Notion-style. For a "select"-family type, comma-
 * separated starter options can be entered inline too.
 */
import { useState } from "react";
import Popover from "../../components/Popover.jsx";
import { PROPERTY_TYPES, PROPERTY_TYPE_ICONS, storageForType } from "./propertyTypes.js";

function Icon({ name }) {
  return (
    <svg className="property-type-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: PROPERTY_TYPE_ICONS[name] || "" }} />
  );
}

export default function CreatePropertyMenu({ anchor, onClose, onCreate, insertAfterId }) {
  const [name, setName] = useState("");
  const [type, setType] = useState(null);
  const [options, setOptions] = useState("");
  const [saving, setSaving] = useState(false);

  function reset() {
    setName("");
    setType(null);
    setOptions("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    if (!type) return;
    const { type: dbType, isMulti, keyPrefix } = storageForType(type);
    const optionLabels = dbType === "select" ? options.split(",").map((s) => s.trim()).filter(Boolean) : [];
    if (dbType === "select" && !optionLabels.length) optionLabels.push("Option 1");
    setSaving(true);
    try {
      await onCreate({ name: name.trim() || "New property", type: dbType, options: optionLabels, insertAfterId, isMulti, keyPrefix });
      handleClose();
    } catch {
      // Already surfaced as a toast by the caller — keep the menu open so the user can retry.
    } finally {
      setSaving(false);
    }
  }

  const showsOptions = type === "select" || type === "status" || type === "multiselect";

  return (
    <Popover anchor={anchor} onClose={handleClose} width={260} className="create-property-menu">
      <div className="create-property-heading">New property</div>
      <form onSubmit={handleSubmit}>
        <input
          className="input create-property-name"
          type="text"
          placeholder="Property name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />

        {showsOptions && (
          <input
            className="input"
            type="text"
            placeholder="Options, comma separated"
            value={options}
            onChange={(e) => setOptions(e.target.value)}
            style={{ marginTop: "0.375rem" }}
          />
        )}

        <div className="create-property-label">Choose property type</div>
        <div className="property-type-list">
          {PROPERTY_TYPES.map((t) => (
            <button key={t.value} type="button" className={`property-type-row${t.value === type ? " is-selected" : ""}`} onClick={() => setType(t.value)}>
              <Icon name={t.icon} />
              <span className="property-type-text">
                <strong>{t.label}</strong>
                <small>{t.description}</small>
              </span>
            </button>
          ))}
        </div>

        <div className="create-property-actions">
          <button className="btn btn-ghost" type="button" onClick={handleClose}>
            Cancel
          </button>
          <button className="btn btn-primary" type="submit" disabled={!type || saving}>
            Add property
          </button>
        </div>
      </form>
    </Popover>
  );
}
