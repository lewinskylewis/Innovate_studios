/*
 * Innov8 Studios — generic password visibility toggle, shared by
 * login.html and reset-password.html. Wires up every
 * [data-toggle-password] button on the page: each toggles the type of
 * the <input> inside its .input-group between "password" and "text"
 * and swaps the eye / eye-off icon to match.
 */
document.querySelectorAll("[data-toggle-password]").forEach((btn) => {
  const input = btn.closest(".input-group")?.querySelector("input");
  const eyeIcon = btn.querySelector("[data-icon-eye]");
  const eyeOffIcon = btn.querySelector("[data-icon-eye-off]");
  if (!input) return;

  btn.addEventListener("click", () => {
    const reveal = input.type === "password";
    input.type = reveal ? "text" : "password";
    btn.setAttribute("aria-pressed", String(reveal));
    btn.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
    if (eyeIcon) eyeIcon.style.display = reveal ? "none" : "";
    if (eyeOffIcon) eyeOffIcon.style.display = reveal ? "" : "none";
  });
});
