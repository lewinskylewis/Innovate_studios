const root = document.documentElement;
const header = document.querySelector("[data-header]");
const menuButton = document.querySelector("[data-menu-button]");
const navLinks = document.querySelectorAll("[data-site-nav] a");

const updateHeaderMode = () => {
  const shouldCondense = window.scrollY > 1;
  header?.classList.toggle("is-condensed", shouldCondense);

  if (!shouldCondense) {
    root.classList.remove("nav-open");
    menuButton?.setAttribute("aria-expanded", "false");
    menuButton?.setAttribute("aria-label", "Open navigation");
  }
};

window.addEventListener("scroll", updateHeaderMode, { passive: true });
updateHeaderMode();

menuButton?.addEventListener("click", () => {
  const isOpen = root.classList.toggle("nav-open");
  menuButton.setAttribute("aria-expanded", String(isOpen));
  menuButton.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
});

navLinks.forEach((link) => {
  link.addEventListener("click", () => {
    root.classList.remove("nav-open");
    menuButton?.setAttribute("aria-expanded", "false");
    menuButton?.setAttribute("aria-label", "Open navigation");
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    root.classList.remove("nav-open");
    menuButton?.setAttribute("aria-expanded", "false");
    menuButton?.setAttribute("aria-label", "Open navigation");
  }
});

const sections = document.querySelectorAll("main section[id]");
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((link) => link.classList.toggle("is-active", link.hash === `#${entry.target.id}`));
  });
}, { rootMargin: "-35% 0px -55%", threshold: 0 });
sections.forEach((section) => observer.observe(section));

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
