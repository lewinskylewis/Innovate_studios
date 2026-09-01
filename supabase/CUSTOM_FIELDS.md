# `projects.custom_fields` — documented shape

The database only enforces that `custom_fields` is a JSON **object**
(`check (jsonb_typeof(custom_fields) = 'object')` in
`20260831000006_projects.sql`). Everything below that — which keys are
legal, and what a value must look like for a given field's `type` — is
validated in the data layer (`dashboard/js/data/projectFields.js`), not by a
Postgres function. That's a deliberate trade-off, not an oversight: a
PL/pgSQL validator that re-implements ten field-type rules is exactly the
kind of complexity the approved architecture explicitly avoided in favor of
JSONB + a metadata table. Every write to `custom_fields` goes through one
function (`setCustomFieldValue`), so this is the single place the rule is
enforced — not scattered across render call sites.

## Shape

```json
{
  "<project_fields.key>": <value>
}
```

Only keys belonging to a `project_fields` row where `system = false` ever
appear here. System fields (`title`, `client`, `assignee`, `startDate`,
`deadline`, `priority`, `status`, `estimatedValue`) are real columns and
never duplicated into this object.

## Value shape by `project_fields.type`

| type       | Value stored in `custom_fields`                          | Validated against              |
|------------|-----------------------------------------------------------|---------------------------------|
| `text`, `longtext`, `url` | string                                       | —                                |
| `number`   | number                                                     | —                                |
| `money`    | number                                                     | `>= 0`                          |
| `date`     | `"YYYY-MM-DD"` string                                      | valid ISO date                  |
| `checkbox` | boolean                                                    | —                                |
| `select`   | `project_field_options.id` (uuid string) or `null`         | row exists, `field_id` matches  |
| `person`   | array of `team_members.id` (uuid strings)                  | every id exists                 |
| `file`     | `project_files.id` (uuid string) or `null`                 | row exists, same `project_id`   |

`select` and `person` intentionally store **ids**, not labels — the same
discipline as the system `status`/`priority` columns, so renaming an option
or a team member never orphans a value.

## Where this is enforced

- **Frontend, before it ever reaches the network:** the cell editors in
  `studio.js` only ever produce values matching the table above (a select
  cell's popover writes an option id, a person cell writes an array of team
  member ids, etc.) — this mirrors exactly how the pre-migration mock data
  layer already worked.
- **Data layer:** `setCustomFieldValue(project, field, value)` in
  `dashboard/js/data/projectFields.js` re-checks the value's JS type against
  `field.type` and rejects anything that doesn't match before sending the
  update — this is the one place malformed data would be caught even if a
  future UI change tried to write something else.
- **Database:** guarantees `custom_fields` is always a JSON object, so a
  malformed write can never corrupt the column into a string/array/number
  and break every other reader.
