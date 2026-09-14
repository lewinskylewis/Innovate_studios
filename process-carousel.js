/*
 * Innov8 Studios - Our Process carousel. Ported from the Sellam
 * (Sellamre.com) "Featured Communities" carousel: a native overflow-x +
 * scroll-snap track (so touch/trackpad swiping just works), paged by
 * left/right arrow buttons that jump a full "page" of cards at a time,
 * with dots kept in sync via scroll position. Arrows are vertically
 * centered on the card artwork itself via a JS-computed CSS var.
 */
(() => {
  const carousel = document.querySelector("[data-process-carousel]");
  const track = document.querySelector("[data-process-track]");
  const prev = document.querySelector("[data-process-prev]");
  const next = document.querySelector("[data-process-next]");
  const dotsWrap = document.querySelector("[data-process-dots]");
  if (!carousel || !track || !prev || !next || !dotsWrap) return;

  let pagePositions = [];

  const getCardStep = () => {
    const card = track.querySelector(".process-card");
    const gap = parseFloat(getComputedStyle(track).columnGap || getComputedStyle(track).gap || "0") || 0;
    return card ? card.getBoundingClientRect().width + gap : track.clientWidth;
  };

  const updateArrowPosition = () => {
    const media = track.querySelector(".process-card .process-card-media");
    if (!media) return;

    const carouselRect = carousel.getBoundingClientRect();
    const mediaRect = media.getBoundingClientRect();
    const mediaCenter = mediaRect.top - carouselRect.top + mediaRect.height / 2;
    carousel.style.setProperty("--process-arrow-top", `${mediaCenter}px`);
  };

  const buildPages = () => {
    updateArrowPosition();

    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
    const cardStep = getCardStep();
    const cardsPerView = Math.max(1, Math.round(track.clientWidth / cardStep));
    const cards = Array.from(track.querySelectorAll(".process-card"));
    const pageCount = Math.max(1, Math.ceil(cards.length / cardsPerView));

    pagePositions = Array.from({ length: pageCount }, (_, pageIndex) =>
      Math.min(pageIndex * cardsPerView * cardStep, maxScroll)
    ).filter((position, index, positions) => index === 0 || Math.abs(position - positions[index - 1]) > 4);

    if (pagePositions[pagePositions.length - 1] !== maxScroll) {
      pagePositions[pagePositions.length - 1] = maxScroll;
    }

    dotsWrap.innerHTML = "";
    pagePositions.forEach((_, index) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "process-dot";
      dot.setAttribute("aria-label", `Show process page ${index + 1}`);
      dot.addEventListener("click", () => {
        track.scrollTo({ left: pagePositions[index], behavior: "smooth" });
      });
      dotsWrap.append(dot);
    });

    updateCarouselState();
  };

  const getActivePage = () => {
    const current = track.scrollLeft;
    let activePage = 0;
    pagePositions.forEach((position, index) => {
      if (Math.abs(current - position) < Math.abs(current - pagePositions[activePage])) {
        activePage = index;
      }
    });
    return activePage;
  };

  const updateCarouselState = () => {
    const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
    const atStart = track.scrollLeft <= 4;
    const atEnd = track.scrollLeft >= maxScroll - 4;
    prev.disabled = atStart;
    next.disabled = atEnd;

    const activePage = getActivePage();
    dotsWrap.querySelectorAll(".process-dot").forEach((dot, index) => {
      dot.classList.toggle("is-active", index === activePage);
      dot.setAttribute("aria-current", index === activePage ? "true" : "false");
    });
  };

  const scrollToPage = (direction) => {
    const activePage = getActivePage();
    const nextPage = Math.min(Math.max(activePage + direction, 0), pagePositions.length - 1);
    track.scrollTo({ left: pagePositions[nextPage], behavior: "smooth" });
  };

  next.addEventListener("click", () => scrollToPage(1));
  prev.addEventListener("click", () => scrollToPage(-1));

  track.addEventListener("scroll", updateCarouselState, { passive: true });
  window.addEventListener("resize", buildPages);
  window.addEventListener("load", buildPages);
  buildPages();
})();
