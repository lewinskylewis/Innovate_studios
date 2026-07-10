const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.addEventListener("DOMContentLoaded", () => {
  requestAnimationFrame(() => document.documentElement.classList.add("page-ready"));

  initMobileMenu();
  initNavState();
  initCounters();
  initDust();
  initFeaturedWork();
});

function initMobileMenu() {
  const toggle = document.querySelector(".menu-toggle");
  const close = document.querySelector(".menu-close");
  const menu = document.querySelector(".mobile-menu");
  const links = document.querySelectorAll(".mobile-menu a");

  if (!toggle || !close || !menu) return;

  const openMenu = () => {
    document.body.classList.add("menu-open");
    toggle.setAttribute("aria-expanded", "true");
    menu.setAttribute("aria-hidden", "false");
  };

  const closeMenu = () => {
    document.body.classList.remove("menu-open");
    toggle.setAttribute("aria-expanded", "false");
    menu.setAttribute("aria-hidden", "true");
  };

  toggle.addEventListener("click", openMenu);
  close.addEventListener("click", closeMenu);
  links.forEach((link) => link.addEventListener("click", closeMenu));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
}

function initNavState() {
  const links = document.querySelectorAll(".desktop-nav a, .mobile-menu-links a");

  links.forEach((link) => {
    link.addEventListener("click", () => {
      const target = link.getAttribute("href");
      links.forEach((item) => {
        item.classList.toggle("is-active", item.getAttribute("href") === target);
      });
    });
  });
}

function initCounters() {
  const counters = document.querySelectorAll("[data-count]");

  counters.forEach((counter) => {
    const target = Number(counter.dataset.count || 0);

    if (prefersReducedMotion) {
      counter.textContent = target;
      return;
    }

    const duration = 1300;
    const delay = 520;
    const start = performance.now() + delay;

    const tick = (now) => {
      const progress = Math.min(1, Math.max(0, (now - start) / duration));
      const eased = 1 - Math.pow(1 - progress, 3);
      counter.textContent = Math.round(target * eased);

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        counter.textContent = target;
      }
    };

    requestAnimationFrame(tick);
  });
}

function initDust() {
  const canvas = document.querySelector(".dust-canvas");
  const hero = document.querySelector(".hero-section");
  if (!canvas || !hero) return;

  const context = canvas.getContext("2d", { alpha: true });
  const particles = [];
  let width = 0;
  let height = 0;
  let drift = 0;

  const resize = () => {
    const rect = hero.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);

    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);

    particles.length = 0;
    const count = Math.max(34, Math.min(88, Math.round(width / 22)));

    for (let index = 0; index < count; index += 1) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.4 + 0.25,
        a: Math.random() * 0.22 + 0.06,
        vx: (Math.random() - 0.5) * 0.04,
        vy: (Math.random() - 0.5) * 0.03,
        phase: Math.random() * Math.PI * 2
      });
    }
  };

  const draw = () => {
    context.clearRect(0, 0, width, height);
    drift += 0.005;

    particles.forEach((particle) => {
      particle.x += particle.vx + Math.sin(drift + particle.phase) * 0.011;
      particle.y += particle.vy + Math.cos(drift + particle.phase) * 0.009;

      if (particle.x < -10) particle.x = width + 10;
      if (particle.x > width + 10) particle.x = -10;
      if (particle.y < -10) particle.y = height + 10;
      if (particle.y > height + 10) particle.y = -10;

      context.beginPath();
      context.fillStyle = `rgba(255, 235, 200, ${particle.a})`;
      context.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
      context.fill();
    });

    if (!prefersReducedMotion) requestAnimationFrame(draw);
  };

  resize();
  draw();
  window.addEventListener("resize", resize, { passive: true });
}

function initFeaturedWork() {
  const videos = document.querySelectorAll(".work-preview-video");
  const lightbox = document.querySelector(".video-lightbox");
  const lightboxVideo = document.querySelector(".video-lightbox__player");
  const closeButton = document.querySelector(".video-lightbox__close");

  const loadPreview = (video) => {
    if (!video || video.dataset.loaded === "true") return;

    const source = video.dataset.videoSrc;
    if (source) {
      video.src = source;
      video.dataset.loaded = "true";
      video.load();
    }
  };

  const playPreview = (video) => {
    loadPreview(video);
    if (!prefersReducedMotion) {
      video.play().catch(() => {});
    }
  };

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target;

          if (entry.isIntersecting) {
            playPreview(video);
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.28, rootMargin: "120px 0px" }
    );

    videos.forEach((video) => observer.observe(video));
  } else {
    videos.forEach(playPreview);
  }

  if (!lightbox || !lightboxVideo || !closeButton) return;

  const closeLightbox = () => {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    document.body.classList.remove("lightbox-open");
    lightboxVideo.pause();
    lightboxVideo.removeAttribute("src");
    lightboxVideo.removeAttribute("poster");
    lightboxVideo.load();

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  };

  document.querySelectorAll(".work-play").forEach((button) => {
    button.addEventListener("click", () => {
      const card = button.closest(".work-card");
      const preview = card?.querySelector(".work-preview-video");
      if (!preview) return;

      const source = preview.dataset.videoSrc || preview.currentSrc || preview.src;
      const poster = preview.getAttribute("poster");

      if (poster) lightboxVideo.setAttribute("poster", poster);
      if (source) lightboxVideo.src = source;

      lightbox.classList.add("is-open");
      lightbox.setAttribute("aria-hidden", "false");
      document.body.classList.add("lightbox-open");
      lightboxVideo.load();
      lightboxVideo.play().catch(() => {});

      if (lightbox.requestFullscreen) {
        lightbox.requestFullscreen().catch(() => {});
      }
    });
  });

  closeButton.addEventListener("click", closeLightbox);

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && lightbox.classList.contains("is-open")) {
      closeLightbox();
    }
  });
}
