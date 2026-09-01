/*
 * Innov8 Studios — deterministic per-person avatar colour + initials,
 * ported from the vanilla dashboard's shell.js so the same name keeps
 * the same avatar colour across the React shell too.
 */
const AVATAR_PALETTE = ["#3ddc84", "#4f8cff", "#a855f7", "#ff6a1a", "#22c1c3", "#e5484d", "#f2b705"];

export function colorForName(name) {
  if (!name) return AVATAR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

export function initials(name) {
  if (!name) return "";
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
