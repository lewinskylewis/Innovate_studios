(() => {
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const sectionElements = [...document.querySelectorAll("main > section")];
  const headingElements = [
    ...document.querySelectorAll(
      ".hero-copy h1, .featured-heading h2, .services-top h2, .academy-copy h2, .ventures-header h2, .contact-copy h2, .work-item h3, .service-item h3, .service-item h4, .venture-copy h3"
    ),
  ];
  const copyElements = [
    ...document.querySelectorAll(
      ".section-kicker, .hero-copy > p, .featured-heading > p, .services-top > div > p, .academy-copy > p, .ventures-intro, .contact-copy > p"
    ),
  ];
  const cardGroups = [
    [...document.querySelectorAll(".service-item")],
  ];

  const splitWords = (element) => {
    if (element.dataset.wordReveal === "ready") return;

    let wordOrder = 0;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const textNodes = [];

    while (walker.nextNode()) textNodes.push(walker.currentNode);

    textNodes.forEach((textNode) => {
      if (!textNode.nodeValue.trim()) return;

      const fragment = document.createDocumentFragment();
      const tokens = textNode.nodeValue.match(/\S+|\s+/g) || [];

      tokens.forEach((token) => {
        if (/^\s+$/.test(token)) {
          fragment.append(document.createTextNode(token));
          return;
        }

        const word = document.createElement("span");
        word.className = "motion-word";
        word.style.setProperty("--word-order", wordOrder);
        word.textContent = token;
        fragment.append(word);
        wordOrder += 1;
      });

      textNode.replaceWith(fragment);
    });

    element.dataset.wordReveal = "ready";
  };

  sectionElements.forEach((section, index) => {
    section.dataset.stackSection = "";
    section.style.setProperty("--stack-layer", index + 1);
  });

  headingElements.forEach(splitWords);
  copyElements.forEach((element, index) => {
    element.dataset.motionCopy = "";
    element.style.setProperty("--motion-delay", `${100 + (index % 3) * 50}ms`);
  });

  cardGroups.forEach((cards) => {
    cards.forEach((card, index) => {
      card.dataset.motionCard = "";
      card.style.setProperty("--card-order", index);
    });
  });

  const parallaxElements = [
    document.querySelector(".academy-bg"),
    document.querySelector(".venture-art img"),
  ].filter(Boolean);
  const heroContent = document.querySelector(".hero-inner");
  const featuredSection = document.querySelector(".featured");
  const featuredGrid = document.querySelector(".work-grid");

  parallaxElements.forEach((element) => {
    element.dataset.parallax = "";
  });

  root.classList.add("motion-ready");

  const mobileStackQuery = window.matchMedia("(max-width: 880px)");
  const updateMobileStackOffsets = () => {
    if (!mobileStackQuery.matches) {
      sectionElements.forEach((section) => section.style.removeProperty("--mobile-stack-top"));
      return;
    }

    const viewportHeight = window.visualViewport?.height || window.innerHeight;
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
    root.style.setProperty("--hero-exit-opacity", "1");
    featuredSection?.style.setProperty("--featured-fade", "1");
    document
      .querySelectorAll("[data-word-reveal], [data-motion-copy], [data-motion-card]")
      .forEach((element) => element.classList.add("is-motion-visible"));
    return;
  }

  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("is-motion-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.16, rootMargin: "0px 0px -8%" }
  );

  document
    .querySelectorAll("[data-word-reveal]")
    .forEach((element) => revealObserver.observe(element));

  const pendingContentSections = new Set(sectionElements);

  const revealSectionContent = (section) => {
    section
      .querySelectorAll("[data-motion-copy], [data-motion-card]")
      .forEach((element) => element.classList.add("is-motion-visible"));

    if (section === featuredSection) {
      featuredGrid?.classList.add("is-featured-visible");
    }

    pendingContentSections.delete(section);
  };

  const updateSectionContentReveals = () => {
    const viewportHeight = window.innerHeight;

    pendingContentSections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      const enteredDistance = viewportHeight - rect.top;
      const revealDistance = rect.height * 0.75;

      if (enteredDistance >= revealDistance) revealSectionContent(section);
    });
  };

  let ticking = false;

  const updateParallax = () => {
    const viewportHeight = window.innerHeight;

    updateSectionContentReveals();

    if (heroContent) {
      const rawProgress = Math.min(Math.max((window.scrollY / viewportHeight) * 2, 0), 1);
      const easedProgress = rawProgress * rawProgress * (3 - 2 * rawProgress);
      const heroOpacity = 1 - easedProgress;

      root.style.setProperty("--hero-exit-opacity", heroOpacity.toFixed(3));

      if (featuredSection) {
        featuredSection.style.setProperty("--featured-fade", easedProgress.toFixed(3));
      }
    }

    parallaxElements.forEach((element, index) => {
      const rect = element.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > viewportHeight) return;

      const progress = (viewportHeight - rect.top) / (viewportHeight + rect.height);
      const distance = index === 0 ? 16 : 24;
      const offset = (progress - 0.5) * distance;
      element.style.setProperty("--parallax-y", `${offset.toFixed(2)}px`);
    });

    ticking = false;
  };

  const requestParallax = () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateParallax);
  };

  window.addEventListener("scroll", requestParallax, { passive: true });
  window.addEventListener("resize", () => {
    updateMobileStackOffsets();
    requestParallax();
  }, { passive: true });
  requestParallax();
})();
