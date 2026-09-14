/*
 * Innov8 Studios — Portfolio listing page ("The Index"). Reads
 * window.PORTFOLIO_PROJECTS (portfolio-project-data.js, the same data the
 * individual project pages render from) and builds each chapter's row
 * list plus the sticky preview stage. Real <a> per project, no
 * duplicated markup, no invented content.
 */
(() => {
  "use strict";

  const PROJECTS = window.PORTFOLIO_PROJECTS || {};
  const entries = Object.keys(PROJECTS).map((slug) => ({ slug, ...PROJECTS[slug] }));
  if (!entries.length) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function setStageImage(stageImg, project) {
    if (!stageImg || !project?.cover?.url) return;
    if (stageImg.src.endsWith(project.cover.url)) return;
    stageImg.src = project.cover.url;
    stageImg.alt = project.cover.alt || "";
    stageImg.classList.remove("is-settling");
    void stageImg.offsetWidth;
    stageImg.classList.add("is-settling");
  }

  /* ---------- render each chapter from real data ---------- */

  const revealTargets = [];

  document.querySelectorAll("[data-pf-index]").forEach((list) => {
    const category = list.dataset.pfIndex;
    const chapter = list.closest(".pf-chapter");
    const stageImg = chapter?.querySelector("[data-pf-stage-img]");
    const projects = entries.filter((p) => p.category === category).sort((a, b) => a.order - b.order);
    if (!projects.length) return;

    projects.forEach((project, index) => {
      const isOpener = index === 0;
      const li = el("li", isOpener ? "pf-row pf-row--opener" : "pf-row");
      const link = el("a", "pf-row-link");
      link.href = `/portfolio/${project.slug}`;

      const idx = el("span", "pf-row-index", String(index + 1).padStart(2, "0"));

      const thumb = el("img", "pf-row-thumb");
      thumb.src = project.cover.url;
      thumb.alt = project.cover.alt || "";
      thumb.loading = "lazy";
      thumb.decoding = "async";

      const main = el("span", "pf-row-main");
      main.append(el("span", "pf-row-title", project.title));
      const metaText = [project.client, project.year].filter(Boolean).join(" · ");
      if (metaText) main.append(el("span", "pf-row-meta", metaText));

      const arrow = el("span", "pf-row-arrow", "↗");
      arrow.setAttribute("aria-hidden", "true");

      link.append(idx, thumb, main, arrow);
      li.append(link);
      list.append(li);
      revealTargets.push(li);

      const preview = () => setStageImage(stageImg, project);
      link.addEventListener("mouseenter", preview);
      link.addEventListener("focus", preview);
    });

    setStageImage(stageImg, projects[0]);
  });

  /* ---------- one-shot reveals: chapters get a bigger entrance than rows ---------- */

  const chapterObserver = new IntersectionObserver(
    (revealEntries) => {
      revealEntries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        chapterObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.15 }
  );
  document.querySelectorAll(".pf-chapter, .pf-interlude").forEach((el2) => chapterObserver.observe(el2));

  const rowObserver = new IntersectionObserver(
    (revealEntries) => {
      revealEntries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        rowObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.2, rootMargin: "0px 0px -6% 0px" }
  );
  revealTargets.forEach((row, i) => {
    row.style.transitionDelay = reduceMotion ? "0ms" : `${Math.min(i % 6, 5) * 55}ms`;
    rowObserver.observe(row);
  });
})();
