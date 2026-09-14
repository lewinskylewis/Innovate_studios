/*
 * Innov8 Studios — public Portfolio Project page renderer (Phase 1).
 * Reads window.PORTFOLIO_PROJECTS (portfolio-project-data.js) and builds
 * the header, content blocks, and credits/nav footer. This is the seam
 * that gets swapped for a real fetch() against Supabase later — every
 * function below takes plain { title, ..., blocks: [{type,content,
 * settings}] } data and never reaches into the global data object except
 * through the one lookup in init().
 */
(() => {
  "use strict";

  const PROJECTS = window.PORTFOLIO_PROJECTS || {};

  function resolveSlug() {
    const segments = location.pathname.split("/").filter(Boolean);
    const fromPath = segments[segments.length - 1];
    if (fromPath && fromPath !== "portfolio-project.html" && PROJECTS[fromPath]) return fromPath;

    const fromQuery = new URLSearchParams(location.search).get("slug");
    if (fromQuery) return fromQuery;

    return fromPath || "";
  }

  /* ---------- tiny HTML sanitizer for text-block bodies ---------- */
  const ALLOWED_TAGS = new Set(["P", "STRONG", "EM", "A", "BR"]);

  function sanitizeHtml(html) {
    const template = document.createElement("template");
    template.innerHTML = html || "";
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          if (!ALLOWED_TAGS.has(child.tagName)) {
            child.replaceWith(...child.childNodes);
            return;
          }
          [...child.attributes].forEach((attr) => {
            if (child.tagName === "A" && attr.name === "href") return;
            child.removeAttribute(attr.name);
          });
          if (child.tagName === "A") {
            child.setAttribute("target", "_blank");
            child.setAttribute("rel", "noreferrer noopener");
          }
          walk(child);
        } else if (child.nodeType !== Node.TEXT_NODE) {
          child.remove();
        }
      });
    };
    walk(template.content);
    return template.innerHTML;
  }

  // Plain-text element: content is set via textContent, never parsed as
  // markup, so data values (titles, names, captions, ...) can never break
  // out of their element or be misread as HTML - regardless of whether
  // they happen to contain "&", "<", etc.
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // Raw-HTML element: only ever used for content that has already been
  // through sanitizeHtml(), never for a plain data field.
  function elHtml(tag, className, html) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.innerHTML = html;
    return node;
  }

  /* ---------- header ---------- */

  function renderHeader(project) {
    const mount = document.getElementById("pp-header");
    const metaParts = [project.category, project.client, project.year].filter(Boolean);

    const meta = el("p", "pp-meta", metaParts.join(" · "));
    const title = el("h1", "pp-title", project.title);
    const desc = el("p", "pp-description", project.shortDescription || "");
    mount.append(meta, title);
    if (project.shortDescription) mount.append(desc);

    if (project.services && project.services.length) {
      const list = el("ul", "pp-services");
      project.services.forEach((service) => list.append(el("li", null, service)));
      mount.append(list);
    }

    if (project.cover?.url) {
      const cover = el("img", "pp-cover");
      cover.src = project.cover.url;
      cover.alt = project.cover.alt || "";
      cover.decoding = "async";
      mount.append(cover);
    }
  }

  /* ---------- block renderers ---------- */

  function renderImage(block) {
    const { url, alt, caption } = block.content;
    const width = block.settings.width === "full" ? "full" : "contained";
    const figure = el("figure", `pp-block pp-block--image pp-width-${width} pp-align-${block.settings.align || "center"}`);
    const img = el("img");
    img.src = url;
    img.alt = alt || "";
    img.loading = "lazy";
    img.decoding = "async";
    figure.append(img);
    if (caption) figure.append(el("figcaption", "pp-caption", caption));
    return figure;
  }

  function renderFullWidthImage(block) {
    const { url, alt, caption } = block.content;
    const figure = el("figure", "pp-block pp-block--image pp-width-full");
    const img = el("img");
    img.src = url;
    img.alt = alt || "";
    img.loading = "lazy";
    img.decoding = "async";
    figure.append(img);
    if (caption) figure.append(el("figcaption", "pp-caption", caption));
    return figure;
  }

  function renderText(block) {
    const { heading, body } = block.content;
    const width = block.settings.width || "narrow";
    const align = block.settings.align || "left";
    const wrap = el("div", `pp-block pp-block--text pp-width-${width} pp-align-${align}`);
    if (heading) wrap.append(el("h2", "pp-block-heading", heading));
    wrap.append(elHtml("div", "pp-block-body", sanitizeHtml(body)));
    return wrap;
  }

  function renderVideo(block) {
    const { url, posterUrl } = block.content;
    const settings = block.settings || {};
    const wrap = el("div", "pp-block pp-block--video pp-width-full");
    const video = document.createElement("video");
    video.className = "pp-video";
    if (posterUrl) video.poster = posterUrl;
    video.controls = settings.controls !== false;
    video.loop = Boolean(settings.loop);
    video.muted = Boolean(settings.muted) || Boolean(settings.autoplay);
    video.playsInline = true;
    video.preload = "metadata";
    wrap.append(video);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        video.src = url;
        if (settings.autoplay) video.play().catch(() => {});
        observer.disconnect();
      });
    }, { rootMargin: "200px" });
    observer.observe(wrap);

    return wrap;
  }

  function renderSpacer(block) {
    return el("div", `pp-block pp-block--spacer pp-spacer-${block.settings.size || "md"}`);
  }

  function renderEmbed(block) {
    const { embedUrl, title } = block.content;
    const settings = block.settings || {};
    const width = settings.width === "full" ? "full" : "contained";
    const wrap = el("div", `pp-block pp-block--embed pp-width-${width}`);
    wrap.style.setProperty("--pp-embed-ratio", (settings.aspectRatio || "16:9").replace(":", "/"));
    const iframe = document.createElement("iframe");
    iframe.src = embedUrl;
    iframe.title = title || "Embedded content";
    iframe.loading = "lazy";
    iframe.allowFullscreen = true;
    iframe.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture");
    wrap.append(iframe);
    return wrap;
  }

  const RENDERERS = {
    image: renderImage,
    full_width_image: renderFullWidthImage,
    text: renderText,
    video: renderVideo,
    spacer: renderSpacer,
    embed: renderEmbed
  };

  function renderBlocks(blocks) {
    const mount = document.getElementById("pp-blocks");
    (blocks || []).forEach((block) => {
      const renderer = RENDERERS[block.type];
      if (!renderer) return;
      mount.append(renderer(block));
    });
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
    renderHeader(project);
    renderBlocks(project.blocks);
    renderFooter(project, slug);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
