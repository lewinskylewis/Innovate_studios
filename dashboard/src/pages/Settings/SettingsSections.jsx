/*
 * Innov8 Studios — the 8 Settings category bodies. Kept in one file
 * (mirroring InsightsSections' consolidation) since each section is
 * small on its own and they share the same imports/patterns; real data
 * (Team Members, Project Statuses/Priorities) comes from useStudio(),
 * everything else from settingsMock.js until a real settings table
 * exists to back it.
 */
import { useMemo, useState } from "react";
import Modal from "../../components/Modal.jsx";
import { useStudio } from "../Studio/useStudio.js";
import { SettingsSection, SettingRow, Toggle, SavedIndicator, SaveBar, StatusDot } from "./SettingsShared.jsx";
import {
  generalDefaults,
  CURRENCIES,
  TIMEZONES,
  DATE_FORMATS,
  LANGUAGES,
  VISIBILITY_OPTIONS,
  clientPortalDefaults,
  financialDefaults,
  deliveryRules,
  PROTECTED_STATUS_LABELS,
  ROLES,
  ROLE_DESCRIPTIONS,
  PERMISSION_MATRIX,
  notificationChannels,
  notificationEvents,
  TIMING_OPTIONS,
  integrations,
  comingSoonIntegrations,
  securityState,
  exportCategories,
  systemStatus,
  activityLog,
  versionInfo
} from "./settingsMock.js";

/* ---------------------------------------------------------------- General */

export function GeneralSection() {
  const [values, setValues] = useState(generalDefaults);
  const [saved, setValues0] = useState(generalDefaults);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);

  function set(key, value) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    setSaving(false);
    setValues0(values);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2500);
  }

  function handleDiscard() {
    setValues(saved);
  }

  return (
    <>
      <SettingsSection title="Studio identity">
        <div className="settings-field-grid">
          <label className="field-label">
            Studio name
            <input className="input" value={values.studioName} onChange={(e) => set("studioName", e.target.value)} />
          </label>
          <label className="field-label">
            Business email
            <input className="input" type="email" value={values.businessEmail} onChange={(e) => set("businessEmail", e.target.value)} />
          </label>
          <label className="field-label">
            Phone
            <input className="input" value={values.phone} onChange={(e) => set("phone", e.target.value)} />
          </label>
          <label className="field-label">
            Website
            <input className="input" value={values.website} onChange={(e) => set("website", e.target.value)} />
          </label>
          <label className="field-label">
            Location
            <input className="input" value={values.location} onChange={(e) => set("location", e.target.value)} />
          </label>
          <label className="field-label">
            Language
            <select className="input select" value={values.language} onChange={(e) => set("language", e.target.value)}>
              {LANGUAGES.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </label>
        </div>
      </SettingsSection>

      <SettingsSection title="Business defaults">
        <div className="settings-field-grid">
          <label className="field-label">
            Currency
            <select className="input select" value={values.currency} onChange={(e) => set("currency", e.target.value.split(" ")[0])}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c.split(" ")[0]}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            Timezone
            <select className="input select" value={values.timezone} onChange={(e) => set("timezone", e.target.value)}>
              {TIMEZONES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="field-label">
            Date format
            <select className="input select" value={values.dateFormat} onChange={(e) => set("dateFormat", e.target.value)}>
              {DATE_FORMATS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </label>
        </div>
      </SettingsSection>

      <SettingsSection title="Project defaults" description="Applied automatically whenever a new project is created.">
        <div className="settings-field-grid">
          <label className="field-label">
            Default status
            <input className="input" value={values.defaultProjectStatus} onChange={(e) => set("defaultProjectStatus", e.target.value)} />
          </label>
          <label className="field-label">
            Default priority
            <input className="input" value={values.defaultProjectPriority} onChange={(e) => set("defaultProjectPriority", e.target.value)} />
          </label>
          <label className="field-label">
            Default visibility
            <select className="input select" value={values.defaultProjectVisibility} onChange={(e) => set("defaultProjectVisibility", e.target.value)}>
              {VISIBILITY_OPTIONS.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>
      </SettingsSection>

      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", marginTop: "var(--space-2)" }}>
        <SavedIndicator visible={justSaved} />
      </div>

      <SaveBar dirty={dirty} saving={saving} onDiscard={handleDiscard} onSave={handleSave} />
    </>
  );
}

/* ----------------------------------------------------------------- Studio */

function AddStatusRow({ kind, onAdd }) {
  const [value, setValue] = useState("");
  return (
    <div className="settings-row">
      <div className="settings-row-control" style={{ display: "flex", gap: "var(--space-2)", width: "100%" }}>
        <input
          className="input"
          placeholder={kind === "project_status" ? "New status name" : "New priority name"}
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button
          className="btn btn-ghost"
          type="button"
          disabled={!value.trim()}
          onClick={() => {
            onAdd(value.trim());
            setValue("");
          }}
        >
          Add
        </button>
      </div>
    </div>
  );
}

function OptionListEditor({ kind, options, onAdd, onDelete }) {
  return (
    <>
      {options.map((o) => {
        const protectedOption = kind === "project_status" && PROTECTED_STATUS_LABELS.includes(o.label);
        return (
          <SettingRow key={o.id} label={o.label} description={protectedOption ? "System-critical — used by Delivery Status automation." : undefined}>
            {!protectedOption ? (
              <button className="btn btn-ghost" type="button" onClick={() => onDelete(o)}>
                Remove
              </button>
            ) : (
              <span className="badge badge--waiting">Protected</span>
            )}
          </SettingRow>
        );
      })}
      <AddStatusRow kind={kind} onAdd={onAdd} />
    </>
  );
}

export function StudioSection() {
  const studio = useStudio();
  const [portal, setPortal] = useState(clientPortalDefaults);
  const [financial, setFinancial] = useState(financialDefaults);

  return (
    <>
      <SettingsSection title="Project statuses" description="Add, remove or reorder the statuses projects can move through. Statuses used by Delivery Status automation cannot be removed.">
        <OptionListEditor
          kind="project_status"
          options={studio.projectStatusOptions}
          onAdd={(label) => studio.addSystemOption("project_status", label)}
          onDelete={(option) => studio.deleteSystemOption("project_status", option)}
        />
      </SettingsSection>

      <SettingsSection title="Project priorities">
        <OptionListEditor
          kind="priority"
          options={studio.priorityOptions}
          onAdd={(label) => studio.addSystemOption("priority", label)}
          onDelete={(option) => studio.deleteSystemOption("priority", option)}
        />
      </SettingsSection>

      <SettingsSection title="Delivery status rules" description="Computed automatically for every project — this is documentation, not a separate configuration.">
        {deliveryRules.map((r) => (
          <SettingRow key={r.key} label={r.label} description={r.description}>
            <span className="badge" style={{ background: `${r.color}22`, color: r.color, borderColor: `${r.color}55` }}>
              {r.label}
            </span>
          </SettingRow>
        ))}
      </SettingsSection>

      <SettingsSection title="Client portal">
        <SettingRow label="Client access" description="Allow clients to open their project's shared link.">
          <Toggle checked={portal.clientAccess} onChange={(v) => setPortal((p) => ({ ...p, clientAccess: v }))} />
        </SettingRow>
        <SettingRow label="Client comments" description="Allow clients to leave comments on their project.">
          <Toggle checked={portal.clientComments} onChange={(v) => setPortal((p) => ({ ...p, clientComments: v }))} />
        </SettingRow>
        <SettingRow label="File downloads" description="Allow clients to download files marked as client-visible.">
          <Toggle checked={portal.fileDownloads} onChange={(v) => setPortal((p) => ({ ...p, fileDownloads: v }))} />
        </SettingRow>
        <SettingRow label="Milestone visibility" description="Show milestone progress on the shared project view.">
          <Toggle checked={portal.milestoneVisibility} onChange={(v) => setPortal((p) => ({ ...p, milestoneVisibility: v }))} />
        </SettingRow>
        <SettingRow label="Financial information" description="Show budgets or pricing on the shared project view.">
          <Toggle checked={portal.financialInformation} onChange={(v) => setPortal((p) => ({ ...p, financialInformation: v }))} />
        </SettingRow>
      </SettingsSection>

      <SettingsSection title="Financial defaults">
        <div className="settings-field-grid">
          <label className="field-label">
            Currency
            <select className="input select" value={financial.currency} onChange={(e) => setFinancial((f) => ({ ...f, currency: e.target.value }))}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c.split(" ")[0]}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="field-label">
            Payment terms
            <input className="input" value={financial.paymentTerms} onChange={(e) => setFinancial((f) => ({ ...f, paymentTerms: e.target.value }))} />
          </label>
          <label className="field-label">
            Default deposit
            <input className="input" value={financial.defaultDeposit} onChange={(e) => setFinancial((f) => ({ ...f, defaultDeposit: e.target.value }))} />
          </label>
        </div>
        <SettingRow label="Tax" description="Apply tax to invoices and quotes by default.">
          <Toggle checked={financial.taxEnabled} onChange={(v) => setFinancial((f) => ({ ...f, taxEnabled: v }))} />
        </SettingRow>
      </SettingsSection>
    </>
  );
}

/* ------------------------------------------------------------ Team & Access */

function InviteMemberModal({ open, onClose }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(ROLES[3]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Invite member"
      description="Send an invitation to join the studio."
      actions={
        <>
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" type="button" onClick={onClose} disabled={!email.trim()}>
            Send invitation
          </button>
        </>
      }
    >
      <div className="settings-field-grid" style={{ gridTemplateColumns: "1fr" }}>
        <label className="field-label">
          Email address
          <input className="input" type="email" placeholder="name@studio.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field-label">
          Role
          <select className="input select" value={role} onChange={(e) => setRole(e.target.value)}>
            {ROLES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </label>
        <p style={{ color: "var(--muted)", fontSize: "var(--text-2xs)" }}>{ROLE_DESCRIPTIONS[role]}</p>
      </div>
    </Modal>
  );
}

export function TeamSection() {
  const studio = useStudio();
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <>
      <SettingsSection title="Team members">
        <div className="dash-table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {studio.team.length === 0 ? (
                <tr>
                  <td colSpan={3}>
                    <div className="empty-state">No team members yet.</div>
                  </td>
                </tr>
              ) : (
                studio.team.map((m) => (
                  <tr key={m.id}>
                    <td>{m.name}</td>
                    <td>{m.title || "—"}</td>
                    <td>
                      <span className={`badge ${m.active !== false ? "badge--active" : "badge--waiting"}`}>{m.active !== false ? "Active" : "Inactive"}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="settings-row" style={{ borderBottom: "none", paddingTop: "var(--space-4)" }}>
          <div />
          <div className="settings-row-control">
            <button className="btn btn-primary" type="button" onClick={() => setInviteOpen(true)}>
              Invite member
            </button>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Roles" description="A UI representation of the intended role system — permissions are not yet enforced by these roles.">
        <div className="dash-table-wrap">
          <table className="dash-table settings-permission-table">
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Permission</th>
                {ROLES.map((r) => (
                  <th key={r}>{r}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_MATRIX.map((row) => (
                <tr key={row.permission}>
                  <td style={{ textAlign: "left" }}>{row.permission}</td>
                  {ROLES.map((r) => (
                    <td key={r}>{row[r]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SettingsSection>

      <InviteMemberModal open={inviteOpen} onClose={() => setInviteOpen(false)} />
    </>
  );
}

/* --------------------------------------------------------- Notifications */

export function NotificationsSection() {
  const [channels, setChannels] = useState(notificationChannels);
  const [events, setEvents] = useState(notificationEvents);

  function toggleChannel(key, value) {
    setChannels((cs) => cs.map((c) => (c.key === key ? { ...c, enabled: value } : c)));
  }

  function toggleEvent(category, key, value) {
    setEvents((ev) => ({ ...ev, [category]: ev[category].map((e) => (e.key === key ? { ...e, enabled: value } : e)) }));
  }

  function setTiming(category, key, value) {
    setEvents((ev) => ({ ...ev, [category]: ev[category].map((e) => (e.key === key ? { ...e, timing: value } : e)) }));
  }

  return (
    <>
      <SettingsSection title="Channels">
        {channels.map((c) => (
          <SettingRow key={c.key} label={c.label} description={c.description}>
            <Toggle checked={c.enabled} disabled={!c.editable} onChange={(v) => toggleChannel(c.key, v)} />
          </SettingRow>
        ))}
      </SettingsSection>

      {Object.entries(events).map(([category, items]) => (
        <SettingsSection key={category} title={category}>
          {items.map((e) => (
            <SettingRow key={e.key} label={e.label}>
              {e.timing !== undefined && e.enabled && (
                <select className="input select" value={e.timing} onChange={(ev) => setTiming(category, e.key, ev.target.value)}>
                  {TIMING_OPTIONS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              )}
              <Toggle checked={e.enabled} onChange={(v) => toggleEvent(category, e.key, v)} />
            </SettingRow>
          ))}
        </SettingsSection>
      ))}
    </>
  );
}

/* ---------------------------------------------------------- Integrations */

export function IntegrationsSection() {
  const [active, setActive] = useState(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  return (
    <>
      <SettingsSection title="Connected services">
        {integrations.map((i) => (
          <div className="settings-integration-row" key={i.key} onClick={() => setActive(i)} role="button" tabIndex={0}>
            <span className="settings-integration-icon">{i.initials}</span>
            <div className="settings-integration-main">
              <strong>{i.name}</strong>
              <span>{i.purpose}</span>
            </div>
            <span className={`badge ${i.status === "connected" ? "badge--active" : "badge--waiting"}`}>
              {i.status === "connected" ? "Connected" : "Not connected"}
            </span>
          </div>
        ))}
      </SettingsSection>

      <SettingsSection title="Coming soon" description="Planned integrations, not yet available.">
        {comingSoonIntegrations.map((name) => (
          <SettingRow key={name} label={name}>
            <span className="badge badge--soon">Coming soon</span>
          </SettingRow>
        ))}
      </SettingsSection>

      <Modal
        open={!!active}
        onClose={() => {
          setActive(null);
          setConfirmDisconnect(false);
        }}
        title={active?.name}
        description={active?.purpose}
        actions={
          active?.status === "connected" ? (
            !confirmDisconnect ? (
              <>
                <button className="btn btn-ghost" type="button">
                  Configure
                </button>
                <button className="btn btn-ghost" type="button" onClick={() => setConfirmDisconnect(true)}>
                  Disconnect
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-ghost" type="button" onClick={() => setConfirmDisconnect(false)}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  type="button"
                  style={{ background: "var(--danger)", borderColor: "var(--danger)" }}
                  onClick={() => {
                    setActive(null);
                    setConfirmDisconnect(false);
                  }}
                >
                  Confirm disconnect
                </button>
              </>
            )
          ) : (
            <button className="btn btn-primary" type="button">
              Reconnect
            </button>
          )
        }
      >
        {active && (
          <div className="settings-section">
            {confirmDisconnect ? (
              <p style={{ color: "var(--danger)" }}>Disconnecting {active.name} may affect features that depend on it. This cannot be undone from here.</p>
            ) : (
              <>
                <SettingRow label="Status">
                  <span className={`badge ${active.status === "connected" ? "badge--active" : "badge--waiting"}`}>
                    {active.status === "connected" ? "Connected" : "Not connected"}
                  </span>
                </SettingRow>
                {active.lastSync && <SettingRow label="Last sync">{active.lastSync}</SettingRow>}
              </>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}

/* ----------------------------------------------------------- Appearance */

export function AppearanceSection() {
  const [theme, setTheme] = useState("Dark");
  const [background, setBackground] = useState("Default");
  const [overlay, setOverlay] = useState(60);
  const [preview, setPreview] = useState(null);

  return (
    <>
      <SettingsSection title="Theme">
        <SettingRow label="Appearance" description="Choose how the dashboard looks.">
          <div className="settings-segmented">
            {["Dark", "Light", "System"].map((t) => (
              <button key={t} type="button" className={theme === t ? "is-active" : ""} onClick={() => setTheme(t)}>
                {t}
              </button>
            ))}
          </div>
        </SettingRow>
      </SettingsSection>

      <SettingsSection title="Background">
        <SettingRow label="Background" description="Use the default studio background or upload your own.">
          <div className="settings-segmented">
            {["Default", "Custom image"].map((b) => (
              <button key={b} type="button" className={background === b ? "is-active" : ""} onClick={() => setBackground(b)}>
                {b}
              </button>
            ))}
          </div>
        </SettingRow>
        {background === "Custom image" && (
          <SettingRow label="Upload image" description="PNG or JPG, used behind the dashboard content.">
            <input
              type="file"
              accept="image/*"
              className="input"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setPreview(URL.createObjectURL(file));
              }}
            />
          </SettingRow>
        )}
        {background === "Custom image" && preview && (
          <div className="settings-row" style={{ borderBottom: "none" }}>
            <div />
            <div className="settings-row-control">
              <img src={preview} alt="Background preview" style={{ maxWidth: "12rem", borderRadius: "var(--radius-md)", border: "1px solid var(--line)" }} />
            </div>
          </div>
        )}
        <SettingRow label="Background overlay" description="Darken the background so content stays readable.">
          <input type="range" min={0} max={100} value={overlay} onChange={(e) => setOverlay(Number(e.target.value))} />
          <span style={{ color: "var(--muted)", fontSize: "var(--text-2xs)", marginLeft: "var(--space-2)" }}>{overlay}%</span>
        </SettingRow>
      </SettingsSection>
    </>
  );
}

/* ------------------------------------------------------------- Security */

function DangerConfirmModal({ open, onClose, label }) {
  const [confirmText, setConfirmText] = useState("");
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={label}
      description="This action is permanent and cannot be undone."
      actions={
        <>
          <button className="btn btn-ghost" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            type="button"
            style={{ background: "var(--danger)", borderColor: "var(--danger)" }}
            disabled={confirmText !== "DELETE"}
            onClick={onClose}
          >
            {label}
          </button>
        </>
      }
    >
      <label className="field-label">
        Type DELETE to confirm
        <input className="input" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
      </label>
    </Modal>
  );
}

export function SecuritySection() {
  const [confirmKind, setConfirmKind] = useState(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportPicked, setExportPicked] = useState([]);

  const dangerActions = [
    { key: "project", label: "Delete project data", description: "Permanently remove all projects, milestones and files." },
    { key: "workspace", label: "Delete workspace data", description: "Permanently remove all studio data, keeping only your account." },
    { key: "account", label: "Delete account", description: "Permanently delete your account and remove your access." }
  ];

  return (
    <>
      <SettingsSection title="Password">
        <SettingRow label="Change password" description="Update the password used to sign in.">
          <button className="btn btn-ghost" type="button">
            Change password
          </button>
        </SettingRow>
      </SettingsSection>

      <SettingsSection title="Active sessions">
        {securityState.sessions.map((s) => (
          <SettingRow key={s.id} label={s.device} description={`${s.browser} · ${s.location} · ${s.lastActive}`}>
            {s.current ? <span className="badge badge--active">This device</span> : (
              <button className="btn btn-ghost" type="button">
                Sign out
              </button>
            )}
          </SettingRow>
        ))}
      </SettingsSection>

      <SettingsSection title="Two-factor authentication">
        <SettingRow label="2FA" description="Add an extra layer of security to your account.">
          <span className="badge badge--waiting">Not enabled</span>
        </SettingRow>
      </SettingsSection>

      <SettingsSection title="Export data">
        <SettingRow label="Export your studio data" description="Download a copy of your data by category.">
          <button className="btn btn-ghost" type="button" onClick={() => setExportOpen(true)}>
            Export data
          </button>
        </SettingRow>
      </SettingsSection>

      <SettingsSection title="Backups">
        <SettingRow label="Last backup" description={securityState.lastBackup}>
          <span className="badge badge--active">{securityState.backupStatus}</span>
        </SettingRow>
        <SettingRow label="Create backup">
          <button className="btn btn-ghost" type="button">
            Create backup
          </button>
        </SettingRow>
      </SettingsSection>

      <div className="settings-danger-zone">
        <div className="settings-section-title">Danger zone</div>
        {dangerActions.map((a) => (
          <div className="settings-danger-row" key={a.key}>
            <div className="settings-row-main">
              <strong>{a.label}</strong>
              <span>{a.description}</span>
            </div>
            <button className="btn btn-ghost" type="button" onClick={() => setConfirmKind(a.label)}>
              {a.label}
            </button>
          </div>
        ))}
      </div>

      <DangerConfirmModal open={!!confirmKind} onClose={() => setConfirmKind(null)} label={confirmKind} />

      <Modal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Export data"
        description="Choose what to include. Export is not yet available."
        actions={
          <>
            <button className="btn btn-ghost" type="button" onClick={() => setExportOpen(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" type="button" disabled>
              Export (unavailable)
            </button>
          </>
        }
      >
        {exportCategories.map((c) => (
          <SettingRow key={c.key} label={c.label}>
            <Toggle
              checked={exportPicked.includes(c.key)}
              onChange={(v) => setExportPicked((p) => (v ? [...p, c.key] : p.filter((k) => k !== c.key)))}
            />
          </SettingRow>
        ))}
      </Modal>
    </>
  );
}

/* --------------------------------------------------------------- System */

export function SystemSection() {
  return (
    <>
      <SettingsSection title="System status">
        <div className="settings-status-list">
          {systemStatus.map((s) => (
            <div className="settings-status-row" key={s.key}>
              <StatusDot state={s.state} />
              <span>{s.label}</span>
              <span style={{ marginLeft: "auto", color: "var(--muted)", fontSize: "var(--text-2xs)" }}>{s.detail || "Healthy"}</span>
            </div>
          ))}
        </div>
      </SettingsSection>

      <SettingsSection title="Activity log">
        {activityLog.map((a) => (
          <SettingRow key={a.id} label={a.text} description={a.meta}>
            <span style={{ color: "var(--faint)", fontSize: "var(--text-2xs)" }}>{a.time}</span>
          </SettingRow>
        ))}
        <div className="settings-row" style={{ borderBottom: "none" }}>
          <div />
          <div className="settings-row-control">
            <button className="btn btn-ghost" type="button">
              View all activity
            </button>
          </div>
        </div>
      </SettingsSection>

      <div style={{ marginTop: "var(--space-6)", paddingTop: "var(--space-4)", borderTop: "1px solid var(--line-soft)", color: "var(--faint)", fontSize: "var(--text-2xs)" }}>
        {versionInfo.version} · Last deployment {versionInfo.lastDeployment}
      </div>
    </>
  );
}
