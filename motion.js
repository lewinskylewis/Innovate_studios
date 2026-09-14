(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobileStackQuery = window.matchMedia("(max-width: 880px)");
  // .services and .process are a deliberate exception to the sticky-stack
  // system: they scroll up together as one plain, traditional block (no
  // sticky pin, no wipe mask, no overlap) instead of stacking, so both are
  // excluded from sectionElements entirely - see their z-index in
  // styles.css for how they still cover Value while passing over it.
  const sectionElements = document.body.classList.contains("portfolio-page")
    ? []
    : [...document.querySelectorAll("main > section:not(.process):not(.services)")];
  const featuredSection = document.querySelector(".featured");
  const servicesSection = document.querySelector(".services");
  const valueSection = document.querySelector(".value");
  const valueStatements = valueSection
    ? [...valueSection.querySelectorAll(".value-statement")].map((el) => ({
        el,
        lines: [...el.querySelectorAll(".value-line")]
      }))
    : [];
  const heroHeader = document.querySelector("[data-header]");
  const getViewportHeight = () => window.visualViewport?.height || window.innerHeight;
  const getIncomingProgress = (section, viewportHeight) => {
    if (!section) return 0;

    const incomingTop = section.getBoundingClientRect().top;
    return incomingTop < viewportHeight - 1
      ? Math.min(Math.max((viewportHeight - incomingTop) / viewportHeight, 0), 1)
      : 0;
  };
  const updateServicesCorner = (rawProgress, animate = true) => {
    if (!servicesSection) return;

    const startingRadius = mobileStackQuery.matches
      ? 48
      : Math.min(Math.max(window.innerWidth * 0.07, 70), 112);
    const linearMorphProgress = Math.min(Math.max((rawProgress - 0.5) * 2, 0), 1);
    const morphProgress = animate
      ? linearMorphProgress * linearMorphProgress * (3 - 2 * linearMorphProgress)
      : Number(rawProgress > 0.5);
    const radius = startingRadius * (1 - morphProgress);

    servicesSection.style.setProperty("--services-corner-radius", `${radius.toFixed(2)}px`);
  };

  // Each "value" statement is two independently-animated lines (see
  // styles.css's .value-statement/.value-line) sharing one grid cell with
  // its siblings, so swapping between statements is opacity/transform
  // only - never a position change. Desktop gets a dedicated scroll
  // "runway": .value is now much taller than one viewport (see
  // .motion-ready .value's --value-runway) and stays sticky-pinned for
  // that whole extra height, so Services genuinely cannot begin rising
  // until getValueProgress reaches 1 - this is a real reserved scroll
  // budget, not a compressed slice of the ordinary Value->Services
  // crossfade. Mobile has no such runway (.value reverts to its natural
  // auto height there), so it falls back to compressing the sequence
  // into the leading slice of that ordinary rawProgress, the same
  // technique this used before it had its own scroll budget.
  //
  // Within that progress range each statement gets a plateau (fully
  // settled) with a smoothstep crossfade into its neighbor; line 2's
  // crossfade is the same shape as line 1's but starts partway through
  // it (LINE_STAGGER), so it visibly trails - "Line 2 begins slightly
  // after Line 1" - while both still finish together. Everything here is
  // a pure function of scroll position: no timers drive progression, so
  // it scrubs forward and backward exactly with the user's scroll.
  const clamp01 = (value) => Math.min(Math.max(value, 0), 1);
  const smoothstep = (t) => t * t * (3 - 2 * t);
  const MOBILE_SEQUENCE_SPAN = 0.35;
  const STATEMENT_CROSSFADE = 0.08;
  const LINE_STAGGER = 0.4;
  const LINE_RISE_PX = 22;

  // .offsetTop is not trustworthy here once .value is actually stuck -
  // some engines report it shifted by the sticky offset rather than its
  // static-flow position, which would drift every frame right when we
  // need it fixed. So this is captured from getBoundingClientRect+scrollY
  // instead, and only *while* .value hasn't stuck yet (rect.top > 0):
  // once it engages, rect.top freezes at 0 and stops being useful, so the
  // last pre-stick reading is simply kept as ground truth from then on.
  let valueNaturalTop = null;

  const getValueProgress = (rawProgress) => {
    if (!valueSection) return 0;
    if (mobileStackQuery.matches) return clamp01(rawProgress / MOBILE_SEQUENCE_SPAN);

    const viewportHeight = getViewportHeight();
    const runway = valueSection.offsetHeight - viewportHeight;
    if (runway <= 1) return clamp01(rawProgress / MOBILE_SEQUENCE_SPAN);

    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    const rectTop = valueSection.getBoundingClientRect().top;
    if (rectTop > 0 || valueNaturalTop === null) {
      valueNaturalTop = rectTop + scrollY;
    }

    return clamp01((scrollY - valueNaturalTop) / runway);
  };

  const updateValueStatements = (rawProgress) => {
    const count = valueStatements.length;
    if (!count) return;

    const progress = getValueProgress(rawProgress);
    const crossfade = STATEMENT_CROSSFADE;
    const plateau = Math.max((1 - count * crossfade) / count, 0.05);
    const step = plateau + crossfade;

    valueStatements.forEach(({ lines }, index) => {
      const plateauStart = crossfade + index * step;
      const plateauEnd = plateauStart + plateau;
      let direction;
      let zoneT;

      if (progress < plateauStart) {
        direction = "in";
        zoneT = clamp01((progress - (plateauStart - crossfade)) / crossfade);
      } else if (progress > plateauEnd) {
        direction = index === count - 1 ? "settled" : "out";
        zoneT = index === count - 1 ? 1 : clamp01(1 - (progress - plateauEnd) / crossfade);
      } else {
        direction = "settled";
        zoneT = 1;
      }

      lines.forEach((line, lineIndex) => {
        let t = zoneT;
        if (direction === "in" && lineIndex === 1) {
          t = clamp01((zoneT - LINE_STAGGER) / (1 - LINE_STAGGER));
        }

        const eased = smoothstep(t);
        const rise = direction === "out" ? -LINE_RISE_PX : LINE_RISE_PX;
        const offset = (1 - eased) * rise;

        line.style.opacity = eased.toFixed(3);
        line.style.transform = `translateY(${offset.toFixed(2)}px)`;
      });
    });
  };

  const transitionPairs = sectionElements.slice(0, -1).map((section, index) => {
    const content = section.matches(".hero, .about-hero")
      ? section.querySelector(".hero-inner, .about-hero-inner")
      : section.querySelector(".section-container");

    if (!content) return null;

    content.dataset.sectionFadeContent = "";

    return {
      section,
      content,
      incomingSection: sectionElements[index + 1]
    };
  }).filter(Boolean);

  sectionElements.forEach((section, index) => {
    section.dataset.stackSection = "";
    section.style.setProperty("--stack-layer", index + 1);
  });

  root.classList.add("motion-ready");

  const updateMobileStackOffsets = () => {
    if (!mobileStackQuery.matches) {
      sectionElements.forEach((section) => section.style.removeProperty("--mobile-stack-top"));
      return;
    }

    const viewportHeight = getViewportHeight();

    sectionElements.forEach((section) => {
      const stickyTop = Math.min(0, viewportHeight - section.offsetHeight);
      section.style.setProperty("--mobile-stack-top", `${stickyTop}px`);
    });
  };

  updateMobileStackOffsets();

  if ("ResizeObserver" in window) {
    const stackResizeObserver = new ResizeObserver(updateMobileStackOffsets);
    sectionElements.forEach((section) => stackResizeObserver.observe(section));
  }

  if (mobileStackQuery.addEventListener) {
    mobileStackQuery.addEventListener("change", updateMobileStackOffsets);
  } else {
    mobileStackQuery.addListener(updateMobileStackOffsets);
  }

  window.visualViewport?.addEventListener("resize", updateMobileStackOffsets, { passive: true });

  if (reduceMotion.matches) {
    // No JS ever touches the statement lines below (they stay at their
    // CSS-default settled state), so there's nothing for .value's scroll
    // runway to pace - collapse it back to a single viewport rather than
    // leaving a long dead scroll zone with nothing animating.
    valueSection?.style.setProperty("--value-runway", "0vh");

    transitionPairs.forEach(({ content }) => {
      content.style.setProperty("--section-wipe-position", "112%");
    });
    featuredSection?.style.setProperty("--featured-fade", "1");

    const updateReducedServicesCorner = () => {
      updateServicesCorner(getIncomingProgress(servicesSection, getViewportHeight()), false);
    };

    window.visualViewport?.addEventListener("scroll", updateReducedServicesCorner, { passive: true });
    window.addEventListener("scroll", updateReducedServicesCorner, { passive: true });
    window.addEventListener("resize", updateReducedServicesCorner, { passive: true });
    updateReducedServicesCorner();
    return;
  }

  let ticking = false;

  const updateSectionTransitions = () => {
    const viewportHeight = getViewportHeight();

    transitionPairs.forEach(({ section, content, incomingSection }) => {
      const rawProgress = getIncomingProgress(incomingSection, viewportHeight);
      const easedProgress = rawProgress * rawProgress * rawProgress * (rawProgress * (rawProgress * 6 - 15) + 10);
      const proximityLead = Math.sin(Math.PI * easedProgress) * 8;
      const viewportWipePosition = 112 - easedProgress * 124 - proximityLead;
      const contentRect = content.getBoundingClientRect();
      const viewportWipePixels = (viewportWipePosition / 100) * viewportHeight;
      let contentWipePosition = 112;

      if (rawProgress >= 1) {
        contentWipePosition = -12;
      } else if (rawProgress > 0 && contentRect.height > 0) {
        contentWipePosition = ((viewportWipePixels - contentRect.top) / contentRect.height) * 100;
      }

      content.style.setProperty("--section-wipe-position", `${contentWipePosition.toFixed(2)}%`);

      if (incomingSection === servicesSection) {
        updateServicesCorner(rawProgress);
      }

      if (section === valueSection) {
        updateValueStatements(rawProgress);
      }

      const controlsHeaderFade = section.matches(".hero, .about-hero")
        || (document.body.classList.contains("portfolio-page") && section === sectionElements[0]);

      if (controlsHeaderFade) {
        featuredSection?.style.setProperty("--featured-fade", easedProgress.toFixed(3));
        heroHeader?.style.setProperty("--hero-logo-opacity", (1 - easedProgress).toFixed(3));
      }
    });

    ticking = false;
  };

  const requestUpdate = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateSectionTransitions);
  };

  window.visualViewport?.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener(
    "resize",
    () => {
      updateMobileStackOffsets();
      // Only safe to drop the cached natural-top while .value isn't
      // currently stuck (rect.top > 0) - if it's mid-sequence when a
      // resize happens, there's no single reading that could re-derive
      // its pre-stick position, so the last known value is kept rather
      // than risk recapturing a stuck rect.top of 0 as "natural".
      if (valueSection && valueSection.getBoundingClientRect().top > 0) {
        valueNaturalTop = null;
      }
      requestUpdate();
    },
    { passive: true }
  );

  requestUpdate();
})();
