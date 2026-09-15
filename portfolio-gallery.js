/*
 * Innov8 Studios — Portfolio gallery. Reads window.PORTFOLIO_PROJECTS
 * (portfolio-project-data.js, the same data the individual project pages
 * render from) and builds: the hero's atmospheric cover-image fragments,
 * each category zone's symmetric tile grid, the two video-reel carousels,
 * the left sidebar mode/jump rail, the cursor-reactive glow + spotlight
 * interaction, and the in-page project popup (reusing portfolio-blocks.js,
 * the same renderer the full /portfolio/:slug pages use — those pages stay
 * fully intact as the real destination for direct links, the noscript
 * fallback, and modifier/middle-clicks; the popup is a progressive
 * enhancement on top). No WebGL, no camera, no scattered floating planes:
 * depth here comes from grid layering, scroll-revealed atmosphere and a
 * cursor-following glow, not a 3D scene.
 */
(() => {
  "use strict";

  const PROJECTS = window.PORTFOLIO_PROJECTS || {};
  const entries = Object.keys(PROJECTS)
    .map((slug) => ({ slug, ...PROJECTS[slug] }))
    .sort((a, b) => a.order - b.order);
  if (!entries.length) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  function el(tag, className) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    return node;
  }

  /* ---------- hero: atmosphere built from real cover-image fragments ---------- */

  const HERO_FRAGMENT_ORDERS = [1, 3, 5, 7, 9, 11, 13];
  const HERO_LAYOUT = [
    { top: "9%", left: "4%", width: "12vw", height: "15vh" },
    { top: "64%", left: "6%", width: "9vw", height: "12vh" },
    { top: "13%", left: "81%", width: "11vw", height: "17vh" },
    { top: "60%", left: "79%", width: "10vw", height: "13vh" },
    { top: "5%", left: "42%", width: "8vw", height: "10vh" },
    { top: "76%", left: "37%", width: "9vw", height: "11vh" },
    { top: "38%", left: "89%", width: "7vw", height: "9vh" }
  ];

  const heroMosaic = document.querySelector("[data-pf-hero-mosaic]");
  if (heroMosaic) {
    HERO_FRAGMENT_ORDERS.forEach((order, i) => {
      const project = entries.find((p) => p.order === order);
      const layout = HERO_LAYOUT[i];
      if (!project || !layout) return;
      const img = el("img");
      img.src = project.cover.url;
      img.alt = "";
      img.loading = i < 2 ? "eager" : "lazy";
      img.decoding = "async";
      img.style.top = layout.top;
      img.style.left = layout.left;
      img.style.width = layout.width;
      img.style.height = layout.height;
      img.style.transitionDelay = reduceMotion ? "0ms" : `${i * 70}ms`;
      heroMosaic.append(img);
    });
  }

  const heroSection = document.querySelector(".pf-hero");
  if (heroSection) {
    const heroObserver = new IntersectionObserver(
      (obsEntries) => {
        obsEntries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          heroSection.classList.add("is-in");
          heroObserver.disconnect();
        });
      },
      { threshold: 0.1 }
    );
    heroObserver.observe(heroSection);
  }

  /* ---------- project popup: reuses the shared block renderer ---------- */

  const modal = document.getElementById("pfModal");
  const modalOverlay = document.querySelector("[data-pf-modal-overlay]");
  const modalClose = document.querySelector("[data-pf-modal-close]");
  const modalScroll = document.querySelector("[data-pf-modal-scroll]");
  const modalHeader = document.querySelector("[data-pf-modal-header]");
  const modalBlocks = document.querySelector("[data-pf-modal-blocks]");
  let modalTrigger = null;

  function openProjectModal(project, triggerEl) {
    if (!modal || !modalHeader || !modalBlocks || !window.PortfolioBlocks) return;
    modalHeader.innerHTML = "";
    modalBlocks.innerHTML = "";
    window.PortfolioBlocks.renderHeader(modalHeader, project, { includeCover: false });
    window.PortfolioBlocks.renderBlocks(modalBlocks, project.blocks);

    modalTrigger = triggerEl || null;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    modalOverlay?.classList.add("is-open");
    document.body.classList.add("pf-modal-open");
    if (modalScroll) modalScroll.scrollTop = 0;
    modalClose?.focus({ preventScroll: true });
  }

  function closeProjectModal() {
    if (!modal || !modal.classList.contains("is-open")) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    modalOverlay?.classList.remove("is-open");
    document.body.classList.remove("pf-modal-open");
    if (modalTrigger) modalTrigger.focus({ preventScroll: true });
  }

  modalClose?.addEventListener("click", closeProjectModal);
  modalOverlay?.addEventListener("click", closeProjectModal);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeProjectModal();
  });

  /* ---------- zone tile grids: symmetric spans, direction-varied entrance ---------- */

  const ENTER_RHYTHM = ["left", "up", "right", "up"];

  function metaLine(project) {
    return [project.client, project.year].filter(Boolean).join(" · ");
  }

  function buildTile(project, indexInZone, enter) {
    const link = el("a", "pf-tile");
    link.href = `/portfolio/${project.slug}`;
    link.dataset.enter = enter;
    link.style.transitionDelay = reduceMotion ? "0ms" : `${(indexInZone % 6) * 60}ms`;

    const media = el("div", "pf-tile-media");
    const img = el("img");
    img.src = project.cover.url;
    img.alt = project.cover.alt || "";
    img.loading = indexInZone === 0 ? "eager" : "lazy";
    img.decoding = "async";
    media.append(img);
    link.append(media);

    const body = el("div", "pf-tile-body");
    const title = el("span", "pf-tile-title");
    title.textContent = project.title;
    body.append(title);

    const meta = metaLine(project);
    if (meta) {
      const metaEl = el("span", "pf-tile-meta");
      metaEl.textContent = meta;
      body.append(metaEl);
    }

    link.append(body);

    link.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      openProjectModal(project, link);
    });

    return link;
  }

  // Marketing Commercials only has 5 real case studies but the grid calls
  // for 6 tiles - rather than inventing a fake 6th client project, the
  // flagship project (lowest order) repeats as the closing tile. Same
  // project, same link, just shown twice - see the site owner's own
  // call on this.
  const REPEAT_FLAGSHIP = { "Marketing Commercials": true };

  function renderZone(category) {
    const mosaic = document.querySelector(`[data-pf-mosaic="${category}"]`);
    if (!mosaic) return;
    const projects = entries.filter((p) => p.category === category);
    const tiles = REPEAT_FLAGSHIP[category] ? [...projects, projects[0]] : projects;
    tiles.forEach((project, i) => {
      const enter = ENTER_RHYTHM[i % ENTER_RHYTHM.length];
      mosaic.append(buildTile(project, i, enter));
    });
  }

  ["Marketing Commercials", "Brand Identity", "Web Experiences"].forEach(renderZone);

  /* ---------- tile entrance reveal ---------- */

  const tileObserver = new IntersectionObserver(
    (obsEntries) => {
      obsEntries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        tileObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
  );
  document.querySelectorAll(".pf-tile").forEach((tile) => tileObserver.observe(tile));

  /* ---------- video-reel carousels: 3D Showreel + Motion Graphics ----------
     Placeholder stills pending real footage - swap `poster` for a real
     video source and these render exactly the same, same as the rest of
     the gallery's video-ready groundwork. */

  const REEL_CONTENT = {
    "3d": [
      { title: "Cinematic Product Renders", poster: "assets/images/portfolio/showreel-digital.webp" },
      { title: "Architectural Visualization", poster: "assets/images/portfolio/showreel-architecture.webp" },
      { title: "Campaign Film — Own The Ground", poster: "assets/images/portfolio/nike-leadership.png" },
      { title: "Product Visualization", poster: "assets/images/portfolio/nike-strength.png" }
    ],
    motion: [
      { title: "Social Campaign Cuts", poster: "assets/images/portfolio/nike-social-executions.png" },
      { title: "Brand Launch Teaser", poster: "assets/images/portfolio/marketing-jetour.webp" },
      { title: "Product Spotlight", poster: "assets/images/portfolio/marketing-hyundai.webp" },
      { title: "Campaign Highlight Reel", poster: "assets/images/portfolio/nike-purpose.png" },
      { title: "Athlete Story Cut", poster: "assets/images/portfolio/nike-endurance.png" },
      { title: "Launch Countdown", poster: "assets/images/portfolio/nike-speed.png" }
    ]
  };

  function buildReelCard(item) {
    const card = el("div", "pf-reel-card");
    const img = el("img");
    img.src = item.poster;
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    card.append(img);

    const badge = el("span", "pf-reel-badge");
    const bars = el("span", "pf-reel-badge-bars");
    bars.append(el("span"), el("span"), el("span"));
    const label = document.createElement("span");
    label.textContent = "Play";
    badge.append(bars, label);
    card.append(badge);

    const title = el("p", "pf-reel-title");
    title.textContent = item.title;
    card.append(title);

    return card;
  }

  function wireReel(key) {
    const track = document.querySelector(`[data-pf-reel-track="${key}"]`);
    const prev = document.querySelector(`[data-pf-reel-prev="${key}"]`);
    const next = document.querySelector(`[data-pf-reel-next="${key}"]`);
    if (!track || !prev || !next) return;

    (REEL_CONTENT[key] || []).forEach((item) => track.append(buildReelCard(item)));

    function step() {
      const card = track.querySelector(".pf-reel-card");
      const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || "0") || 0;
      return card ? card.getBoundingClientRect().width + gap : track.clientWidth;
    }

    function updateState() {
      const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
      prev.disabled = track.scrollLeft <= 4;
      next.disabled = track.scrollLeft >= maxScroll - 4;
    }

    prev.addEventListener("click", () => track.scrollBy({ left: -step(), behavior: reduceMotion ? "auto" : "smooth" }));
    next.addEventListener("click", () => track.scrollBy({ left: step(), behavior: reduceMotion ? "auto" : "smooth" }));
    track.addEventListener("scroll", updateState, { passive: true });
    window.addEventListener("resize", updateState);
    updateState();
  }

  ["3d", "motion"].forEach(wireReel);

  /* ---------- sidebar: scrollspy across all five zones + jump navigation ---------- */

  const allZones = document.querySelectorAll("[data-pf-zone]");
  const sidebar = document.querySelector(".pf-sidebar");
  const sidebarLinks = document.querySelectorAll("[data-pf-jump]");

  const zoneSpyObserver = new IntersectionObserver(
    (obsEntries) => {
      obsEntries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const category = entry.target.dataset.pfZone;
        sidebarLinks.forEach((link) => link.classList.toggle("is-active", link.dataset.pfJump === category));

        if (sidebar) {
          const accent = getComputedStyle(entry.target).getPropertyValue("--pf-zone-accent").trim();
          if (accent) sidebar.style.setProperty("--pf-active-accent", accent);
        }
      });
    },
    { threshold: 0, rootMargin: "-45% 0px -45% 0px" }
  );
  allZones.forEach((zone) => zoneSpyObserver.observe(zone));

  const ZONE_IDS = {
    "Marketing Commercials": "zone-marketing",
    "3D Showreel": "zone-3d-showreel",
    "Brand Identity": "zone-brand",
    "Motion Graphics": "zone-motion-graphics",
    "Web Experiences": "zone-web"
  };

  sidebarLinks.forEach((link) => {
    link.addEventListener("click", () => {
      const targetId = ZONE_IDS[link.dataset.pfJump];
      const target = targetId && document.getElementById(targetId);
      if (!target) return;
      target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    });
  });

  /* ---------- cursor-reactive glow (pointer devices only) ---------- */

  if (canHover) {
    document.querySelectorAll(".pf-mosaic").forEach((mosaic) => {
      mosaic.addEventListener("pointermove", (event) => {
        const tile = event.target.closest(".pf-tile");
        if (!tile) return;
        const rect = tile.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;
        tile.style.setProperty("--pf-x", `${x}%`);
        tile.style.setProperty("--pf-y", `${y}%`);
      });
    });
  }
})();
