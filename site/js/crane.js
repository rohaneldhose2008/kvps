/* =========================================================
   HERO "VIDEO" — a looping animated construction scene drawn
   on <canvas>: a tower crane slewing over a building under
   construction, carrying the K V Paulose and Sons board on its hook, welding sparks,
   distant cranes, drifting clouds and a dump truck.
   Tweak the COLORS / TEXT constants below.
   ========================================================= */
(() => {
  const cvs = document.getElementById("heroCanvas");
  if (!cvs) return;
  const ctx = cvs.getContext("2d");

  const BRAND = "K V PAULOSE AND SONS";      // board + banners
  const BRAND2 = "PVT LTD";
  const TAGLINE = "BUILDERS & CONTRACTORS";
  const C = {
    yellow: "#F5B21B", yellowDark: "#C88A0B", steel: "#2B2F36",
    concrete: "#8C8A85", concreteDark: "#5E5D5A", glass: "#2C3E50",
    sign: "#121417", net: "rgba(40,90,60,.55)"
  };

  const logo = new Image();
  logo.src = "images/logo.png";

  let W = 0, H = 0, dpr = 1, S = {};
  const rand = seed => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  /* ---------- day / night ----------
     Default follows the visitor's clock (6 am – 6 pm = day). The sun / moon
     button in the header calls window.kvpSetScene("day" | "night"). */
  const hour = new Date().getHours();
  let MODE = hour >= 6 && hour < 18 ? "day" : "night";
  const isDay = () => MODE === "day";
  document.documentElement.dataset.scene = MODE;
  window.kvpGetScene = () => MODE;
  window.kvpSetScene = mode => {
    if (mode === MODE) return;
    cvs.style.transition = "opacity .35s ease"; cvs.style.opacity = "0";
    setTimeout(() => {
      MODE = mode; document.documentElement.dataset.scene = mode;
      layout(); draw(time, 0);
      cvs.style.opacity = "1";
    }, 350);
    document.dispatchEvent(new CustomEvent("kvp:scene", { detail: mode }));
  };

  /* ---------- live weather in Ernakulam ----------
     Uses Open-Meteo (free, no key; Google has no public weather feed).
     Rain / drizzle / showers -> rain; thunderstorm -> rain + lightning;
     cloud cover decides how many clouds drift by.
     Preview any weather by adding ?weather=rain | storm | cloudy | clear to the URL. */
  const WEATHER = { rain: 0, storm: false, cover: 0.35 };
  const applyWeather = (code, cover) => {
    const rainy = (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95;
    WEATHER.rain = rainy ? (code >= 63 && code <= 67 || code >= 81 ? 1 : 0.6) : 0;
    WEATHER.storm = code >= 95;
    WEATHER.cover = Math.max(cover / 100, rainy ? 0.85 : 0);
    if (W) { layout(); }
  };
  const preview = (location.search.match(/[?&]weather=(\w+)/) || [])[1];
  if (preview) {
    applyWeather({ rain: 63, storm: 95, cloudy: 3, clear: 0 }[preview] ?? 0, { rain: 95, storm: 100, cloudy: 80, clear: 5 }[preview] ?? 35);
  } else if (window.fetch) {
    fetch("https://api.open-meteo.com/v1/forecast?latitude=9.98&longitude=76.28&current=weather_code,cloud_cover&timezone=Asia%2FKolkata")
      .then(res => res.ok ? res.json() : null)
      .then(d => { if (d && d.current) applyWeather(d.current.weather_code, d.current.cloud_cover); })
      .catch(() => {});     // offline or blocked: keep the default fair-weather sky
  }

  // cloud colours for the current time of day and weather
  function cloudTone() {
    if (WEATHER.rain) return MODE === "day"
      ? { top: [168, 176, 188], under: [92, 100, 114], a: 0.95 }
      : { top: [70, 78, 96], under: [24, 28, 40], a: 0.85 };
    return MODE === "day"
      ? { top: [255, 255, 255], under: [176, 190, 208], a: 0.92 }
      : { top: [120, 134, 168], under: [22, 30, 52], a: 0.4 };
  }

  // a soft cumulus cloud: many overlapping round puffs, taller in the middle,
  // lit from above and shaded underneath, with a flat-ish base
  function makeCloud(rr, stretch, tone) {
    const w = 420 * stretch, h = 180, c = document.createElement("canvas");
    c.width = w; c.height = h;
    const g = c.getContext("2d");
    const base = h * 0.78;
    for (let i = 0; i < 26; i++) {
      const u = rr();                                   // 0..1 across the cloud
      const px = w * (0.1 + 0.8 * u);
      const bulge = 1 - Math.abs(u - 0.5) * 1.6;        // bigger puffs in the middle
      const pr = h * (0.13 + 0.2 * Math.max(0.15, bulge)) * (0.75 + rr() * 0.5);
      const py = base - pr * (0.35 + rr() * 0.7) * Math.max(0.4, bulge);
      const pg = g.createRadialGradient(px - pr * 0.25, py - pr * 0.3, pr * 0.1, px, py, pr);
      pg.addColorStop(0, `rgba(${tone.top},1)`); pg.addColorStop(0.65, `rgba(${tone.top},.85)`); pg.addColorStop(1, `rgba(${tone.top},0)`);
      g.fillStyle = pg; g.beginPath(); g.arc(px, py, pr, 0, Math.PI * 2); g.fill();
    }
    // shade the underside
    g.globalCompositeOperation = "source-atop";
    const sh = g.createLinearGradient(0, h * 0.3, 0, base);
    sh.addColorStop(0, `rgba(${tone.under},0)`); sh.addColorStop(1, `rgba(${tone.under},.85)`);
    g.fillStyle = sh; g.fillRect(0, 0, w, h);
    // soften the flat base
    g.globalCompositeOperation = "destination-out";
    const cut = g.createLinearGradient(0, base - 6, 0, base + 14);
    cut.addColorStop(0, "rgba(0,0,0,0)"); cut.addColorStop(1, "rgba(0,0,0,1)");
    g.fillStyle = cut; g.fillRect(0, base - 6, w, h - base + 6);
    g.globalCompositeOperation = "source-over";
    return c;
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = cvs.clientWidth; H = cvs.clientHeight;
    cvs.width = Math.round(W * dpr); cvs.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    layout();
  }

  /* ---------- scene layout (recomputed on resize) ---------- */
  function layout() {
    const r = rand(42);
    const mobile = W < 860;
    const hero = cvs.parentElement;
    const stats = hero.querySelector(".stats");
    const content = hero.querySelector(".hero__content");
    const roadBottom = stats ? stats.offsetTop : H;           // road ends where the stats bar starts
    const mw = Math.max(12, Math.min(26, H * 0.026));
    const groundY = roadBottom - Math.max(60, H * 0.08);
    // on narrow screens the crane must sit below the headline
    const textBottom = mobile && content ? content.offsetTop + content.offsetHeight : 0;
    const mastH = mobile
      ? Math.max(H * 0.25, groundY - textBottom - mw * 5)
      : Math.min(H * 0.62, 700);
    const craneX = mobile ? W * 0.36 : W * 0.68;
    const jibL = mobile ? W * 0.52 : Math.min(W * 0.3, 520);

    const bx = craneX + mw * 2.2;
    const bw = Math.max(120, Math.min(W * 0.24, W - bx - (mobile ? 8 : 40)));
    const bh = mastH * 0.6;

    // city skyline — drawn once into an off-screen image (realistic towers with window grids)
    const skyline = buildSkyline(groundY, mobile, isDay());
    // night sky stars
    const stars = Array.from({ length: mobile ? 70 : 140 }, () => ({ x: r() * W, y: r() * groundY * 0.7, s: 0.4 + r() * 1.2, p: r() * 6 }));
    // daytime traffic: near lane (with the KVP truck) drives left, far lane drives right
    const kinds = ["car", "bus", "car", "auto", "lorry", "car", "auto", "car"];
    const paints = ["#C0392B", "#ECF0F1", "#2C3E50", "#7F8C8D", "#2471A3", "#1E8449", "#D35400"];
    const near = mobile ? 3 : 5, far = mobile ? 3 : 5;
    const traffic = [];
    for (let i = 1; i < near; i++) traffic.push({ lane: 0, slot: i / near, kind: kinds[(i * 3) % kinds.length], color: paints[i % paints.length] });
    for (let i = 0; i < far; i++) traffic.push({ lane: 1, slot: i / far + 0.1, kind: kinds[(i * 5 + 1) % kinds.length], color: paints[(i + 3) % paints.length] });
    // building window state
    const floors = 12, cols = 6;
    const lit = [];
    for (let i = 0; i < floors * cols * 2; i++) lit.push(r());
    // clouds: soft, puffy sprites drawn once; how many show depends on the live cloud cover
    const tone = cloudTone();
    const sprites = [0, 1, 2, 3, 4].map(i => makeCloud(rand(300 + i * 17), 1 + (i % 3) * 0.25, tone));
    const clouds = Array.from({ length: 12 }, (_, i) => {
      const w = (mobile ? 150 : 220) + r() * (mobile ? 140 : 260);
      return { x: r() * W, y: H * (0.04 + r() * 0.34), w, h: w * 0.42, v: 5 + r() * 9, sprite: sprites[i % sprites.length] };
    });
    // rain drops (used when it is raining in Ernakulam)
    const drops = Array.from({ length: mobile ? 110 : 260 }, () => ({ x: r() * W, y: r() * H, l: 10 + r() * 16, v: 650 + r() * 450 }));
    const dust = Array.from({ length: 50 }, () => ({ x: r() * W, y: r() * H, s: 0.6 + r() * 1.8, v: 6 + r() * 14, p: r() * 6 }));

    const boardW = mobile ? Math.min(W * 0.62, 250) : Math.min(Math.max(W * 0.19, 280), 380);
    S = { board: { w: boardW, h: boardW * 0.42 }, mobile, groundY, roadBottom, mastH, mw, craneX, jibL, cjL: jibL * 0.33, topY: groundY - mastH,
          bx, bw, bh, floors, cols, skyline, lit, clouds, dust, stars, traffic, drops, sparks: [], sparkSrc: { x: 0, y: 0, t: 0 } };
  }

  /* ---------- helpers ---------- */
  const lerp = (a, b, t) => a + (b - a) * t;
  function line(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }

  // lattice truss between two chords
  function truss(ax, ay, bx, by, h1, h2, seg) {
    ctx.beginPath();
    ctx.moveTo(ax, ay); ctx.lineTo(bx, by);               // bottom chord
    ctx.moveTo(ax, ay - h1); ctx.lineTo(bx, by - h2);     // top chord
    for (let i = 0; i <= seg; i++) {
      const t = i / seg, x = lerp(ax, bx, t), y = lerp(ay, by, t), h = lerp(h1, h2, t);
      ctx.moveTo(x, y); ctx.lineTo(x, y - h);
      if (i < seg) {
        const t2 = (i + 1) / seg, x2 = lerp(ax, bx, t2), y2 = lerp(ay, by, t2), h2b = lerp(h1, h2, t2);
        if (i % 2) { ctx.moveTo(x, y); ctx.lineTo(x2, y2 - h2b); } else { ctx.moveTo(x, y - h); ctx.lineTo(x2, y2); }
      }
    }
    ctx.stroke();
  }

  /* ---------- layers ---------- */
  function sky(t) {
    const day = isDay(), wet = WEATHER.rain > 0;
    const g = ctx.createLinearGradient(0, 0, 0, S.groundY);
    if (day && wet) { g.addColorStop(0, "#5E6B79"); g.addColorStop(0.55, "#8592A0"); g.addColorStop(1, "#B4BEC8"); }
    else if (day) { g.addColorStop(0, "#2F7FC8"); g.addColorStop(0.5, "#7DBBE8"); g.addColorStop(1, "#D9ECF6"); }
    else if (wet) { g.addColorStop(0, "#05070C"); g.addColorStop(0.55, "#0E141F"); g.addColorStop(1, "#1A2230"); }
    else { g.addColorStop(0, "#03060F"); g.addColorStop(0.55, "#0B1630"); g.addColorStop(1, "#1E2C4C"); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // sun (day) or moon (night), up and to the right — hidden behind rain clouds
    const sx = W * (S.mobile ? 0.82 : 0.86), sy = H * (S.mobile ? 0.13 : 0.17);
    if (wet) { /* overcast */ }
    else if (day) {
      const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, H * 0.5);
      sg.addColorStop(0, "rgba(255,250,225,.95)"); sg.addColorStop(0.08, "rgba(255,240,190,.55)"); sg.addColorStop(1, "rgba(255,240,190,0)");
      ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#FFFBEA"; ctx.beginPath(); ctx.arc(sx, sy, 30, 0, Math.PI * 2); ctx.fill();
    } else {
      S.stars.forEach(s => {
        ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * 1.3 + s.p * 5))})`;
        ctx.fillRect(s.x, s.y, s.s, s.s);
      });
      const mg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 110);
      mg.addColorStop(0, "rgba(220,230,255,.35)"); mg.addColorStop(1, "rgba(220,230,255,0)");
      ctx.fillStyle = mg; ctx.fillRect(sx - 110, sy - 110, 220, 220);
      ctx.fillStyle = "#F2EFE4"; ctx.beginPath(); ctx.arc(sx, sy, 26, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(0,0,0,.07)";
      [[-8, -6, 6], [7, 5, 4], [-2, 10, 3], [9, -9, 3]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(sx + dx, sy + dy, r, 0, Math.PI * 2); ctx.fill(); });
    }
    // clouds — how many depends on the live cloud cover
    const n = Math.round(3 + WEATHER.cover * 9);
    ctx.globalAlpha = cloudTone().a;
    S.clouds.slice(0, n).forEach(c => {
      const x = ((c.x + t * c.v) % (W + c.w * 2)) - c.w;
      ctx.drawImage(c.sprite, x, c.y, c.w, c.h);
    });
    ctx.globalAlpha = 1;
  }

  // falling rain, plus lightning flashes in a thunderstorm
  function rain(t, dt) {
    if (!WEATHER.rain) return;
    const k = WEATHER.rain, slant = 0.18;
    ctx.strokeStyle = isDay() ? `rgba(225,232,240,${0.35 * k + 0.1})` : `rgba(170,190,220,${0.3 * k + 0.1})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const count = Math.round(S.drops.length * (0.45 + 0.55 * k));
    for (let i = 0; i < count; i++) {
      const d = S.drops[i];
      d.y += d.v * dt; d.x += d.v * dt * slant;
      if (d.y > H) { d.y = -d.l; d.x = Math.random() * (W + 100) - 100; }
      ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + d.l * slant, d.y + d.l);
    }
    ctx.stroke();
    // darker, wetter look over the whole scene
    ctx.fillStyle = isDay() ? "rgba(40,48,60,.12)" : "rgba(0,0,0,.15)"; ctx.fillRect(0, 0, W, H);
    if (WEATHER.storm) {
      if (!S.flash || t > S.flash.end + 4 + Math.random() * 3) S.flash = { at: t, end: t + 0.35, x: W * (0.15 + Math.random() * 0.7) };
      const f = S.flash, age = t - f.at;
      if (age >= 0 && age < 0.35) {
        const a = age < 0.08 ? 0.55 : 0.55 * (1 - (age - 0.08) / 0.27);
        ctx.fillStyle = `rgba(235,240,255,${a * 0.5})`; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = `rgba(255,255,255,${a + 0.3})`; ctx.lineWidth = 2;
        ctx.beginPath(); let bx = f.x, by = 0; ctx.moveTo(bx, by);
        const rr = rand(Math.floor(f.at * 1000) + 1);
        while (by < S.groundY * 0.7) { bx += (rr() - 0.5) * 40; by += 18 + rr() * 26; ctx.lineTo(bx, by); }
        ctx.stroke();
      }
    }
  }

  /* City skyline, pre-rendered once per resize.
     Two depth layers: a hazy far layer and a near layer of tall towers with
     floor-by-floor window grids (lit / dark glass), mullions, sunset edge
     light and rooftop details (parapets, water tanks, antennas). */
  function buildSkyline(groundY, mobile, day) {
    // r = building shapes and positions (identical for day and night)
    // q = lights and colour variation (separate, so it never shifts the buildings)
    const r = rand(7), q = rand(1234);
    const img = document.createElement("canvas");
    img.width = Math.max(1, Math.round(W * dpr)); img.height = Math.max(1, Math.round(groundY * dpr));
    const g = img.getContext("2d");
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const beacons = [], twinkles = [];
    const sunX = W * (mobile ? 0.82 : 0.86);

    // colours for each time of day
    const K = day ? {
      far: "#9DB0C4", farWin: () => `rgba(255,255,255,${0.18 + q() * 0.2})`, farWinRate: 0.32,
      haze: "rgba(225,238,248,", hazeA: 0.45,
      palette: ["#8293A6", "#93A2B3", "#7A8B9E", "#A3AFBC", "#6E7F92"], edgeLit: "#C9D6E3",
      glass: () => { const v = Math.floor(q() * 30); return `rgb(${120 + v},${165 + v},${205 + v})`; },
      litRate: 0, roof: "#56636F", edge: "rgba(255,255,255,.35)", slab: "rgba(255,255,255,.12)",
      groundHaze: "rgba(120,112,100,"
    } : {
      far: "#27324A", farWin: () => `rgba(255,210,150,${0.25 + q() * 0.3})`, farWinRate: 0.32,
      haze: "rgba(40,60,110,", hazeA: 0.3,
      palette: ["#141A25", "#18202C", "#121822", "#1B212B", "#161D28"], edgeLit: "#232c3d",
      glass: () => { const v = Math.floor(q() * 9); return `rgba(${20 + v},${27 + v},${42 + v},.95)`; },
      litRate: 0.22, roof: "#0d1118", edge: "rgba(140,170,230,.18)", slab: "rgba(255,255,255,.03)",
      groundHaze: "rgba(10,12,18,"
    };

    // far layer: lower, hazier blocks with small windows
    for (let x = -10; x < W + 20;) {
      const w = 34 + r() * 70, h = groundY * (0.16 + r() * 0.26), y = groundY - h;
      g.fillStyle = K.far; g.fillRect(x, y, w, h);
      const fh = 7 + r() * 2, cw = 6;
      for (let fy = y + 5; fy < groundY - 6; fy += fh)
        for (let fx = x + 3; fx < x + w - 5; fx += cw)
          if (q() < K.farWinRate) { g.fillStyle = K.farWin(); g.fillRect(fx, fy, 3, 3.5); }
      x += w + 1 + r() * 5;
    }
    // atmospheric haze over the far layer
    const hz = g.createLinearGradient(0, groundY * 0.4, 0, groundY);
    hz.addColorStop(0, K.haze + "0)"); hz.addColorStop(1, K.haze + K.hazeA + ")");
    g.fillStyle = hz; g.fillRect(0, groundY * 0.4, W, groundY * 0.6);

    // near layer: tall towers
    for (let x = -30; x < W + 40;) {
      const tall = r() < 0.35;
      const w = (mobile ? 46 : 64) + r() * (mobile ? 70 : 110);
      const h = groundY * (tall ? 0.48 + r() * 0.3 : 0.26 + r() * 0.24);
      const y = groundY - h;
      const base = K.palette[Math.floor(r() * K.palette.length)];

      // facade, lit on the side facing the sun / moon
      const lightLeft = x + w / 2 > sunX;
      const fg = g.createLinearGradient(x, 0, x + w, 0);
      fg.addColorStop(0, lightLeft ? base : K.edgeLit); fg.addColorStop(0.18, base);
      fg.addColorStop(0.82, base); fg.addColorStop(1, lightLeft ? base : K.edgeLit);
      g.fillStyle = fg; g.fillRect(x, y, w, h);

      // window grid (shape from r, lights from q)
      const glassTower = r() < 0.45;                    // curtain-wall glass vs punched windows
      const floorH = glassTower ? 9 + r() * 2 : 11 + r() * 3;
      const colW = glassTower ? 7 + r() * 2 : 10 + r() * 4;
      const winW = glassTower ? colW - 1.5 : colW * 0.55;
      const winH = glassTower ? floorH - 2 : floorH * 0.55;
      const litRate = K.litRate + q() * 0.25;            // share of floors with office lights on (night)
      const pad = 4;
      for (let fy = y + pad + 4, row = 0; fy < groundY - floorH; fy += floorH, row++) {
        const floorLit = q() < litRate;
        for (let fx = x + pad; fx + winW < x + w - pad + 0.5; fx += colW) {
          const roll = q(), tone = q(), a = q();
          const lit = !day && roll < (floorLit ? 0.75 : 0.05);
          if (lit) {
            g.fillStyle = tone < 0.82 ? `rgba(255,${195 + Math.floor(a * 40)},${125 + Math.floor(a * 50)},${0.6 + a * 0.35})`
                                      : `rgba(190,220,255,${0.5 + a * 0.3})`;
            if (a < 0.04) twinkles.push([fx, fy, winW, winH, tone * 6]);
          } else g.fillStyle = K.glass();
          g.fillRect(fx, fy, winW, winH);
          // daytime: sky reflected in the glass, brighter towards the top
          if (day && tone < 0.5) { g.fillStyle = `rgba(255,255,255,${0.08 + 0.12 * Math.max(0, 1 - row / 10)})`; g.fillRect(fx, fy, winW, winH * 0.5); }
        }
        g.fillStyle = K.slab; g.fillRect(x, fy + floorH - 1, w, 1);   // floor slab line
      }
      g.fillStyle = K.edge; g.fillRect(lightLeft ? x + w - 1.5 : x, y, 1.5, h);   // lit edge

      // roof details
      g.fillStyle = K.roof; g.fillRect(x - 1, y - 3, w + 2, 3);           // parapet
      const roof = r();
      if (roof < 0.3) {                                                    // stepped crown
        const sw = w * (0.45 + r() * 0.25), sh = 10 + r() * 18;
        g.fillStyle = base; g.fillRect(x + (w - sw) / 2, y - 3 - sh, sw, sh);
        g.fillStyle = K.roof; g.fillRect(x + (w - sw) / 2 - 1, y - 6 - sh, sw + 2, 3);
      } else if (roof < 0.55) {                                            // water tank + plant room
        g.fillStyle = K.roof; g.fillRect(x + w * 0.15, y - 12, w * 0.3, 9);
        g.fillRect(x + w * 0.6, y - 16, 10, 13);
      }
      const hasAntenna = r() < 0.7, ax = x + w * (0.3 + r() * 0.4), ah = 18 + r() * 26;
      if (tall && hasAntenna) {                                            // antenna with red beacon
        g.fillStyle = K.roof; g.fillRect(ax - 1, y - 3 - ah, 2, ah);
        beacons.push([ax, y - 3 - ah, q() * 6]);
      }
      x += w + 2 + r() * (mobile ? 8 : 14);
    }
    // ground haze in front of the city
    const gh = g.createLinearGradient(0, groundY - 60, 0, groundY);
    gh.addColorStop(0, K.groundHaze + "0)"); gh.addColorStop(1, K.groundHaze + ".55)");
    g.fillStyle = gh; g.fillRect(0, groundY - 60, W, 60);
    return { img, beacons, twinkles };
  }

  function skyline(t) {
    ctx.drawImage(S.skyline.img, 0, 0, W, S.groundY);
    // a few windows switching on and off
    S.skyline.twinkles.forEach(([x, y, w, h, p]) => {
      const a = 0.5 + 0.5 * Math.sin(t * 0.7 + p * 3);
      if (a < 0.35) { ctx.fillStyle = "rgba(12,17,26,.9)"; ctx.fillRect(x, y, w, h); }
    });
    // aviation beacons on the towers
    S.skyline.beacons.forEach(([x, y, p]) => {
      if (Math.sin(t * 2.2 + p) < 0.4) return;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 9);
      g.addColorStop(0, "rgba(255,70,50,.95)"); g.addColorStop(1, "rgba(255,70,50,0)");
      ctx.fillStyle = g; ctx.fillRect(x - 9, y - 9, 18, 18);
    });
    // distant cranes
    [[0.12, 0.42, 0.11], [0.9, 0.36, -0.08], [0.47, 0.3, 0.06]].forEach(([fx, fh, sp], i) => {
      const x = W * fx, top = S.groundY - H * fh, a = Math.sin(t * sp + i * 2);
      ctx.strokeStyle = isDay() ? "rgba(60,70,84,.75)" : "rgba(30,36,48,.9)"; ctx.lineWidth = 2;
      line(x, S.groundY, x, top);
      const L = H * 0.16;
      line(x - L * 0.3 * Math.cos(a), top, x + L * Math.cos(a), top);
      line(x, top - 10, x + L * 0.6 * Math.cos(a), top);
      ctx.lineWidth = 1; line(x + L * 0.7 * Math.cos(a), top, x + L * 0.7 * Math.cos(a), top + H * 0.08);
    });
  }

  function building(t) {
    const { bx, bw, bh, floors, cols, groundY } = S;
    const fh = bh / floors, top = groundY - bh, cw = bw / cols;
    const done = 7; // floors with glazing
    for (let f = 0; f < floors; f++) {
      const y = groundY - (f + 1) * fh;
      if (f < done) {
        ctx.fillStyle = C.concreteDark; ctx.fillRect(bx, y, bw, fh);
        for (let c = 0; c < cols; c++) {
          const v = S.lit[f * cols + c];
          const on = v > (isDay() ? 0.93 : 0.55) && Math.sin(t * 0.2 + v * 40) > -0.6;
          ctx.fillStyle = on ? `rgba(255,196,120,${0.55 + v * 0.4})` : C.glass;
          ctx.fillRect(bx + c * cw + 3, y + 4, cw - 6, fh - 7);
        }
      } else {
        // open frame: columns + rebar
        ctx.fillStyle = "rgba(20,24,30,.55)"; ctx.fillRect(bx, y, bw, fh);
        ctx.fillStyle = C.concrete;
        for (let c = 0; c <= cols; c++) ctx.fillRect(bx + c * cw - 2, y, 4, fh);
        if (f === floors - 1) {
          ctx.strokeStyle = "rgba(180,110,60,.9)"; ctx.lineWidth = 1;
          for (let c = 0; c <= cols; c++) for (let k = -1; k <= 1; k++) line(bx + c * cw + k * 1.5, y, bx + c * cw + k * 1.5, y - fh * 0.5);
        }
      }
      // slab
      ctx.fillStyle = C.concrete; ctx.fillRect(bx - 3, y + fh - 3, bw + 6, 3);
    }
    // scaffolding + green safety net on the left face
    ctx.fillStyle = C.net; ctx.fillRect(bx - 10, top + fh * 2, 10, bh - fh * 2);
    ctx.strokeStyle = "rgba(200,200,200,.35)"; ctx.lineWidth = 1;
    for (let y = top + fh * 2; y < groundY; y += fh) line(bx - 12, y, bx, y);

    // branded banner on the facade
    const by = groundY - fh * 5.6, bH = fh * 1.6;
    ctx.fillStyle = C.sign; ctx.fillRect(bx + 4, by, bw - 8, bH);
    ctx.fillStyle = C.yellow; ctx.fillRect(bx + 4, by, bw - 8, 3); ctx.fillRect(bx + 4, by + bH - 3, bw - 8, 3);
    ctx.fillStyle = "#fff"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `700 ${Math.max(10, bH * 0.42)}px "Barlow Condensed", sans-serif`;
    ctx.fillText(BRAND + "  ·  SINCE 1919", bx + bw / 2, by + bH / 2 + 1, bw - 20);

    // welding sparks on the top floor
    const src = S.sparkSrc;
    if (t - src.t > 2.6) { src.t = t; src.x = bx + cw * (1 + Math.floor(Math.random() * (cols - 1))); src.y = top + fh * 0.9; }
    if (Math.sin(t * 9) > 0.2) for (let i = 0; i < 3; i++) S.sparks.push({ x: src.x, y: src.y, vx: (Math.random() - 0.5) * 90, vy: -Math.random() * 80, life: 1 });
    ctx.globalCompositeOperation = "lighter";
    const glow = ctx.createRadialGradient(src.x, src.y, 0, src.x, src.y, 26);
    glow.addColorStop(0, `rgba(170,210,255,${0.5 + 0.5 * Math.random()})`); glow.addColorStop(1, "rgba(120,170,255,0)");
    ctx.fillStyle = glow; ctx.fillRect(src.x - 26, src.y - 26, 52, 52);
    ctx.globalCompositeOperation = "source-over";
  }

  function sparks(dt) {
    ctx.globalCompositeOperation = "lighter";
    S.sparks = S.sparks.filter(p => (p.life -= dt * 1.4) > 0);
    S.sparks.forEach(p => {
      p.vy += 220 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      ctx.fillStyle = `rgba(255,${180 + p.life * 60},90,${p.life})`;
      ctx.fillRect(p.x, p.y, 2, 2);
    });
    ctx.globalCompositeOperation = "source-over";
  }

  function crane(t) {
    const { craneX: cx, topY, mw, groundY, jibL, cjL, mastH } = S;
    const half = mw / 2;

    // --- mast ---
    const mg = ctx.createLinearGradient(cx - half, 0, cx + half, 0);
    mg.addColorStop(0, C.yellowDark); mg.addColorStop(0.5, C.yellow); mg.addColorStop(1, C.yellowDark);
    ctx.strokeStyle = mg; ctx.lineWidth = Math.max(1.5, mw * 0.1);
    line(cx - half, groundY, cx - half, topY); line(cx + half, groundY, cx + half, topY);
    ctx.lineWidth = Math.max(1, mw * 0.07);
    for (let y = groundY, i = 0; y > topY; y -= mw, i++) {
      line(cx - half, y, cx + half, y);
      i % 2 ? line(cx - half, y, cx + half, y - mw) : line(cx + half, y, cx - half, y - mw);
    }

    // --- slewing: jib rotates around the mast (projected) ---
    const th = 1.35 * Math.sin((t * 2 * Math.PI) / 26) + 0.15 * Math.sin(t * 0.37);
    const cos = Math.cos(th), sin = Math.sin(th);
    const jy = topY - mw * 0.7;
    const jx2 = cx + jibL * cos, jy2 = jy + jibL * sin * 0.09;
    const cx2 = cx - cjL * cos, cy2 = jy - cjL * sin * 0.09;
    const apexY = jy - mw * 3.4;

    // slewing unit + cab
    ctx.fillStyle = C.yellow; ctx.fillRect(cx - mw * 0.8, jy, mw * 1.6, mw * 0.7);
    const cabW = mw * 1.3 * Math.max(0.35, Math.abs(cos)), cabX = cx + Math.sign(cos || 1) * mw * 0.6 - (cos < 0 ? cabW : 0);
    ctx.fillStyle = "#E9E4D8"; ctx.fillRect(cabX, jy + mw * 0.7, cabW, mw * 1.2);
    ctx.fillStyle = "#3a5f7a"; ctx.fillRect(cabX + 2, jy + mw * 0.8, cabW - 4, mw * 0.55);

    // apex (cat head)
    ctx.strokeStyle = C.yellow; ctx.lineWidth = Math.max(1.5, mw * 0.1);
    line(cx - half * 0.8, jy, cx, apexY); line(cx + half * 0.8, jy, cx, apexY);
    // pendant ties
    ctx.strokeStyle = "rgba(30,30,30,.9)"; ctx.lineWidth = 1.2;
    line(cx, apexY, lerp(cx, jx2, 0.62), lerp(jy, jy2, 0.62) - mw * 0.9 * 0.7);
    line(cx, apexY, cx2, cy2 - mw * 0.5);

    // counter-jib with counterweights (branded)
    ctx.strokeStyle = C.yellow; ctx.lineWidth = Math.max(1, mw * 0.08);
    truss(cx, jy, cx2, cy2, mw * 0.6, mw * 0.5, 4);
    const cwW = Math.max(4, Math.abs(cos) * cjL * 0.42), cwX = cos >= 0 ? cx2 : cx2 - cwW;
    ctx.fillStyle = "#6E6C68"; ctx.fillRect(cwX, cy2 + 1, cwW, mw * 1.7);
    ctx.strokeStyle = "rgba(0,0,0,.35)"; ctx.lineWidth = 1;
    for (let k = 1; k < 4; k++) line(cwX, cy2 + 1 + k * mw * 0.42, cwX + cwW, cy2 + 1 + k * mw * 0.42);
    // (no logo on the counterweight — the company board on the hook carries the branding)

    // main jib
    ctx.strokeStyle = C.yellow; ctx.lineWidth = Math.max(1, mw * 0.08);
    truss(cx, jy, jx2, jy2, mw * 0.9, mw * 0.35, Math.max(4, Math.round(Math.abs(cos) * 16)));

    // trolley + hoist
    const B = S.board;
    let f = 0.32 + 0.5 * (0.5 + 0.5 * Math.sin((t * 2 * Math.PI) / 17));
    let trX = lerp(cx, jx2, f);
    // keep the hanging board fully on screen
    const maxX = W - B.w / 2 - 12;
    if (trX > maxX && jx2 !== cx) { trX = maxX; f = (trX - cx) / (jx2 - cx); }
    const trY = lerp(jy, jy2, f);
    ctx.fillStyle = "#222"; ctx.fillRect(trX - mw * 0.45, trY, mw * 0.9, mw * 0.35);
    // hoist rope length: raises and lowers the board, never into the site fence
    const sling = mw * 1.6;
    const lenMax = Math.max(30, S.groundY - mw * 2.6 - trY - mw * 0.9 - sling - B.h);
    const len = lenMax * (0.35 + 0.65 * (0.5 + 0.5 * Math.sin((t * 2 * Math.PI) / 13 + 1)));
    // pendulum swing, livelier while the crane is slewing
    const slew = Math.cos((t * 2 * Math.PI) / 26);
    const phi = 0.07 * Math.sin(t * 1.6) + 0.06 * slew;
    const hx = trX + Math.sin(phi) * len, hy = trY + mw * 0.35 + Math.cos(phi) * len;
    ctx.strokeStyle = "rgba(25,25,25,.95)"; ctx.lineWidth = 1.2;
    line(trX - 2, trY + mw * 0.35, hx - 2, hy); line(trX + 2, trY + mw * 0.35, hx + 2, hy);
    // hook block
    ctx.fillStyle = C.yellow; ctx.fillRect(hx - mw * 0.35, hy, mw * 0.7, mw * 0.55);
    ctx.fillStyle = "#222"; ctx.fillRect(hx - mw * 0.35, hy + mw * 0.2, mw * 0.7, mw * 0.12);

    // --- the company board, hanging on two slings and swaying ---
    ctx.save();
    ctx.translate(hx, hy + mw * 0.55);
    ctx.rotate(phi * 0.9);
    const bw = B.w, bh = B.h, turn = 0.9 + 0.1 * Math.abs(cos);   // slight turn as the crane slews
    ctx.strokeStyle = "rgba(30,30,30,.95)"; ctx.lineWidth = 1.3;
    line(0, 0, -bw * 0.4 * turn, sling); line(0, 0, bw * 0.4 * turn, sling);
    ctx.scale(turn, 1);
    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(-bw / 2 + 7, sling + 7, bw, bh);
    ctx.fillStyle = C.sign; ctx.fillRect(-bw / 2, sling, bw, bh);
    ctx.strokeStyle = C.yellow; ctx.lineWidth = 3; ctx.strokeRect(-bw / 2 + 1.5, sling + 1.5, bw - 3, bh - 3);
    ctx.fillStyle = C.yellow; [-0.4, 0.4].forEach(k => ctx.fillRect(bw * k - 3, sling - 2, 6, 6));   // lifting eyes
    let tx = -bw / 2 + 14;
    if (logo.complete && logo.naturalWidth) {
      const lh = bh * 0.7, lw = lh * (logo.naturalWidth / logo.naturalHeight);
      ctx.drawImage(logo, -bw / 2 + bh * 0.14, sling + (bh - lh) / 2, lw, lh);
      tx = -bw / 2 + bh * 0.14 + lw + bh * 0.14;
    }
    const tw = bw / 2 - tx - bh * 0.1;
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#fff"; ctx.font = `700 ${bh * 0.25}px "Barlow Condensed", sans-serif`;
    ctx.fillText(BRAND, tx, sling + bh * 0.4, tw);
    ctx.font = `700 ${bh * 0.19}px "Barlow Condensed", sans-serif`;
    ctx.fillText(BRAND2, tx, sling + bh * 0.63, tw);
    ctx.fillStyle = C.yellow; ctx.font = `600 ${bh * 0.12}px "Barlow", sans-serif`;
    ctx.fillText(TAGLINE, tx, sling + bh * 0.84, tw);
    ctx.restore();

    // aviation warning lights
    const blink = Math.sin(t * 4) > 0.3;
    if (blink) {
      ctx.globalCompositeOperation = "lighter";
      [[cx, apexY], [jx2, jy2 - mw * 0.35]].forEach(([x, y]) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, 14);
        g.addColorStop(0, "rgba(255,60,40,1)"); g.addColorStop(1, "rgba(255,60,40,0)");
        ctx.fillStyle = g; ctx.fillRect(x - 14, y - 14, 28, 28);
      });
      ctx.globalCompositeOperation = "source-over";
    }
  }

  function ground(t) {
    const { groundY } = S;
    const day = isDay();
    const g = ctx.createLinearGradient(0, groundY, 0, H);
    if (day) { g.addColorStop(0, "#77705F"); g.addColorStop(1, "#4D483F"); }
    else { g.addColorStop(0, "#1D1B18"); g.addColorStop(1, "#0D0C0B"); }
    ctx.fillStyle = g; ctx.fillRect(0, groundY, W, H - groundY);

    // site hoarding (fence) with hazard stripes + brand panels
    const fh = Math.max(26, H * 0.045), fy = groundY - fh * 0.75;
    ctx.fillStyle = "#1B1D21"; ctx.fillRect(0, fy, W, fh);
    const sh = fh * 0.22;
    ctx.save(); ctx.beginPath(); ctx.rect(0, fy, W, sh); ctx.clip();
    ctx.fillStyle = C.yellow; ctx.fillRect(0, fy, W, sh);
    ctx.fillStyle = "#111";
    for (let x = -sh * 2; x < W + sh * 2; x += sh * 2) { ctx.beginPath(); ctx.moveTo(x, fy + sh); ctx.lineTo(x + sh, fy); ctx.lineTo(x + sh * 2, fy); ctx.lineTo(x + sh, fy + sh); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = "rgba(255,255,255,.75)"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = `700 ${fh * 0.42}px "Barlow Condensed", sans-serif`;
    const step = Math.max(360, W / 3);
    for (let x = step / 2; x < W; x += step) ctx.fillText(BRAND + " " + BRAND2 + "  —  SITE IN PROGRESS", x, fy + sh + (fh - sh) / 2 + 1, step - 30);

    // road: two lanes
    const ry = fy + fh;
    ctx.fillStyle = day ? "#45443F" : "#161514"; ctx.fillRect(0, ry, W, S.roadBottom - ry);
    ctx.strokeStyle = day ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.18)"; ctx.lineWidth = 2; ctx.setLineDash([24, 22]);
    line(0, lerp(ry, S.roadBottom, 0.5), W, lerp(ry, S.roadBottom, 0.5)); ctx.setLineDash([]);

    const s = Math.max(0.45, Math.min(0.9, (S.roadBottom - ry) / 70));
    const L = 150 * s, period = 22, span = W + L * 2.5;
    // daytime traffic — far lane first (smaller, heading right), then the near lane (heading left)
    if (day) {
      const farY = lerp(ry, S.roadBottom, 0.5) - 3;
      S.traffic.filter(v => v.lane === 1).forEach(v => {
        const x = -L * 1.5 + ((((t * 0.8) / period + v.slot) % 1) * span);
        vehicle(v, x, farY, s * 0.62, +1, t);
      });
      S.traffic.filter(v => v.lane === 0).forEach(v => {
        const x = W + L - (((t / period + v.slot) % 1) * span);
        vehicle(v, x, S.roadBottom - 6, s, -1, t);
      });
    }
    truck(t, ry, s, day);   // the K V Paulose and Sons truck — the only vehicle at night
  }

  // a wheel with turning spokes
  function wheel(x, y, r, t) {
    ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#8a8a8a"; ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#444"; ctx.lineWidth = 1;
    const a = -t * 6;
    for (let k = 0; k < 3; k++) { const aa = a + (k * Math.PI * 2) / 3; line(x, y, x + Math.cos(aa) * r * 0.45, y + Math.sin(aa) * r * 0.45); }
  }

  // generic road vehicles (drawn facing left; dir = +1 flips them to drive right)
  function vehicle(v, x, y, s, dir, t) {
    ctx.save(); ctx.translate(x, y);
    if (dir > 0) ctx.scale(-1, 1);
    const glass = "#8DB6D6";
    if (v.kind === "car") {
      ctx.fillStyle = v.color;
      ctx.beginPath(); ctx.moveTo(0, -10 * s); ctx.lineTo(4 * s, -22 * s); ctx.lineTo(22 * s, -24 * s); ctx.lineTo(30 * s, -36 * s);
      ctx.lineTo(60 * s, -36 * s); ctx.lineTo(70 * s, -24 * s); ctx.lineTo(80 * s, -22 * s); ctx.lineTo(80 * s, -10 * s); ctx.closePath(); ctx.fill();
      ctx.fillStyle = glass; ctx.beginPath(); ctx.moveTo(26 * s, -25 * s); ctx.lineTo(32 * s, -33 * s); ctx.lineTo(44 * s, -33 * s); ctx.lineTo(44 * s, -25 * s); ctx.fill();
      ctx.beginPath(); ctx.moveTo(48 * s, -25 * s); ctx.lineTo(48 * s, -33 * s); ctx.lineTo(58 * s, -33 * s); ctx.lineTo(65 * s, -25 * s); ctx.fill();
      ctx.fillStyle = "#FFE9A8"; ctx.fillRect(0, -20 * s, 4 * s, 4 * s);
      wheel(17 * s, -8 * s, 8 * s, t); wheel(63 * s, -8 * s, 8 * s, t);
    } else if (v.kind === "bus") {
      ctx.fillStyle = "#F2EFE6"; ctx.fillRect(0, -58 * s, 160 * s, 48 * s);
      ctx.fillStyle = v.color; ctx.fillRect(0, -26 * s, 160 * s, 9 * s);
      ctx.fillStyle = "#2E4A62";
      for (let k = 0; k < 7; k++) ctx.fillRect((8 + k * 21) * s, -52 * s, 16 * s, 16 * s);
      ctx.fillRect(0, -52 * s, 6 * s, 22 * s);
      wheel(28 * s, -9 * s, 10 * s, t); wheel(132 * s, -9 * s, 10 * s, t);
    } else if (v.kind === "auto") {
      ctx.fillStyle = "#1E1E1E";                                            // canopy
      ctx.beginPath(); ctx.moveTo(6 * s, -24 * s); ctx.quadraticCurveTo(10 * s, -48 * s, 30 * s, -48 * s); ctx.lineTo(54 * s, -48 * s); ctx.lineTo(54 * s, -24 * s); ctx.fill();
      ctx.fillStyle = "#F4C430"; ctx.fillRect(4 * s, -24 * s, 52 * s, 14 * s);   // body
      ctx.fillStyle = "#1E8449"; ctx.fillRect(4 * s, -14 * s, 52 * s, 3 * s);
      ctx.fillStyle = glass; ctx.fillRect(12 * s, -42 * s, 10 * s, 14 * s);
      wheel(10 * s, -7 * s, 6 * s, t); wheel(46 * s, -7 * s, 6 * s, t);
    } else {                                                                // lorry
      ctx.fillStyle = v.color; ctx.fillRect(0, -42 * s, 32 * s, 32 * s);
      ctx.fillStyle = glass; ctx.fillRect(4 * s, -38 * s, 18 * s, 12 * s);
      ctx.fillStyle = "#7A6248"; ctx.fillRect(34 * s, -50 * s, 96 * s, 38 * s);
      ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 1;
      for (let k = 1; k < 6; k++) line((34 + k * 16) * s, -50 * s, (34 + k * 16) * s, -12 * s);
      ctx.fillStyle = "#222"; ctx.fillRect(-2 * s, -14 * s, 134 * s, 5 * s);
      wheel(16 * s, -8 * s, 9 * s, t); wheel(92 * s, -8 * s, 9 * s, t); wheel(114 * s, -8 * s, 9 * s, t);
    }
    ctx.restore();
  }

  function truck(t, ry, s, day) {
    const L = 150 * s, period = 22;
    const x = W + L - ((t % period) / period) * (W + L * 2.5);
    const y = S.roadBottom - 6;
    ctx.save(); ctx.translate(x, y);
    // dump body
    ctx.fillStyle = C.yellow; ctx.beginPath();
    ctx.moveTo(40 * s, -50 * s); ctx.lineTo(140 * s, -55 * s); ctx.lineTo(135 * s, -14 * s); ctx.lineTo(45 * s, -14 * s); ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#6b4f2a"; ctx.beginPath(); ctx.ellipse(90 * s, -52 * s, 46 * s, 8 * s, 0, Math.PI, 0); ctx.fill();
    // cab
    ctx.fillStyle = "#E8A90F"; ctx.fillRect(0, -44 * s, 38 * s, 30 * s);
    ctx.fillStyle = "#3a5f7a"; ctx.fillRect(5 * s, -40 * s, 20 * s, 12 * s);
    ctx.fillStyle = "#222"; ctx.fillRect(-4 * s, -16 * s, 150 * s, 6 * s);
    // logo text on body
    ctx.fillStyle = "#111"; ctx.font = `700 ${11 * s}px "Barlow Condensed", sans-serif`; ctx.textAlign = "center";
    ctx.fillText(BRAND, 90 * s, -28 * s, 84 * s);
    // wheels
    [18, 100, 126].forEach(wx => {
      ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(wx * s, -6 * s, 11 * s, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#777"; ctx.lineWidth = 2;
      const a = -t * 6;
      for (let k = 0; k < 3; k++) { const aa = a + (k * Math.PI * 2) / 3; line(wx * s, -6 * s, wx * s + Math.cos(aa) * 7 * s, -6 * s + Math.sin(aa) * 7 * s); }
    });
    // headlight beam (night only)
    if (!day) {
      ctx.globalCompositeOperation = "lighter";
      const hg = ctx.createLinearGradient(0, 0, -120 * s, 0);
      hg.addColorStop(0, "rgba(255,230,170,.5)"); hg.addColorStop(1, "rgba(255,230,170,0)");
      ctx.fillStyle = hg; ctx.beginPath(); ctx.moveTo(0, -24 * s); ctx.lineTo(-120 * s, -40 * s); ctx.lineTo(-120 * s, 0); ctx.lineTo(0, -16 * s); ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }
    ctx.restore();
  }

  function dust(t) {
    S.dust.forEach(d => {
      const y = (d.y - t * d.v) % H, yy = y < 0 ? y + H : y;
      const x = d.x + Math.sin(t * 0.5 + d.p) * 20;
      ctx.fillStyle = `rgba(255,220,170,${0.08 + 0.12 * Math.sin(t + d.p) ** 2})`;
      ctx.beginPath(); ctx.arc(x, yy, d.s, 0, Math.PI * 2); ctx.fill();
    });
  }

  /* ---------- loop ---------- */
  let last = performance.now(), time = 0, running = true, raf;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;
    draw(time, dt);
    if (running) raf = requestAnimationFrame(frame);
  }
  function draw(t, dt) {
    ctx.clearRect(0, 0, W, H);
    sky(t); skyline(t); building(t); sparks(dt); crane(t); ground(t); rain(t, dt); dust(t);
  }

  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  resize();
  addEventListener("resize", resize);
  // re-measure once web fonts have loaded (headline height changes)
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { resize(); draw(time, 0); });

  if (reduce) { draw(6, 0); logo.onload = () => draw(6, 0); return; }
  raf = requestAnimationFrame(frame);

  // pause when the hero is off-screen or the tab is hidden (saves battery)
  const start = () => { if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(frame); } };
  const stop = () => { running = false; cancelAnimationFrame(raf); };
  new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop())).observe(cvs);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
})();
