/*
 * Innov8 Studios - "Why Innovate" spatial drawer. Toggled by the trigger
 * tab on the Value section and the panel's own close control, sliding in
 * from the right while the .why-scrim dims (but doesn't hide) the page
 * behind it. Deliberately kept in its own file, independent of motion.js's
 * scroll-driven section system - this is a simple class toggle, nothing
 * here reads or drives scroll position.
 */
(() => {
  "use strict";

  const panel = document.getElementById("whyPanel");
  // Two trigger buttons share this panel: #whyPanelOpen (nested in .value,
  // shown on desktop/tablet) and #whyPanelOpenMobile (a plain sibling of
  // .value, shown only below the mobile breakpoint - see .value-tab--mobile
  // in styles.css for why it has to live outside .value in the markup).
  // CSS display:none/flex between them is mutually exclusive per
  // breakpoint, so only one is ever visible/focusable at a time.
  const openButtons = [...document.querySelectorAll("#whyPanelOpen, #whyPanelOpenMobile")];
  const closeButton = document.getElementById("whyPanelClose");
  const scrim = document.querySelector("[data-why-scrim]");
  if (!panel || !openButtons.length || !closeButton) return;

  function setOpen(isOpen) {
    panel.classList.toggle("is-open", isOpen);
    panel.setAttribute("aria-hidden", isOpen ? "false" : "true");
    openButtons.forEach((btn) => btn.setAttribute("aria-expanded", isOpen ? "true" : "false"));
    closeButton.setAttribute("aria-expanded", isOpen ? "true" : "false");
    document.body.classList.toggle("why-panel-open", isOpen);

    if (isOpen) {
      closeButton.focus({ preventScroll: true });
    } else {
      const visibleTrigger = openButtons.find((btn) => btn.offsetParent !== null) || openButtons[0];
      visibleTrigger.focus({ preventScroll: true });
    }
  }

  openButtons.forEach((btn) => btn.addEventListener("click", () => setOpen(true)));
  closeButton.addEventListener("click", () => setOpen(false));
  scrim?.addEventListener("click", () => setOpen(false));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && panel.classList.contains("is-open")) {
      setOpen(false);
    }
  });

  /* ---------- restrained cursor-reactive image drift (image only, not the whole panel) ---------- */

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const imageFigure = document.querySelector("[data-why-image]");
  const imageEl = document.querySelector("[data-why-image-el]");

  if (!reduceMotion && imageFigure && imageEl) {
    imageFigure.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch") return;
      const rect = imageFigure.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      imageEl.style.transform = `translate3d(${x * -12}px, ${y * -12}px, 0) scale(1.04)`;
    });

    imageFigure.addEventListener("pointerleave", () => {
      imageEl.style.transform = "";
    });
  }
})();
