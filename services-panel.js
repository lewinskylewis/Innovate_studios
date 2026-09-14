/*
 * Innov8 Studios - Services panel: hovering (or tapping, for touch/
 * keyboard) a row swaps which .services-detail block is shown on the
 * right. Pure class-toggle - CSS (see .services-detail's transition)
 * handles the actual crossfade, this just decides which one is active.
 */
(() => {
  const rows = [...document.querySelectorAll(".services-row")];
  const details = [...document.querySelectorAll(".services-detail")];
  if (!rows.length || !details.length) return;

  const activate = (id) => {
    rows.forEach((row) => row.classList.toggle("is-active", row.dataset.service === id));
    details.forEach((detail) => detail.classList.toggle("is-active", detail.dataset.service === id));
  };

  rows.forEach((row) => {
    const id = row.dataset.service;
    row.addEventListener("mouseenter", () => activate(id));
    row.addEventListener("focus", () => activate(id));
    row.addEventListener("click", () => activate(id));
  });
})();
