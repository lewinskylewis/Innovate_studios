/*
 * Innov8 Studios — /about motion system.
 * Vanilla, no dependencies, no scroll-jacking: everything here layers on
 * top of normal document flow (IntersectionObserver reveals + rAF-driven
 * parallax/cursor tracking only), and backs off entirely under
 * prefers-reduced-motion.
 */
(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- one-shot reveals ---------- */

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.2, rootMargin: "0px 0px -8% 0px" }
  );

  document.querySelectorAll("[data-reveal]").forEach((el) => revealObserver.observe(el));

  const groupObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const items = [...entry.target.querySelectorAll("[data-reveal-item]")];
        items.forEach((item, index) => {
          item.style.transitionDelay = `${index * 90}ms`;
          item.classList.add("is-in");
        });
        groupObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.2, rootMargin: "0px 0px -8% 0px" }
  );

  document.querySelectorAll("[data-reveal-group]").forEach((el) => groupObserver.observe(el));

  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        sectionObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.15 }
  );

  document.querySelectorAll(".ab-section, .ab-hero").forEach((el) => sectionObserver.observe(el));

  /* ---------- fixed rail nav: tracks whichever section owns viewport-center ---------- */

  const railItems = new Map(
    [...document.querySelectorAll("[data-rail-item]")].map((el) => [el.dataset.railItem, el])
  );

  if (railItems.size) {
    const trackObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const key = entry.target.dataset.sectionTrack;
          const target = railItems.get(key);
          if (!target) return;
          railItems.forEach((el) => el.classList.remove("is-active"));
          target.classList.add("is-active");
        });
      },
      { threshold: 0, rootMargin: "-45% 0px -45% 0px" }
    );

    document.querySelectorAll("[data-section-track]").forEach((el) => trackObserver.observe(el));
  }

  /* ---------- section 04: click-toggle for touch (hover already works via CSS) ---------- */

  document.querySelectorAll(".ab-system-node").forEach((node) => {
    node.addEventListener("click", () => {
      const wasActive = node.classList.contains("is-active");
      node.parentElement.querySelectorAll(".ab-system-node").forEach((n) => n.classList.remove("is-active"));
      if (!wasActive) node.classList.add("is-active");
    });
  });

  /* ---------- section 05: word-cycle statement ---------- */

  const cinema = document.querySelector("[data-word-cycle]");
  if (cinema) {
    const target = cinema.querySelector("[data-cycle-target]");
    const words = ["CREATIVE STUDIO", "TECHNOLOGY COMPANY", "IP HOUSE", "CREATIVE PLATFORM"];
    const finalText = cinema.dataset.cycleFinal;

    const runCycle = () => {
      if (reduceMotion) {
        target.textContent = finalText;
        cinema.classList.add("is-final");
        return;
      }
      let i = 0;
      const step = () => {
        i += 1;
        if (i >= words.length) {
          target.textContent = finalText;
          cinema.classList.add("is-final");
          return;
        }
        target.textContent = words[i];
        window.setTimeout(step, 650);
      };
      window.setTimeout(step, 650);
    };

    const cinemaObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          runCycle();
          cinemaObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.4 }
    );
    cinemaObserver.observe(cinema);
  }

  /* ---------- scroll parallax (ghost numerals, hero field) ---------- */

  const parallaxEls = [...document.querySelectorAll("[data-parallax]")].map((el) => ({
    el,
    speed: parseFloat(el.dataset.parallax) || 0
  }));

  let lastScrollY = -1;

  const applyParallax = () => {
    if (reduceMotion || !parallaxEls.length) return;
    const viewportH = window.innerHeight;
    parallaxEls.forEach(({ el, speed }) => {
      const rect = el.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > viewportH + 200) return;
      const centerOffset = rect.top + rect.height / 2 - viewportH / 2;
      el.style.transform = `translate3d(0, ${(-centerOffset * speed).toFixed(2)}px, 0)`;
    });
  };

  /* ---------- cursor glow + hero type parallax + magnetic links ---------- */

  const cursorGlow = document.querySelector("[data-cursor-glow]");
  const cursorField = document.querySelector("[data-cursor-field]");
  const cursorWords = cursorField ? [...cursorField.querySelectorAll("[data-cursor-depth]")] : [];
  const magnets = [...document.querySelectorAll("[data-magnetic]")];

  let pointerX = window.innerWidth / 2;
  let pointerY = window.innerHeight / 2;
  let glowX = pointerX;
  let glowY = pointerY;
  let rafId = null;

  const tick = () => {
    applyParallax();

    if (finePointer && !reduceMotion) {
      glowX += (pointerX - glowX) * 0.12;
      glowY += (pointerY - glowY) * 0.12;
      if (cursorGlow) cursorGlow.style.transform = `translate3d(${glowX.toFixed(1)}px, ${glowY.toFixed(1)}px, 0)`;

      if (cursorWords.length) {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight / 2;
        const dx = (pointerX - cx) / cx;
        const dy = (pointerY - cy) / cy;
        cursorWords.forEach((word) => {
          const depth = parseFloat(word.dataset.cursorDepth) || 0;
          word.style.transform = `translate3d(${(dx * depth * -14).toFixed(2)}px, ${(dy * depth * -8).toFixed(2)}px, 0)`;
        });
      }
    }

    rafId = window.requestAnimationFrame(tick);
  };

  rafId = window.requestAnimationFrame(tick);

  if (finePointer) {
    window.addEventListener(
      "mousemove",
      (event) => {
        pointerX = event.clientX;
        pointerY = event.clientY;
        document.body.classList.add("ab-cursor-active");
      },
      { passive: true }
    );

    window.addEventListener("mouseleave", () => {
      document.body.classList.remove("ab-cursor-active");
    });

    magnets.forEach((magnet) => {
      let targetX = 0;
      let targetY = 0;
      let currentX = 0;
      let currentY = 0;
      let magnetRaf = null;

      const settle = () => {
        currentX += (targetX - currentX) * 0.18;
        currentY += (targetY - currentY) * 0.18;
        magnet.style.transform = `translate3d(${currentX.toFixed(2)}px, ${currentY.toFixed(2)}px, 0)`;
        if (Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05) {
          magnetRaf = window.requestAnimationFrame(settle);
        } else {
          magnetRaf = null;
        }
      };

      const nudge = () => {
        if (!magnetRaf) magnetRaf = window.requestAnimationFrame(settle);
      };

      magnet.addEventListener("mousemove", (event) => {
        if (reduceMotion) return;
        const rect = magnet.getBoundingClientRect();
        targetX = (event.clientX - rect.left - rect.width / 2) * 0.22;
        targetY = (event.clientY - rect.top - rect.height / 2) * 0.35;
        nudge();
      });

      magnet.addEventListener("mouseleave", () => {
        targetX = 0;
        targetY = 0;
        nudge();
      });
    });
  }

  window.addEventListener(
    "resize",
    () => {
      applyParallax();
    },
    { passive: true }
  );

  document.addEventListener("visibilitychange", () => {
    if (document.hidden && rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    } else if (!document.hidden && !rafId) {
      rafId = window.requestAnimationFrame(tick);
    }
  });
})();
