/* =========================================================
   HERO "VIDEO" — a looping animated construction scene drawn
   on <canvas>: a KVP SONS tower crane slewing over a building
   under construction, with a swinging load, welding sparks,
   distant cranes, drifting clouds and a dump truck.
   Tweak the COLORS / TEXT constants below.
   ========================================================= */
(() => {
  const cvs = document.getElementById("heroCanvas");
  if (!cvs) return;
  const ctx = cvs.getContext("2d");

  const BRAND = "KVP SONS";
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
    const craneX = mobile ? W * 0.36 : W * 0.64;
    const jibL = mobile ? W * 0.52 : Math.min(W * 0.34, 560);

    const bx = craneX + mw * 2.2;
    const bw = Math.max(120, Math.min(W * 0.24, W - bx - (mobile ? 8 : 40)));
    const bh = mastH * 0.6;

    // far skyline
    const skyline = [];
    for (let x = -20; x < W + 40;) {
      const w = 30 + r() * 70, h = H * (0.08 + r() * 0.22);
      const wins = [];
      for (let i = 0; i < 14; i++) wins.push([r() * (w - 6), r() * (h - 8), r() > 0.55]);
      skyline.push({ x, w, h, wins });
      x += w + r() * 8;
    }
    // building window state
    const floors = 12, cols = 6;
    const lit = [];
    for (let i = 0; i < floors * cols * 2; i++) lit.push(r());
    const clouds = Array.from({ length: 7 }, () => ({ x: r() * W, y: H * (0.06 + r() * 0.35), s: 60 + r() * 140, v: 4 + r() * 8 }));
    const dust = Array.from({ length: 50 }, () => ({ x: r() * W, y: r() * H, s: 0.6 + r() * 1.8, v: 6 + r() * 14, p: r() * 6 }));

    S = { mobile, groundY, roadBottom, mastH, mw, craneX, jibL, cjL: jibL * 0.33, topY: groundY - mastH,
          bx, bw, bh, floors, cols, skyline, lit, clouds, dust, sparks: [], sparkSrc: { x: 0, y: 0, t: 0 } };
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
    const g = ctx.createLinearGradient(0, 0, 0, S.groundY);
    g.addColorStop(0, "#0E1A2B"); g.addColorStop(0.45, "#33435C");
    g.addColorStop(0.78, "#C9875A"); g.addColorStop(1, "#F2B27A");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // sun glow
    const sx = W * (S.mobile ? 0.8 : 0.3), sy = S.groundY - H * 0.1;
    const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, H * 0.55);
    sg.addColorStop(0, "rgba(255,214,150,.85)"); sg.addColorStop(0.15, "rgba(255,180,110,.35)"); sg.addColorStop(1, "rgba(255,160,90,0)");
    ctx.fillStyle = sg; ctx.fillRect(0, 0, W, H);
    // clouds
    S.clouds.forEach(c => {
      const x = ((c.x + t * c.v) % (W + c.s * 3)) - c.s * 1.5;
      ctx.fillStyle = "rgba(255,225,200,.07)";
      for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.ellipse(x + k * c.s * 0.45, c.y + Math.sin(k) * 6, c.s * 0.55, c.s * 0.16, 0, 0, Math.PI * 2); ctx.fill(); }
    });
  }

  function skyline(t) {
    S.skyline.forEach(b => {
      const y = S.groundY - b.h;
      ctx.fillStyle = "rgba(38,46,62,.85)"; ctx.fillRect(b.x, y, b.w, b.h);
      b.wins.forEach(([wx, wy, on], i) => {
        if (!on) return;
        const flick = 0.5 + 0.5 * Math.sin(t * 0.3 + i * 7.1);
        ctx.fillStyle = `rgba(255,200,120,${0.25 + flick * 0.35})`;
        ctx.fillRect(b.x + 3 + wx, y + 4 + wy, 3, 4);
      });
    });
    // distant cranes
    [[0.12, 0.42, 0.11], [0.9, 0.36, -0.08], [0.47, 0.3, 0.06]].forEach(([fx, fh, sp], i) => {
      const x = W * fx, top = S.groundY - H * fh, a = Math.sin(t * sp + i * 2);
      ctx.strokeStyle = "rgba(30,36,48,.9)"; ctx.lineWidth = 2;
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
          const on = v > 0.55 && Math.sin(t * 0.2 + v * 40) > -0.6;
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
    ctx.fillText(BRAND + "  ·  SINCE 1920", bx + bw / 2, by + bH / 2 + 1, bw - 20);

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

    // --- sign board on the mast ---
    const bw = Math.max(150, Math.min(mw * 11, 270)), bh = bw * 0.4;
    const sy = topY + mastH * 0.3, sx = cx - bw / 2;
    ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(sx + 6, sy + 6, bw, bh);
    ctx.fillStyle = C.sign; ctx.fillRect(sx, sy, bw, bh);
    ctx.strokeStyle = C.yellow; ctx.lineWidth = 3; ctx.strokeRect(sx + 1.5, sy + 1.5, bw - 3, bh - 3);
    if (logo.complete && logo.naturalWidth) {
      const lh = bh * 0.72, lw = lh * (logo.naturalWidth / logo.naturalHeight);
      ctx.drawImage(logo, sx + bh * 0.16, sy + (bh - lh) / 2, lw, lh);
      var tx = sx + bh * 0.16 + lw + bh * 0.18;
    } else var tx = sx + 14;
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#fff"; ctx.font = `700 ${bh * 0.42}px "Barlow Condensed", sans-serif`;
    ctx.fillText(BRAND, tx, sy + bh * 0.56, sx + bw - tx - 10);
    ctx.fillStyle = C.yellow; ctx.font = `600 ${bh * 0.15}px "Barlow", sans-serif`;
    ctx.fillText(TAGLINE, tx, sy + bh * 0.8, sx + bw - tx - 10);

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
    if (cwW > 30) {
      ctx.save(); ctx.translate(cwX + cwW / 2, cy2 + mw * 0.95); ctx.scale(Math.max(0.2, Math.abs(cos)), 1);
      ctx.fillStyle = C.yellow; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = `700 ${mw * 0.95}px "Barlow Condensed", sans-serif`; ctx.fillText("KVP", 0, 0);
      ctx.restore();
    }

    // main jib
    ctx.strokeStyle = C.yellow; ctx.lineWidth = Math.max(1, mw * 0.08);
    truss(cx, jy, jx2, jy2, mw * 0.9, mw * 0.35, Math.max(4, Math.round(Math.abs(cos) * 16)));

    // trolley + hoist
    const f = 0.32 + 0.5 * (0.5 + 0.5 * Math.sin((t * 2 * Math.PI) / 17));
    const trX = lerp(cx, jx2, f), trY = lerp(jy, jy2, f);
    ctx.fillStyle = "#222"; ctx.fillRect(trX - mw * 0.45, trY, mw * 0.9, mw * 0.35);
    const len = mastH * (0.18 + 0.2 * (0.5 + 0.5 * Math.sin((t * 2 * Math.PI) / 13 + 1)));
    const phi = 0.06 * Math.sin(t * 1.8) + 0.04 * Math.cos((t * 2 * Math.PI) / 26);
    const hx = trX + Math.sin(phi) * len, hy = trY + Math.cos(phi) * len;
    ctx.strokeStyle = "rgba(25,25,25,.95)"; ctx.lineWidth = 1.2;
    line(trX - 2, trY + mw * 0.35, hx - 2, hy); line(trX + 2, trY + mw * 0.35, hx + 2, hy);
    // hook block
    ctx.fillStyle = C.yellow; ctx.fillRect(hx - mw * 0.35, hy, mw * 0.7, mw * 0.55);
    ctx.fillStyle = "#222"; ctx.fillRect(hx - mw * 0.35, hy + mw * 0.2, mw * 0.7, mw * 0.12);
    // load: bundle of steel beams on slings
    const LW = mw * 5 * Math.max(0.3, Math.abs(cos)), ly = hy + mw * 1.8;
    ctx.save(); ctx.translate(hx, ly); ctx.rotate(phi * 0.6);
    ctx.strokeStyle = "rgba(40,40,40,.9)"; ctx.lineWidth = 1;
    line(0, -mw * 1.25, -LW / 2 + 4, 0); line(0, -mw * 1.25, LW / 2 - 4, 0);
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = k === 1 ? "#A3471E" : "#B9562A";
      ctx.fillRect(-LW / 2, k * mw * 0.32, LW, mw * 0.28);
    }
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
    const g = ctx.createLinearGradient(0, groundY, 0, H);
    g.addColorStop(0, "#2A2722"); g.addColorStop(1, "#141311");
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
    const step = Math.max(260, W / 4);
    for (let x = step / 2; x < W; x += step) ctx.fillText(BRAND + "  —  SITE IN PROGRESS", x, fy + sh + (fh - sh) / 2 + 1);

    // road + moving dump truck
    const ry = fy + fh;
    ctx.fillStyle = "#1E1D1B"; ctx.fillRect(0, ry, W, S.roadBottom - ry);
    ctx.strokeStyle = "rgba(255,255,255,.22)"; ctx.lineWidth = 2; ctx.setLineDash([24, 22]);
    line(0, lerp(ry, S.roadBottom, 0.82), W, lerp(ry, S.roadBottom, 0.82)); ctx.setLineDash([]);
    truck(t, ry);
  }

  function truck(t, ry) {
    const s = Math.max(0.45, Math.min(0.9, (S.roadBottom - ry) / 70));
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
    ctx.fillStyle = "#111"; ctx.font = `700 ${13 * s}px "Barlow Condensed", sans-serif`; ctx.textAlign = "center";
    ctx.fillText(BRAND, 90 * s, -28 * s);
    // wheels
    [18, 100, 126].forEach(wx => {
      ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(wx * s, -6 * s, 11 * s, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#777"; ctx.lineWidth = 2;
      const a = -t * 6;
      for (let k = 0; k < 3; k++) { const aa = a + (k * Math.PI * 2) / 3; line(wx * s, -6 * s, wx * s + Math.cos(aa) * 7 * s, -6 * s + Math.sin(aa) * 7 * s); }
    });
    // headlight beam
    ctx.globalCompositeOperation = "lighter";
    const hg = ctx.createLinearGradient(0, 0, -90 * s, 0);
    hg.addColorStop(0, "rgba(255,230,170,.35)"); hg.addColorStop(1, "rgba(255,230,170,0)");
    ctx.fillStyle = hg; ctx.beginPath(); ctx.moveTo(0, -24 * s); ctx.lineTo(-90 * s, -36 * s); ctx.lineTo(-90 * s, 0); ctx.lineTo(0, -16 * s); ctx.fill();
    ctx.restore(); ctx.globalCompositeOperation = "source-over";
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
    sky(t); skyline(t); building(t); sparks(dt); crane(t); ground(t); dust(t);
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
