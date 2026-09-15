/*
 * Innov8 Studios - "How We Work": one continuous scroll-driven methodology,
 * not a carousel of five cards. Reads its own scroll progress from a tall
 * wrapper (.process-journey) with a sticky inner stage
 * (.process-stage-wrap) - the same non-scroll-jacking technique used
 * elsewhere on the site: a plain getBoundingClientRect() read each frame,
 * never a preventDefault() on scroll/wheel/touch. Entirely independent of
 * motion.js's own scroll-driven section system (.process is deliberately
 * excluded from it - see motion.js's comment on why), and its crossfade
 * math intentionally mirrors .value's updateValueStatements in motion.js
 * (same plateau/crossfade/smoothstep shape, same blur-in "coming into
 * focus" cue) so the two sections read as one continuous environment
 * rather than two independently-built pieces.
 *
 * Also drives this section's background atmosphere: a one-shot concentric
 * rings reveal and a cursor-following orange glow, both ported from
 * about.js/about.css's .ab-ring/.ab-cursor-glow so the light register
 * feels consistent with where the site already uses it.
 */
(() => {
  "use strict";

  const reduceMotionGlobal = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ---------- atmosphere: rings reveal + cursor glow, ported from about.css/js ---------- */

  const processSection = document.querySelector(".process");
  if (processSection) {
    const ringObserver = new IntersectionObserver(
      (obsEntries) => {
        obsEntries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          processSection.classList.add("is-in");
          ringObserver.disconnect();
        });
      },
      { threshold: 0.15 }
    );
    ringObserver.observe(processSection);

    const cursorGlow = processSection.querySelector("[data-process-cursor-glow]");
    if (cursorGlow && finePointer && !reduceMotionGlobal) {
      let glowX = 0;
      let glowY = 0;
      let targetX = 0;
      let targetY = 0;
      let glowTicking = false;

      const tickGlow = () => {
        glowX += (targetX - glowX) * 0.15;
        glowY += (targetY - glowY) * 0.15;
        cursorGlow.style.transform = `translate3d(${glowX.toFixed(1)}px, ${glowY.toFixed(1)}px, 0)`;
        if (Math.abs(targetX - glowX) > 0.5 || Math.abs(targetY - glowY) > 0.5) {
          requestAnimationFrame(tickGlow);
        } else {
          glowTicking = false;
        }
      };

      processSection.addEventListener(
        "pointermove",
        (event) => {
          const rect = processSection.getBoundingClientRect();
          targetX = event.clientX - rect.left;
          targetY = event.clientY - rect.top;
          processSection.classList.add("pc-cursor-active");
          if (!glowTicking) {
            glowTicking = true;
            requestAnimationFrame(tickGlow);
          }
        },
        { passive: true }
      );

      processSection.addEventListener("pointerleave", () => {
        processSection.classList.remove("pc-cursor-active");
      });
    }
  }

  const journey = document.querySelector("[data-process-journey]");
  const stageWrap = journey?.querySelector(".process-stage-wrap");
  const stack = document.querySelector("[data-process-stack]");
  const media = document.querySelector("[data-process-media]");
  const progressLabel = document.querySelector("[data-process-progress]");
  const axisFill = document.querySelector("[data-process-axis-fill]");
  const nodes = [...document.querySelectorAll("[data-process-node]")];
  if (!journey || !stageWrap || !stack) return;

  const items = [...stack.querySelectorAll(".process-stage-item")];
  const images = media ? [...media.querySelectorAll("img")] : [];
  const count = items.length;
  if (!count) return;

  const reduceMotion = reduceMotionGlobal;

  const clamp01 = (value) => Math.min(Math.max(value, 0), 1);
  const smoothstep = (t) => t * t * (3 - 2 * t);
  const CROSSFADE = 0.14;
  const RISE_PX = 24;
  const BLUR_PX = 8;

  const plateau = Math.max((1 - count * CROSSFADE) / count, 0.05);
  const step = plateau + CROSSFADE;

  if (reduceMotion) {
    // No scroll-driven progression at all - collapse the runway so there's
    // no dead scroll zone, and let the CSS defaults (stage 1 visible,
    // others at opacity 0) stand as the static presentation, the same
    // approach motion.js takes for .value under reduced motion.
    journey.style.height = "auto";
    stageWrap.style.position = "static";
    nodes.forEach((node, index) => node.classList.toggle("is-active", index === 0));
    if (progressLabel) progressLabel.textContent = `01 / ${String(count).padStart(2, "0")}`;
    return;
  }

  function getScrollProgress() {
    const rect = journey.getBoundingClientRect();
    const total = journey.offsetHeight - stageWrap.offsetHeight;
    if (total <= 0) return 0;
    return clamp01(-rect.top / total);
  }

  function update() {
    const progress = getScrollProgress();

    items.forEach((item, index) => {
      // Index 0 has no preceding state to crossfade from, so it starts
      // already settled at progress 0 instead of fading in from nothing
      // the instant the section becomes sticky-pinned.
      const plateauStart = index === 0 ? 0 : CROSSFADE + index * step;
      const plateauEnd = plateauStart + plateau;
      let direction;
      let zoneT;

      if (progress < plateauStart) {
        direction = "in";
        zoneT = clamp01((progress - (plateauStart - CROSSFADE)) / CROSSFADE);
      } else if (progress > plateauEnd) {
        direction = index === count - 1 ? "settled" : "out";
        zoneT = index === count - 1 ? 1 : clamp01(1 - (progress - plateauEnd) / CROSSFADE);
      } else {
        direction = "settled";
        zoneT = 1;
      }

      const eased = smoothstep(zoneT);
      const rise = direction === "out" ? -RISE_PX : RISE_PX;
      const offset = (1 - eased) * rise;
      const scale = 0.98 + eased * 0.02;
      const blur = (1 - eased) * BLUR_PX;

      item.style.opacity = eased.toFixed(3);
      item.style.transform = `translateY(${offset.toFixed(2)}px) scale(${scale.toFixed(3)})`;
      item.style.filter = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : "none";

      if (images[index]) images[index].style.opacity = eased.toFixed(3);
    });

    const activeIndex = Math.min(count - 1, Math.floor(progress / step));
    if (progressLabel) {
      progressLabel.textContent = `${String(activeIndex + 1).padStart(2, "0")} / ${String(count).padStart(2, "0")}`;
    }
    if (axisFill) axisFill.style.setProperty("--process-fill", `${(progress * 100).toFixed(1)}%`);

    nodes.forEach((node, index) => {
      node.classList.toggle("is-active", index === activeIndex);
      node.classList.toggle("is-passed", index < activeIndex);
    });
  }

  let ticking = false;
  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      update();
      ticking = false;
    });
  };

  nodes.forEach((node, index) => {
    node.addEventListener("click", () => {
      const targetProgress = CROSSFADE + index * step + plateau / 2;
      const total = journey.offsetHeight - stageWrap.offsetHeight;
      const journeyTop = journey.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: journeyTop + targetProgress * total, behavior: "smooth" });
    });
  });

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate, { passive: true });
  requestUpdate();
})();
