const root = document.documentElement;
const header = document.querySelector("[data-header]");
const menuButton = document.querySelector("[data-menu-button]");
const siteNav = document.querySelector("[data-site-nav]");
const navLinks = document.querySelectorAll("[data-site-nav] a");
const mainNavLinks = document.querySelectorAll("[data-site-nav] > a:not(.menu-call)");
const navAnchor = document.createComment("site-navigation-home");

siteNav?.before(navAnchor);

const setMenuOpen = (isOpen) => {
  if (isOpen && siteNav) {
    document.body.append(siteNav);
  } else if (navAnchor.parentNode && siteNav) {
    navAnchor.parentNode.insertBefore(siteNav, navAnchor.nextSibling);
  }

  root.classList.toggle("nav-open", isOpen);
  menuButton?.setAttribute("aria-expanded", String(isOpen));
  menuButton?.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
};

const updateHeaderMode = () => {
  const shouldCondense = window.scrollY > 1;
  header?.classList.toggle("is-condensed", shouldCondense);

  if (!shouldCondense) {
    setMenuOpen(false);
  }
};

window.addEventListener("scroll", updateHeaderMode, { passive: true });
updateHeaderMode();

menuButton?.addEventListener("click", () => {
  setMenuOpen(!root.classList.contains("nav-open"));
});

const menuCarousel = document.querySelector("[data-menu-carousel]");
const menuCarouselTrack = menuCarousel?.querySelector(".menu-showcase-track");
const menuCarouselSlides = menuCarouselTrack?.querySelectorAll("img") ?? [];
let menuCarouselIndex = 0;
let menuCarouselTimer;

const stopMenuCarousel = () => {
  window.clearInterval(menuCarouselTimer);
  menuCarouselTimer = undefined;
};

const startMenuCarousel = () => {
  stopMenuCarousel();
  if (
    menuCarouselSlides.length < 2 ||
    document.hidden ||
    !root.classList.contains("nav-open") ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) return;

  menuCarouselTimer = window.setInterval(() => {
    menuCarouselIndex = (menuCarouselIndex + 1) % menuCarouselSlides.length;
    menuCarouselTrack.style.transform = `translate3d(-${menuCarouselIndex * (100 / menuCarouselSlides.length)}%, 0, 0)`;
  }, 4000);
};

menuButton?.addEventListener("click", () => {
  window.requestAnimationFrame(() => {
    if (root.classList.contains("nav-open")) startMenuCarousel();
    else stopMenuCarousel();
  });
});

document.addEventListener("visibilitychange", startMenuCarousel);

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    setMenuOpen(false);
    stopMenuCarousel();
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setMenuOpen(false);
    stopMenuCarousel();
  }
});

const sections = document.querySelectorAll("main section[id]");
const isAboutPage = document.body.classList.contains("about-page");
const isPortfolioPage = document.body.classList.contains("portfolio-page");
const pageMenuLabel = isAboutPage ? "About" : isPortfolioPage ? "Portfolio" : null;
const activeMenuLabel = {
  home: "Home",
  featured: "Portfolio",
  services: "Courses",
  academy: "Courses",
  contact: "About",
};
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const activeLabel = pageMenuLabel ?? activeMenuLabel[entry.target.id];
    mainNavLinks.forEach((link) => {
      link.classList.toggle("is-active", link.textContent.trim() === activeLabel);
    });
  });
}, { rootMargin: "-35% 0px -55%", threshold: 0 });
sections.forEach((section) => observer.observe(section));

if (pageMenuLabel) {
  mainNavLinks.forEach((link) => {
    link.classList.toggle("is-active", link.textContent.trim() === pageMenuLabel);
  });
}

document.querySelectorAll("[data-play-button]").forEach((button) => {
  const media = button.closest(".work-media");
  const video = media?.querySelector("[data-work-video]");
  const status = media?.querySelector("[data-video-status]");

  button.addEventListener("click", async () => {
    if (!video?.querySelector("source")) {
      if (status) status.textContent = "Video will be available soon.";
      return;
    }

    if (video.paused) {
      document.querySelectorAll("[data-work-video]").forEach((otherVideo) => {
        if (otherVideo !== video) otherVideo.pause();
      });

      try {
        await video.play();
      } catch {
        if (status) status.textContent = "Unable to play this video.";
      }
    } else {
      video.pause();
    }
  });

  video?.addEventListener("play", () => {
    media.classList.add("is-playing");
    button.setAttribute("aria-label", button.getAttribute("aria-label").replace("Play", "Pause"));
    if (status) status.textContent = "";
  });

  video?.addEventListener("pause", () => {
    media.classList.remove("is-playing");
    button.setAttribute("aria-label", button.getAttribute("aria-label").replace("Pause", "Play"));
  });

  video?.addEventListener("ended", () => {
    media.classList.remove("is-playing");
  });
});

document.querySelector("[data-contact-form]")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const status = event.currentTarget.querySelector("[data-form-status]");
  status.textContent = "Thanks — your message is ready. We’ll be in touch shortly.";
  event.currentTarget.reset();
});

document.querySelector("[data-subscribe-form]")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector("button");
  button.textContent = "Subscribed";
  event.currentTarget.reset();
});
