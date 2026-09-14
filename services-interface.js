/*
 * Innov8 Studios — Our Services "capability interface". Four disciplines
 * under one shared spine: selecting one moves a dot along the spine to
 * sit above it and crossfades a shared readout panel (desktop) or
 * expands the same panel inline (mobile, via CSS only - see styles.css).
 * Proper ARIA tablist with roving-tabindex arrow-key navigation.
 */
(() => {
  "use strict";

  const root = document.querySelector("[data-svc-interface]");
  if (!root) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const tablist = root.querySelector("[data-svc-tablist]");
  const tabs = [...root.querySelectorAll(".svc-tab")];
  const panels = [...root.querySelectorAll(".svc-panel")];
  const spine = root.querySelector(".svc-spine");
  const spineDot = root.querySelector("[data-spine-dot]") || spine?.querySelector(".svc-spine-dot");
  if (!tabs.length || !panels.length) return;

  let activeId = tabs.find((t) => t.classList.contains("is-active"))?.dataset.service || tabs[0].dataset.service;
  let hideTimer = null;

  const byService = (list, id) => list.find((el) => el.dataset.service === id);

  const positionDot = (tab) => {
    if (!spineDot || !spine) return;
    const spineRect = spine.getBoundingClientRect();
    const tabRect = tab.getBoundingClientRect();
    const center = tabRect.left + tabRect.width / 2 - spineRect.left;
    spineDot.style.transform = `translateX(${center.toFixed(1)}px)`;
  };

  const select = (id, { moveFocus = false } = {}) => {
    if (id === activeId && !moveFocus) return;
    const nextTab = byService(tabs, id);
    const nextPanel = byService(panels, id);
    const prevPanel = byService(panels, activeId);
    if (!nextTab || !nextPanel) return;

    tabs.forEach((tab) => {
      const isActive = tab === nextTab;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
    });

    if (prevPanel && prevPanel !== nextPanel) {
      prevPanel.classList.remove("is-shown");
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => prevPanel.classList.remove("is-active"), reduceMotion ? 0 : 380);
    }

    nextPanel.classList.add("is-active");
    if (reduceMotion) {
      nextPanel.classList.add("is-shown");
    } else {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => nextPanel.classList.add("is-shown"));
      });
    }

    activeId = id;
    positionDot(nextTab);
    if (moveFocus) nextTab.focus();
  };

  tabs.forEach((tab) => {
    const id = tab.dataset.service;
    tab.addEventListener("mouseenter", () => select(id));
    tab.addEventListener("focus", () => select(id));
    tab.addEventListener("click", () => select(id));
  });

  tablist?.addEventListener("keydown", (event) => {
    const currentIndex = tabs.findIndex((t) => t.dataset.service === activeId);
    let nextIndex = null;

    if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (currentIndex + 1) % tabs.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = tabs.length - 1;

    if (nextIndex === null) return;
    event.preventDefault();
    select(tabs[nextIndex].dataset.service, { moveFocus: true });
  });

  const initialPanel = byService(panels, activeId);
  initialPanel?.classList.add("is-shown");

  /* ---------- entrance: draw the spine in once, on scroll-into-view ---------- */

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        root.classList.add("is-in");
        positionDot(byService(tabs, activeId));
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.25 }
  );
  revealObserver.observe(root);

  /* ---------- keep the dot aligned on resize/orientation change ---------- */

  window.addEventListener(
    "resize",
    () => {
      if (root.classList.contains("is-in")) positionDot(byService(tabs, activeId));
    },
    { passive: true }
  );

  /* ---------- background depth: one faint numeral, drifting slowly ---------- */

  if (!reduceMotion) {
    const ghost = root.querySelector(".svc-ghost");
    if (ghost) {
      let ticking = false;
      const applyParallax = () => {
        const rect = root.getBoundingClientRect();
        const viewportH = window.innerHeight;
        if (rect.bottom < -200 || rect.top > viewportH + 200) {
          ticking = false;
          return;
        }
        const centerOffset = rect.top + rect.height / 2 - viewportH / 2;
        ghost.style.transform = `translate3d(0, ${(-centerOffset * 0.05).toFixed(2)}px, 0)`;
        ticking = false;
      };
      const requestParallax = () => {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(applyParallax);
      };
      window.addEventListener("scroll", requestParallax, { passive: true });
      requestParallax();
    }
  }
})();
