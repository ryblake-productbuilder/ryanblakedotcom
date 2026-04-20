const revealTargets = document.querySelectorAll(
  ".hero-copy, .hero-card, .marquee, .section-heading, .project-card, .about-panel, .contact-card"
);

revealTargets.forEach((element) => {
  element.classList.add("reveal");
});

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.18,
    rootMargin: "0px 0px -40px 0px",
  }
);

revealTargets.forEach((element, index) => {
  element.style.transitionDelay = `${index * 60}ms`;
  observer.observe(element);
});
