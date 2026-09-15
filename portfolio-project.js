/*
 * Innov8 Studios — public Portfolio Project page renderer (Phase 1).
 * Reads window.PORTFOLIO_PROJECTS (portfolio-project-data.js) and builds
 * the header, content blocks (via the shared portfolio-blocks.js
 * renderer, also used by the Portfolio gallery's project popup), and
 * credits/nav footer. This is the seam that gets swapped for a real
 * fetch() against Supabase later.
 */
(() => {
  "use strict";

  const PROJECTS = window.PORTFOLIO_PROJECTS || {};
  const { el } = window.PortfolioBlocks;

  function resolveSlug() {
    const segments = location.pathname.split("/").filter(Boolean);
    const fromPath = segments[segments.length - 1];
    if (fromPath && fromPath !== "portfolio-project.html" && PROJECTS[fromPath]) return fromPath;

    const fromQuery = new URLSearchParams(location.search).get("slug");
    if (fromQuery) return fromQuery;

    return fromPath || "";
  }

  /* ---------- footer: description + prev/next/back ---------- */

  function renderFooter(project, slug) {
    const mount = document.getElementById("pp-footer");

    if (project.shortDescription) {
      mount.append(el("p", "pp-footer-description", project.shortDescription));
    }

    const ordered = Object.entries(PROJECTS).sort((a, b) => (a[1].order || 0) - (b[1].order || 0));
    const currentIndex = ordered.findIndex(([s]) => s === slug);
    const prevEntry = currentIndex > 0 ? ordered[currentIndex - 1] : null;
    const nextEntry = currentIndex >= 0 && currentIndex < ordered.length - 1 ? ordered[currentIndex + 1] : null;

    const nav = el("nav", "pp-project-nav");
    nav.setAttribute("aria-label", "Adjacent projects");

    if (prevEntry) {
      const [prevSlug, prevProject] = prevEntry;
      const link = el("a", "pp-nav-link pp-nav-prev");
      link.href = `/portfolio/${prevSlug}`;
      link.append(el("span", "pp-nav-label", "← Previous"), el("span", "pp-nav-title", prevProject.title));
      nav.append(link);
    } else {
      nav.append(el("span", "pp-nav-spacer"));
    }

    const back = el("a", "pp-nav-back liquid-glass", "Back to Portfolio");
    back.href = "/portfolio.html#portfolio-top";
    nav.append(back);

    if (nextEntry) {
      const [nextSlug, nextProject] = nextEntry;
      const link = el("a", "pp-nav-link pp-nav-next");
      link.href = `/portfolio/${nextSlug}`;
      link.append(el("span", "pp-nav-label", "Next →"), el("span", "pp-nav-title", nextProject.title));
      nav.append(link);
    } else {
      nav.append(el("span", "pp-nav-spacer"));
    }

    mount.append(nav);
  }

  /* ---------- not found ---------- */

  function renderNotFound() {
    const main = document.querySelector(".portfolio-project-main");
    main.innerHTML = "";
    const wrap = el("div", "pp-not-found section-container");
    wrap.append(
      el("p", "pp-meta", "Portfolio"),
      el("h1", "pp-title", "This project isn't available."),
      el("p", "pp-description", "It may have been moved, or hasn't been published yet.")
    );
    const back = el("a", "pp-nav-back liquid-glass", "Back to Portfolio");
    back.href = "/portfolio.html#portfolio-top";
    wrap.append(back);
    main.append(wrap);
  }

  /* ---------- init ---------- */

  function init() {
    const slug = resolveSlug();
    const project = PROJECTS[slug];

    if (!project) {
      renderNotFound();
      return;
    }

    document.title = `${project.title} | Innov8 Studios`;
    window.PortfolioBlocks.renderHeader(document.getElementById("pp-header"), project);
    window.PortfolioBlocks.renderBlocks(document.getElementById("pp-blocks"), project.blocks);
    renderFooter(project, slug);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
