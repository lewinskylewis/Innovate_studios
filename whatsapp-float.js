/*
 * Innov8 Studios - floating, draggable WhatsApp button.
 * Injected on every page that includes this file (see index.html,
 * about.html, portfolio.html). Fixed-position by design, so page scroll
 * and the site's reveal animations (motion.js) never touch it; dragging
 * is done manually with Pointer Events so one code path covers mouse and
 * touch, and the last dropped position is remembered per-visitor via
 * localStorage (stored as a viewport fraction so it stays sensible if
 * the window is later resized).
 */
(() => {
  "use strict";

  const WHATSAPP_URL = "https://wa.me/254706927374";
  const STORAGE_KEY = "innov8-whatsapp-pos";
  const DRAG_THRESHOLD = 6; // px of pointer movement before a press counts as a drag, not a click

  function createButton() {
    const link = document.createElement("a");
    link.href = WHATSAPP_URL;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "whatsapp-float";
    link.setAttribute("aria-label", "Chat with us on WhatsApp");
    link.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="12" fill="#25D366"></circle>
        <path fill="#fff" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"></path>
        <path fill="#fff" d="M12.041 2C6.505 2 2 6.477 2 11.978c0 1.98.581 3.83 1.583 5.386L2 22l4.78-1.548a10.03 10.03 0 0 0 5.261 1.474h.004c5.536 0 10.041-4.476 10.041-9.977C22.086 6.448 17.581 2 12.041 2zm0 18.25h-.003a8.19 8.19 0 0 1-4.194-1.152l-.301-.179-3.117 1.009 1.018-3.045-.196-.312a8.207 8.207 0 0 1-1.256-4.393c0-4.542 3.694-8.238 8.253-8.238 2.204 0 4.276.86 5.834 2.42a8.2 8.2 0 0 1 2.417 5.826c0 4.542-3.699 8.238-8.255 8.238z"></path>
      </svg>
    `;
    return link;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function applyPosition(el, left, top) {
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.right = "auto";
    el.style.bottom = "auto";
  }

  function loadPosition(el) {
    let stored = null;
    try {
      stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (err) {
      stored = null;
    }
    if (!stored || typeof stored.xPct !== "number" || typeof stored.yPct !== "number") return;

    const rect = el.getBoundingClientRect();
    const maxLeft = window.innerWidth - rect.width;
    const maxTop = window.innerHeight - rect.height;
    const left = clamp(stored.xPct * window.innerWidth, 0, Math.max(maxLeft, 0));
    const top = clamp(stored.yPct * window.innerHeight, 0, Math.max(maxTop, 0));
    applyPosition(el, left, top);
  }

  function savePosition(el) {
    const rect = el.getBoundingClientRect();
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ xPct: rect.left / window.innerWidth, yPct: rect.top / window.innerHeight })
      );
    } catch (err) {
      /* private browsing / storage disabled - dragging still works, it just won't be remembered */
    }
  }

  function initDrag(el) {
    let pointerId = null;
    let startX = 0;
    let startY = 0;
    let originLeft = 0;
    let originTop = 0;
    let dragged = false;

    el.addEventListener("pointerdown", (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      pointerId = event.pointerId;
      const rect = el.getBoundingClientRect();
      originLeft = rect.left;
      originTop = rect.top;
      startX = event.clientX;
      startY = event.clientY;
      dragged = false;
      el.setPointerCapture(pointerId);
      el.classList.add("is-dragging");
    });

    el.addEventListener("pointermove", (event) => {
      if (event.pointerId !== pointerId) return;
      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      if (!dragged && Math.hypot(dx, dy) > DRAG_THRESHOLD) dragged = true;
      if (!dragged) return;

      const rect = el.getBoundingClientRect();
      const maxLeft = window.innerWidth - rect.width;
      const maxTop = window.innerHeight - rect.height;
      applyPosition(el, clamp(originLeft + dx, 0, maxLeft), clamp(originTop + dy, 0, maxTop));
    });

    function endDrag(event) {
      if (event.pointerId !== pointerId) return;
      if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId);
      el.classList.remove("is-dragging");
      pointerId = null;
      if (dragged) savePosition(el);
    }

    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);

    el.addEventListener("click", (event) => {
      if (dragged) {
        event.preventDefault();
        dragged = false;
      }
    });
  }

  function keepInViewportOnResize(el) {
    window.addEventListener("resize", () => {
      if (!el.style.left) return; // still docked at the default CSS corner, nothing to clamp
      const rect = el.getBoundingClientRect();
      const maxLeft = window.innerWidth - rect.width;
      const maxTop = window.innerHeight - rect.height;
      applyPosition(el, clamp(rect.left, 0, Math.max(maxLeft, 0)), clamp(rect.top, 0, Math.max(maxTop, 0)));
    });
  }

  function init() {
    const el = createButton();
    document.body.appendChild(el);
    loadPosition(el);
    initDrag(el);
    keepInViewportOnResize(el);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
