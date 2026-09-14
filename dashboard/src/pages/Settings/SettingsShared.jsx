/*
 * Innov8 Studios — small building blocks shared by every Settings
 * section: the label/description/control row the whole module is built
 * from, a toggle switch (no equivalent exists elsewhere in the app),
 * a section heading, and a "Saved" indicator — deliberately not a
 * toast, per the spec's "do not use intrusive toast notifications for
 * every field change".
 */
export function SettingsSection({ title, description, children }) {
  return (
    <div className="settings-section">
      <div className="settings-section-title">{title}</div>
      {description && <div className="settings-section-desc">{description}</div>}
      {children}
    </div>
  );
}

export function SettingRow({ label, description, children }) {
  return (
    <div className="settings-row">
      <div className="settings-row-main">
        <strong>{label}</strong>
        {description && <span>{description}</span>}
      </div>
      <div className="settings-row-control">{children}</div>
    </div>
  );
}

export function Toggle({ checked, onChange, disabled }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange?.(e.target.checked)} />
      <span className="switch-track" />
    </label>
  );
}

export function SavedIndicator({ visible }) {
  if (!visible) return null;
  return (
    <span className="settings-saved-indicator">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 12l4 4 10-10" />
      </svg>
      Saved
    </span>
  );
}

export function SaveBar({ dirty, onDiscard, onSave, saving }) {
  if (!dirty) return null;
  return (
    <div className="settings-save-bar">
      <span>Unsaved changes</span>
      <div style={{ display: "flex", gap: "var(--space-3)" }}>
        <button className="btn btn-ghost" type="button" onClick={onDiscard}>
          Discard
        </button>
        <button className="btn btn-primary" type="button" onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

export function StatusDot({ state }) {
  return <span className={`settings-status-dot is-${state}`} />;
}
