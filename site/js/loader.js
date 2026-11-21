/* =========================================================
   OPENING / LOADER
   Each greeting is "written" on screen — its outline is drawn
   stroke by stroke, then it fills in (like the iPhone "hello").
   Under it: a loading bar and a small 0 → 100 % counter.
   Then the screen slides away and the site's hero animation starts.
   ========================================================= */
(() => {
  // [greeting, language, how long it stays on screen in ms]
  // "Hello" is written in script; the languages flash past; it settles on Malayalam. Whole intro ≈ 2.7 s.
  const HELLOS = [
    ["Hello", "English", 850],
    ["नमस्ते", "Hindi", 95],
    ["வணக்கம்", "Tamil", 95],
    ["నమస్కారం", "Telugu", 95],
    ["ನಮಸ್ಕಾರ", "Kannada", 95],
    ["নমস্কার", "Bengali", 95],
    ["नमस्कार", "Marathi", 95],
    ["નમસ્તે", "Gujarati", 95],
    ["ਸਤ ਸ੍ਰੀ ਅਕਾਲ", "Punjabi", 95],
    ["ନମସ୍କାର", "Odia", 95],
    ["নমস্কাৰ", "Assamese", 95],
    ["آداب", "Urdu", 95],
    ["प्रणाम", "Maithili", 95],
    ["ᱡᱚᱦᱟᱨ", "Santali", 95],
    ["नमो नमः", "Sanskrit", 95],
    ["നമസ്കാരം", "Malayalam", 520]   // last one: home
  ];

  const loader = document.getElementById("loader");
  const finishPage = () => document.body.classList.remove("is-loading");
  if (!loader) { window.kvpLoader = Promise.resolve(); finishPage(); return; }

  const svg = document.getElementById("loaderSvg");
  const text = document.getElementById("loaderHello");
  const fill = document.getElementById("loaderFill");
  const num = document.getElementById("loaderNum");

  // Reduced motion: skip straight to the site
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    loader.remove(); finishPage(); window.kvpLoader = Promise.resolve(); return;
  }

  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  scrollTo(0, 0);

  const TOTAL = HELLOS.reduce((s, h) => s + h[2], 0);

  // fit the viewBox snugly around the current word so every script fills the same width
  const fit = () => {
    try {
      const b = text.getBBox();
      const pad = b.height * 0.18;
      svg.setAttribute("viewBox", `${b.x - pad} ${b.y - pad} ${b.width + pad * 2} ${b.height + pad * 2}`);
    } catch (e) {}
  };

  const write = (i) => {
    const [word, lang, ms] = HELLOS[i];
    text.textContent = word;
    svg.setAttribute("aria-label", word + " (" + lang + ")");
    text.classList.toggle("is-script", i === 0);
    text.classList.toggle("is-last", i === HELLOS.length - 1);
    text.classList.toggle("is-flash", ms < 300);
    fit();
    // draw the outline over ~55% of the word's time, fill over the next part, then fade out
    text.style.setProperty("--draw", Math.round(ms * 0.55) + "ms");
    text.style.setProperty("--fill", Math.round(ms * 0.25) + "ms");
    text.style.setProperty("--out", Math.round(ms * 0.82) + "ms");
    text.style.setProperty("--life", ms + "ms");
    text.classList.remove("is-writing");
    void text.getBBox();          // restart the CSS animation
    text.classList.add("is-writing");
  };

  let finished = false;
  window.kvpLoader = new Promise(resolve => {
    const end = () => {
      if (finished) return;
      finished = true;
      fill.style.transform = "scaleX(1)"; num.textContent = 100;
      loader.classList.add("is-done");
      finishPage();
      resolve();
      setTimeout(() => loader.remove(), 1300);
    };

    const start = performance.now();
    let shown = -1;
    const tick = now => {
      if (finished) return;
      const elapsed = now - start;
      const t = Math.min(1, elapsed / TOTAL);
      const p = Math.floor(t * 100);
      fill.style.transform = `scaleX(${t})`;
      num.textContent = p;
      // which greeting is on screen now
      let acc = 0, i = 0;
      while (i < HELLOS.length - 1 && elapsed >= acc + HELLOS[i][2]) { acc += HELLOS[i][2]; i++; }
      if (i !== shown) { shown = i; write(i); }
      if (t < 1) requestAnimationFrame(tick); else setTimeout(end, 120);
    };
    // wait for the script font so "Hello" is drawn in the right shape
    const go = () => requestAnimationFrame(tick);
    (document.fonts && document.fonts.load ? document.fonts.load('600 80px "Dancing Script"').catch(() => {}) : Promise.resolve())
      .then(go, go);
  });
})();
