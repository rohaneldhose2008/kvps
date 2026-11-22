/* =========================================================
   K V PAULOSE AND SONS — page interactions
   ========================================================= */
(() => {
  const D = window.SITE_DATA;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const hasGSAP = !!(window.gsap && window.ScrollTrigger);

  $("#year").textContent = new Date().getFullYear();

  /* ---------- render team ---------- */
  const [founder, ...members] = D.team;
  $("#founder").innerHTML = `
    <div class="founder__img"><img src="${founder.photo}" alt="${founder.name}"></div>
    <div>
      <p class="founder__tag">${founder.role}</p>
      <h3>${founder.name}</h3>
      <blockquote>A visionary who founded K V Paulose and Sons in 1920 during the British Raj. He started with lift-irrigation projects for the paddy fields of the Periyar valley and roads from Elamkulam (now Kolenchery), and laid a foundation that generations of the Kunnel family continue to build on.</blockquote>
    </div>`;
  $("#teamGrid").innerHTML = members.map(m => `
    <article class="member reveal">
      <div class="member__img"><img src="${m.photo}" alt="${m.name}" loading="lazy"></div>
      <div class="member__info"><h4>${m.name}</h4><p>${m.role}</p></div>
    </article>`).join("");

  /* ---------- render clients ---------- */
  $("#clientGrid").innerHTML = D.clients.map(src =>
    `<div class="client reveal"><img src="${src}" alt="Client logo" loading="lazy"></div>`).join("");

  /* ---------- gallery: every work photo in a masonry grid (js/masonry.js) ---------- */
  const galleryEl = $("#workGallery");
  if (galleryEl && window.Masonry && window.WORK_IMAGES) {
    window.Masonry(galleryEl, {
      items: window.WORK_IMAGES.map(([f, w, h]) => ({
        id: f, img: "images/work-thumb/" + f, full: "images/work-large/" + f,
        width: w, height: h, alt: "K V Paulose and Sons project photo"
      })),
      columnWidth: 240, gap: 12, radius: 12,
      animateFrom: "bottom", hoverEffect: "zoom", lightbox: true, draggable: true,
      pageSize: 30                      // photos per "Show more"
    });
  }

  /* ---------- header + mobile nav ---------- */
  const header = $("#header"), nav = $("#nav"), burger = $("#burger");
  const onScroll = () => header.classList.toggle("is-solid", scrollY > 40);
  onScroll(); addEventListener("scroll", onScroll, { passive: true });
  burger.addEventListener("click", () => {
    const open = nav.classList.toggle("is-open");
    burger.classList.toggle("is-open", open);
    document.body.style.overflow = open ? "hidden" : "";
  });
  $$(".nav a").forEach(a => a.addEventListener("click", () => {
    nav.classList.remove("is-open"); burger.classList.remove("is-open"); document.body.style.overflow = "";
  }));

  // day / night switch for the hero scene
  const sceneBtn = $("#sceneToggle");
  if (sceneBtn) {
    const label = () => {
      const next = (window.kvpGetScene && window.kvpGetScene() === "day") ? "night" : "day";
      sceneBtn.setAttribute("aria-label", `Switch to ${next} view`); sceneBtn.title = `Switch to ${next} view`;
    };
    label();
    sceneBtn.addEventListener("click", () => {
      if (!window.kvpSetScene) return;
      window.kvpSetScene(window.kvpGetScene() === "day" ? "night" : "day");
    });
    document.addEventListener("kvp:scene", label);
    // label reads the new mode after the switch finishes
    document.addEventListener("kvp:scene", () => setTimeout(label, 400));
  }

  // highlight the section you're in
  const links = $$(".nav a");
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    links.forEach(l => l.classList.toggle("is-active", l.getAttribute("href") === "#" + e.target.id));
  }), { rootMargin: "-45% 0px -50% 0px" });
  ["home", "about", "team", "clients", "gallery", "contact"].forEach(id => io.observe(document.getElementById(id)));

  /* ---------- contact form ---------- */
  $("#contactForm").addEventListener("submit", e => {
    e.preventDefault();
    $("#formMsg").textContent = "Thank you! We'll get back to you shortly.";
    e.target.reset();
  });

  /* ---------- counters ---------- */
  function runCounters() {
    $$("[data-count]").forEach(el => {
      const n = +el.dataset.count;
      if (!hasGSAP) { el.textContent = n; return; }
      const o = { v: n > 1000 ? n - 120 : 0 }; // years count up from a nearby year, not from 0
      gsap.to(o, { v: n, duration: 2.2, ease: "power3.out", delay: .6, onUpdate: () => (el.textContent = Math.round(o.v)) });
    });
  }

  /* ---------- animations ---------- */
  if (!hasGSAP) { runCounters(); return; }
  gsap.registerPlugin(ScrollTrigger);

  // hero entrance — waits for the opening loader to slide away
  const heroIn = gsap.timeline({ paused: true, delay: .25 })
    .from(".hero__title .ln > span", { yPercent: 110, duration: 1.1, stagger: .12, ease: "expo.out" })
    .from(".hero .kicker, .hero__text, .hero__btns", { opacity: 0, y: 24, duration: .8, stagger: .1, ease: "power3.out" }, "-=.7")
    .from(".stat", { yPercent: 100, duration: .9, stagger: .08, ease: "expo.out" }, "-=.6")
    .from(".header", { yPercent: -100, duration: .8, ease: "expo.out", clearProps: "transform" }, "-=1");
  heroIn.progress(0); // apply the "from" states now so nothing flashes behind the loader
  (window.kvpLoader || Promise.resolve()).then(() => { heroIn.play(); runCounters(); ScrollTrigger.refresh(); });

  // hero content drifts as you scroll away
  gsap.to(".hero__content", { yPercent: -25, opacity: 0, ease: "none", scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true } });

  // generic reveal on scroll (batched for staggering)
  ScrollTrigger.batch(".reveal", {
    start: "top 88%",
    onEnter: els => gsap.fromTo(els, { opacity: 0, y: 46 }, { opacity: 1, y: 0, duration: .9, stagger: .07, ease: "power3.out", overwrite: true })
  });
  gsap.set(".reveal", { opacity: 0 });

  // about images parallax
  gsap.to(".about__img--b", { yPercent: -18, ease: "none", scrollTrigger: { trigger: ".about", start: "top bottom", end: "bottom top", scrub: true } });
  gsap.from(".badge", { scale: .6, opacity: 0, duration: .9, ease: "back.out(1.8)", scrollTrigger: { trigger: ".about__media", start: "top 75%" } });

  // legacy timeline: the gold line fills as you scroll and each year lights up when reached
  const tl = $(".timeline");
  if (tl) {
    const items = $$(".timeline li");
    ScrollTrigger.create({
      trigger: tl, start: "top 65%", end: "bottom 65%",
      onUpdate: self => {
        tl.style.setProperty("--p", self.progress.toFixed(3));
        const lineY = innerHeight * 0.65;
        items.forEach(li => li.classList.toggle("is-passed", li.getBoundingClientRect().top + 24 < lineY));
      }
    });
  }

  // section titles: yellow kicker bar grows
  $$(".kicker__bar").forEach(b => gsap.from(b, { scaleX: 0, transformOrigin: "left", duration: .8, ease: "power3.out", scrollTrigger: { trigger: b, start: "top 90%" } }));

  addEventListener("load", () => ScrollTrigger.refresh());
})();
