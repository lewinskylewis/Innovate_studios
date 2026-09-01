/*
 * Innov8 Studios — the Studio table's property-type catalogue: one
 * definition per type shown in the "Add property" / "Change property
 * type" pickers (icon, label, short description) plus the mapping from
 * a picked type to the underlying storage representation.
 *
 * The database only allows a fixed set of project_fields.type values
 * (see supabase/migrations/20260831000007_project_fields.sql's CHECK
 * constraint: text/number/money/date/select/person/checkbox/url/file/
 * longtext) — untouched by this overhaul. Email, Phone, Status and
 * Multi-select are richer *semantic* types layered on top of that same
 * fixed set rather than new database values:
 *   - Multi-select is type "select" with is_multi = true (the column
 *     already existed for this; it just wasn't offered on select fields
 *     before).
 *   - Email and Phone are type "text" whose `key` is prefixed
 *     (custom_email_…, custom_phone_…) at creation time.
 *   - Status is type "select" whose `key` is prefixed (custom_status_…).
 * effectiveType() below reads a field back out to its semantic type from
 * (type, is_multi, key) so the rest of the UI never has to think about
 * the underlying encoding. This keeps a single property system (still
 * just project_fields/project_field_options) instead of a parallel one.
 */

export const PROPERTY_TYPES = [
  { value: "text", label: "Text", description: "Plain text", icon: "text" },
  { value: "number", label: "Number", description: "Integers or decimals", icon: "number" },
  { value: "select", label: "Select", description: "One option", icon: "select" },
  { value: "status", label: "Status", description: "A workflow state", icon: "status" },
  { value: "multiselect", label: "Multi-select", description: "Multiple options", icon: "multiselect" },
  { value: "person", label: "Person", description: "A Studio team member", icon: "person" },
  { value: "checkbox", label: "Checkbox", description: "Yes / no", icon: "checkbox" },
  { value: "date", label: "Date", description: "A calendar date", icon: "date" },
  { value: "file", label: "Files & media", description: "Uploaded files", icon: "file" },
  { value: "url", label: "URL", description: "A link", icon: "url" },
  { value: "email", label: "Email", description: "An email address", icon: "email" },
  { value: "phone", label: "Phone", description: "A phone number", icon: "phone" }
];

export const PROPERTY_TYPE_ICONS = {
  text: '<path d="M4 6h16"/><path d="M4 12h11"/><path d="M4 18h7"/>',
  number: '<path d="M9 4 7 20"/><path d="M17 4 15 20"/><path d="M4 9h16"/><path d="M3 15h16"/>',
  money: '<path d="M12 4v16"/><path d="M16 7.5c0-1.6-1.8-2.5-4-2.5s-4 1-4 2.5c0 3 8 1.3 8 4.7 0 1.6-1.8 2.7-4 2.7s-4-1-4-2.7"/>',
  select: '<path d="m6 9 6 6 6-6"/><circle cx="12" cy="12" r="9"/>',
  status: '<circle cx="12" cy="12" r="9"/><path d="M8.5 12.5 11 15l4.5-5"/>',
  multiselect: '<rect x="3.5" y="6" width="8" height="5" rx="1.5"/><rect x="12.5" y="13" width="8" height="5" rx="1.5"/>',
  person: '<circle cx="12" cy="8.5" r="3.2"/><path d="M5 20c0-3.6 3-6.5 7-6.5s7 2.9 7 6.5"/>',
  checkbox: '<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8.5 12 2.5 2.5 5-5"/>',
  date: '<rect x="3.5" y="5.5" width="17" height="15" rx="2"/><path d="M8 3.5v4"/><path d="M16 3.5v4"/><path d="M3.5 10.5h17"/>',
  file: '<path d="M7 3.5h7l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-16a1 1 0 0 1 1-1z"/><path d="M14 3.5v4h4"/>',
  url: '<path d="M9.5 14.5 14.5 9.5"/><path d="M11 6.5 12.7 4.8a3.6 3.6 0 0 1 5 5L16 11.5"/><path d="M13 17.5 11.3 19.2a3.6 3.6 0 0 1-5-5L8 12.5"/>',
  email: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="m4.5 7 7.5 6 7.5-6"/>',
  phone: '<path d="M6.5 3.5h3l1.2 4.5-2.3 1.7a12 12 0 0 0 5.4 5.4l1.7-2.3 4.5 1.2v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2Z"/>'
};

export function effectiveType(field) {
  const key = field.id || "";
  if (field.type === "text" && key.startsWith("custom_email_")) return "email";
  if (field.type === "text" && key.startsWith("custom_phone_")) return "phone";
  if (field.type === "select" && field.multi) return "multiselect";
  if (field.type === "select" && key.startsWith("custom_status_")) return "status";
  return field.type;
}

export function iconFor(field) {
  return PROPERTY_TYPE_ICONS[effectiveType(field)] || PROPERTY_TYPE_ICONS.text;
}

/* Turns a picked semantic type (from PROPERTY_TYPES) into the storage
   representation createField()/changeFieldType() actually persist. */
export function storageForType(semanticType) {
  switch (semanticType) {
    case "status":
      return { type: "select", isMulti: false, keyPrefix: "status" };
    case "multiselect":
      return { type: "select", isMulti: true, keyPrefix: null };
    case "email":
      return { type: "text", isMulti: false, keyPrefix: "email" };
    case "phone":
      return { type: "text", isMulti: false, keyPrefix: "phone" };
    default:
      return { type: semanticType, isMulti: false, keyPrefix: null };
  }
}
