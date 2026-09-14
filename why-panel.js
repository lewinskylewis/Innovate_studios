/*
 * Innov8 Studios - "Why Innovate" full-screen panel. Toggled by two
 * buttons that share the same .value-tab look (one on the Value section,
 * one inside the panel itself, at the same on-screen position) so the
 * user experiences it as a single tag that opens the panel by sliding it
 * in from the right, then slides it back out again. Deliberately kept in
 * its own file, independent of motion.js's scroll-driven section system -
 * this is a simple class toggle, nothing here reads or drives scroll
 * position.
 */
(() => {
  "use strict";

  const panel = document.getElementById("whyPanel");
  const openButton = document.getElementById("whyPanelOpen");
  const closeButton = document.getElementById("whyPanelClose");
  if (!panel || !openButton || !closeButton) return;

  function setOpen(isOpen) {
    panel.classList.toggle("is-open", isOpen);
    panel.setAttribute("aria-hidden", isOpen ? "false" : "true");
    openButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
    closeButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
    document.body.classList.toggle("why-panel-open", isOpen);

    if (isOpen) {
      closeButton.focus({ preventScroll: true });
    } else {
      openButton.focus({ preventScroll: true });
    }
  }

  openButton.addEventListener("click", () => setOpen(true));
  closeButton.addEventListener("click", () => setOpen(false));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && panel.classList.contains("is-open")) {
      setOpen(false);
    }
  });
})();
