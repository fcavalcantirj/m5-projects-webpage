// Small progressive enhancements; the page is complete without this file.
(() => {
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cards = document.querySelectorAll(".card");
  const videos = document.querySelectorAll("video[data-autoplay]");

  if (!still && "IntersectionObserver" in window) {
    document.documentElement.classList.add("js-reveal");
    const reveal = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = [...cards].indexOf(entry.target);
          entry.target.style.transitionDelay = `${Math.min(index % 3, 2) * 90}ms`;
          entry.target.classList.add("in");
          reveal.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    cards.forEach((card) => reveal.observe(card));
  }

  // Demo clips play only while on screen, and never when the visitor asked for less motion.
  if (!still && "IntersectionObserver" in window) {
    const play = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const video = entry.target;
          if (entry.isIntersecting) {
            video.preload = "auto";
            video.play().catch(() => {});
          } else video.pause();
        }
      },
      { threshold: 0.35 },
    );
    videos.forEach((video) => play.observe(video));
  }
})();
