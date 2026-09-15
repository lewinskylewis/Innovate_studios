/*
 * Innov8 Studios — shared Portfolio block renderer. Reads a project's
 * { title, category, client, year, services[], cover, shortDescription,
 * blocks:[{type, content, settings}] } (portfolio-project-data.js, the
 * single source of truth) and builds the same header/content markup used
 * by both the full Portfolio Project page (portfolio-project.js) and the
 * in-page project popup (portfolio-gallery.js) — one renderer, two mount
 * points, no duplicated block logic.
 */
window.PortfolioBlocks = (() => {
  "use strict";

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
  // out of their element or be misread as HTML.
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

  function renderHeader(mount, project, options = {}) {
    const includeCover = options.includeCover !== false;
    const metaParts = [project.category, project.client, project.year].filter(Boolean);

    const meta = el("p", "pp-meta", metaParts.join(" · "));
    const title = el("h1", "pp-title", project.title);
    mount.append(meta, title);
    if (project.shortDescription) mount.append(el("p", "pp-description", project.shortDescription));

    if (project.services && project.services.length) {
      const list = el("ul", "pp-services");
      project.services.forEach((service) => list.append(el("li", null, service)));
      mount.append(list);
    }

    if (includeCover && project.cover?.url) {
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

  function renderBlocks(mount, blocks) {
    (blocks || []).forEach((block) => {
      const renderer = RENDERERS[block.type];
      if (!renderer) return;
      mount.append(renderer(block));
    });
  }

  return { el, elHtml, sanitizeHtml, renderHeader, renderBlocks };
})();
