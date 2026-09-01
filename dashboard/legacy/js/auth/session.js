/*
 * Innov8 Studios — auth guard + session/profile loading, shared by every
 * protected dashboard page (index.html, studio.html — not login.html).
 * Replaces the old hard-coded "Lewis Kariuki — Administrator" markup with
 * the real signed-in user, and redirects to login.html when there is no
 * session. Loaded after supabaseClient.js, before shell.js.
 *
 * Exposes, once ready:
 *   window.CURRENT_PROFILE = { id, fullName, avatarColor, permissionRole }
 *   window.CURRENT_USER    = fullName   (kept for the existing code that
 *                                        already reads this, e.g. comment
 *                                        authorship)
 *   window.IS_ADMIN         boolean
 *   window.authReady         Promise, resolves once the above are set
 *                             (or redirects to login.html and never
 *                             resolves on this page)
 */

window.CURRENT_PROFILE = null;
window.CURRENT_USER = null;
window.IS_ADMIN = false;

window.authReady = (async () => {
  await window.supabaseReady;

  if (!window.SUPABASE_READY) {
    // No Supabase configured at all (local dev without env.js) — fail
    // loudly in the console rather than silently redirect-looping.
    document.body.insertAdjacentHTML(
      "afterbegin",
      '<div style="position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:#0a0a0b;color:#f8f5ef;font-family:sans-serif;padding:2rem;text-align:center;">Dashboard is not configured — see dashboard/js/env.example.js.</div>'
    );
    return null;
  }

  const { data: { session } } = await window.supabase.auth.getSession();

  if (!session) {
    const next = encodeURIComponent(location.pathname.split("/").pop() || "index.html");
    location.href = `login.html?next=${next}`;
    return null;
  }

  const { data: profile, error } = await window.supabase
    .from("profiles")
    .select("id, full_name, avatar_color, permission_role")
    .eq("id", session.user.id)
    .single();

  if (error || !profile) {
    console.error("[auth] Signed in but no profile row found — signing out.", error);
    await window.supabase.auth.signOut();
    location.href = "login.html";
    return null;
  }

  window.CURRENT_PROFILE = {
    id: profile.id,
    fullName: profile.full_name,
    avatarColor: profile.avatar_color,
    permissionRole: profile.permission_role
  };
  window.CURRENT_USER = profile.full_name;
  window.IS_ADMIN = profile.permission_role === "admin";

  applyProfileToShell(window.CURRENT_PROFILE);

  window.supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT") location.href = "login.html";
  });

  return window.CURRENT_PROFILE;
})();

function applyProfileToShell(profile) {
  const initials = profile.fullName
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const color = profile.avatarColor || "#3ddc84";

  document.querySelectorAll(".dash-account-trigger .avatar").forEach((el) => {
    el.textContent = initials;
    el.style.background = color;
  });
  document.querySelectorAll(".dash-header-actions .avatar").forEach((el) => {
    el.textContent = initials;
  });
  document.querySelectorAll(".dash-account-info strong").forEach((el) => {
    el.textContent = profile.fullName;
  });
  document.querySelectorAll(".dash-account-info span").forEach((el) => {
    el.textContent = profile.permissionRole === "admin" ? "Administrator" : "Team member";
  });
}

document.addEventListener("click", (event) => {
  if (!event.target.closest("[data-logout]")) return;
  event.preventDefault();
  window.supabase?.auth.signOut();
});
