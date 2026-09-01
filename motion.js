(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobileStackQuery = window.matchMedia("(max-width: 880px)");
  const sectionElements = document.body.classList.contains("portfolio-page")
    ? []
    : [...document.querySelectorAll("main > section")];
  const featuredSection = document.querySelector(".featured");
  const servicesSection = document.querySelector(".services");
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
      requestUpdate();
    },
    { passive: true }
  );

  requestUpdate();
})();
