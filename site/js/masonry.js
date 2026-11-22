/* =========================================================
   MASONRY GALLERY — plain-JavaScript port of React Bits' <Masonry />
   (https://reactbits.dev — JS + CSS variant)

   Same behaviour as the original, without React or icon packages:
   - masonry layout that fits as many columns of `columnWidth` as fit
   - tiles spring into place and sharpen from a blur as they scroll into view
   - hover zoom; drag a tile with the mouse to reorder (grid reflows around it)
   - click a photo: it grows into a lightbox; ← → keys / buttons step, Esc closes
   Added: "Show more" paging so 200+ photos never make one endless page.
   ========================================================= */
(() => {
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const EASE = "cubic-bezier(0.2, 0.9, 0.2, 1)";
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ICON = {
    close: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    prev: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
    next: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>'
  };

  window.Masonry = function Masonry(root, opts = {}) {
    const o = Object.assign({
      items: [],              // [{ id, img, full, width, height, alt }]
      columnWidth: 240, mobileColumnWidth: 150, gap: 12, radius: 12,
      animateFrom: "bottom", stagger: 0.05, duration: 0.6, bounce: 0.15, blurToFocus: true,
      hoverEffect: "zoom", lightbox: true, draggable: true,
      pageSize: 30, moreLabel: "Load more"
    }, opts);

    root.classList.add("masonry");
    root.dataset.hover = o.hoverEffect;
    root.style.setProperty("--masonry-radius", o.radius + "px");
    root.setAttribute("role", "list");

    let order = o.items.slice();            // current order (changes when dragged)
    let shownCount = Math.min(o.pageSize, order.length);
    const nodes = new Map(), springs = new Map();
    let width = 0, raf = 0, last = 0;

    /* ----- layout ----- */
    const grid = w => {
      const cw = w < 640 ? o.mobileColumnWidth : o.columnWidth;   // phones: two columns
      const count = Math.max(1, Math.floor((w + o.gap) / (Math.max(40, cw) + o.gap)));
      return { count, size: Math.max(1, (w - o.gap * (count - 1)) / count) };
    };
    const place = (heights, item, g, commit) => {
      let column = 0, top = Infinity;
      for (let c = 0; c < g.count; c++) if (heights[c] < top - 0.5) { top = heights[c]; column = c; }
      const w = g.size, h = Math.max(1, w * (item.height / item.width));
      if (commit) heights[column] = top + h + o.gap;
      return { x: Math.round(column * (g.size + o.gap)), y: Math.round(top), w, h };
    };
    const visibleItems = () => order.slice(0, shownCount);
    function layout() {
      if (!width) return;
      const g = grid(width), heights = new Array(g.count).fill(0);
      visibleItems().forEach(item => {
        const t = place(heights, item, g, true);
        let node = nodes.get(item.id);
        if (!node) node = makeTile(item);
        node.style.width = t.w + "px"; node.style.height = t.h + "px";
        let s = springs.get(item.id);
        if (!s) {
          s = { x: t.x, y: t.y, s: 1, vx: 0, vy: 0, vs: 0, tx: t.x, ty: t.y, w: t.w, h: t.h, shown: false, dragging: false, reveal: 0, start: 0, blur: false };
          springs.set(item.id, s);
          node.style.opacity = "0"; node.style.transform = `translate3d(${t.x}px,${t.y}px,0)`;
          observer.observe(node);
        }
        s.tx = t.x; s.ty = t.y; s.w = t.w; s.h = t.h;
        if (!s.shown) { s.x = t.x; s.y = t.y; node.style.transform = `translate3d(${t.x}px,${t.y}px,0)`; }
      });
      root.style.height = Math.max(0, Math.max(...heights) - o.gap) + "px";
      kick();
    }

    /* ----- tiles ----- */
    function makeTile(item) {
      const node = document.createElement("div");
      node.className = "masonry__item"; node.dataset.id = item.id; node.setAttribute("role", "listitem");
      node.innerHTML = `<button class="masonry__card" type="button" aria-label="${item.alt || "Open photo"}">
          <span class="masonry__media" data-media><span class="masonry__parallax">
            <img class="masonry__image" alt="${item.alt || ""}" draggable="false" decoding="async" loading="lazy">
          </span></span></button>`;
      const img = node.querySelector("img"), card = node.querySelector(".masonry__card");
      img.addEventListener("load", () => img.setAttribute("data-loaded", ""));
      img.addEventListener("error", () => img.setAttribute("data-loaded", ""));
      img.src = item.img;
      card.addEventListener("click", e => { if (suppress) { e.preventDefault(); return; } if (o.lightbox) openBox(item.id); });
      card.addEventListener("pointerdown", e => startDrag(e, item.id));
      root.appendChild(node);
      nodes.set(item.id, node);
      return node;
    }

    /* ----- spring engine (as in the original) ----- */
    function paint(id, s) {
      const node = nodes.get(id); if (!node) return;
      node.style.transform = `translate3d(${s.x}px,${s.y}px,0) scale(${s.s})`;
      if (s.reveal < 1) {
        const e = 1 - Math.pow(1 - Math.max(0, s.reveal), 3);
        node.style.opacity = String(e);
        node.style.filter = s.blur ? `blur(${((1 - e) * 12).toFixed(2)}px)` : "";
      } else if (node.style.opacity !== "") { node.style.opacity = ""; node.style.filter = ""; }
    }
    function frame(now) {
      raf = 0;
      const elapsed = clamp((now - last) / 1000, 0, 1 / 20); last = now;
      const omega = (Math.PI * 2) / Math.max(0.05, o.duration), zeta = clamp(1 - o.bounce, 0.1, 1);
      const steps = Math.max(1, Math.ceil(elapsed / (1 / 240))), dt = elapsed / steps;
      let active = false;
      springs.forEach((s, id) => {
        if (!s.shown) return;
        if (s.dragging) { paint(id, s); return; }
        if (now < s.start) { active = true; return; }
        for (let i = 0; i < steps; i++) {
          s.vx += (-omega * omega * (s.x - s.tx) - 2 * zeta * omega * s.vx) * dt;
          s.vy += (-omega * omega * (s.y - s.ty) - 2 * zeta * omega * s.vy) * dt;
          s.vs += (-omega * omega * (s.s - 1) - 2 * zeta * omega * s.vs) * dt;
          s.x += s.vx * dt; s.y += s.vy * dt; s.s += s.vs * dt;
        }
        const rest = Math.abs(s.x - s.tx) < 0.05 && Math.abs(s.y - s.ty) < 0.05 && Math.abs(s.s - 1) < 0.0005 &&
          Math.abs(s.vx) + Math.abs(s.vy) < 0.05 && Math.abs(s.vs) < 0.001;
        if (rest) { s.x = s.tx; s.y = s.ty; s.s = 1; s.vx = s.vy = s.vs = 0; } else active = true;
        if (s.reveal < 1) { s.reveal = clamp((now - s.start) / (o.duration * 1000), 0, 1); if (s.reveal < 1) active = true; }
        paint(id, s);
      });
      if (active) raf = requestAnimationFrame(frame);
    }
    function kick() { if (raf) return; last = performance.now(); raf = requestAnimationFrame(frame); }

    /* ----- reveal tiles as they scroll into view ----- */
    let pending = [], flushQueued = false;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { pending.push(e.target.dataset.id); observer.unobserve(e.target); } });
      if (pending.length && !flushQueued) { flushQueued = true; requestAnimationFrame(flush); }
    }, { rootMargin: "0px 0px -6% 0px" });
    function flush() {
      flushQueued = false;
      const batch = pending.map(id => ({ id, s: springs.get(id) })).filter(b => b.s && !b.s.shown);
      pending = [];
      batch.sort((a, b) => a.s.ty - b.s.ty || a.s.tx - b.s.tx);
      const now = performance.now(), still = reduced() || o.animateFrom === "none";
      batch.forEach(({ id, s }, rank) => {
        s.shown = true; s.blur = o.blurToFocus && !still;
        if (still) { s.x = s.tx; s.y = s.ty; s.s = 1; s.reveal = 1; paint(id, s); return; }
        const dist = 60 + Math.min(s.h, 280) * 0.35;
        s.x = s.tx; s.y = s.ty + (o.animateFrom === "bottom" ? dist : 0); s.s = 0.96;
        s.vx = s.vy = s.vs = 0; s.reveal = 0; s.start = now + rank * o.stagger * 1000;
        paint(id, s);
      });
      kick();
    }

    /* ----- drag to reorder (mouse only, like the original) ----- */
    let drag = null, suppress = false;
    function startDrag(e, id) {
      if (!o.draggable || e.button !== 0 || e.pointerType === "touch" || openId) return;
      const s = springs.get(id); if (!s) return;
      const r = root.getBoundingClientRect();
      drag = { id, pid: e.pointerId, sx: e.clientX, sy: e.clientY, ox: e.clientX - r.left - s.x, oy: e.clientY - r.top - s.y, active: false };
      window.addEventListener("pointermove", moveDrag); window.addEventListener("pointerup", endDrag); window.addEventListener("pointercancel", endDrag);
    }
    function moveDrag(e) {
      if (!drag || e.pointerId !== drag.pid) return;
      const s = springs.get(drag.id); if (!s || !s.shown) return;
      if (!drag.active) {
        if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6) return;
        drag.active = true; s.dragging = true; s.vx = s.vy = s.vs = 0;
        nodes.get(drag.id).setAttribute("data-dragging", ""); root.setAttribute("data-dragging", "");
      }
      const r = root.getBoundingClientRect();
      s.x = e.clientX - r.left - drag.ox; s.y = e.clientY - r.top - drag.oy; s.s = 1;
      paint(drag.id, s); kick();
      // find the slot nearest the dragged tile's centre and reflow around it
      const vis = visibleItems(), dragged = vis.find(i => i.id === drag.id), others = vis.filter(i => i.id !== drag.id);
      const g = grid(width), heights = new Array(g.count).fill(0), slots = [];
      for (let i = 0; i <= others.length; i++) {
        const t = place(heights, dragged, g, false); slots.push({ x: t.x + t.w / 2, y: t.y + t.h / 2 });
        if (i < others.length) place(heights, others[i], g, true);
      }
      const cx = s.x + s.w / 2, cy = s.y + s.h / 2, cur = vis.indexOf(dragged);
      let best = cur, near = Math.hypot(slots[cur].x - cx, slots[cur].y - cy);
      const thr = near * 0.8 - 6;
      slots.forEach((sl, i) => { const d = Math.hypot(sl.x - cx, sl.y - cy); if (d < near && d < thr) { near = d; best = i; } });
      if (best === cur) return;
      const rest = order.slice(shownCount);
      others.splice(best, 0, dragged);
      order = others.concat(rest);
      layout();
    }
    function endDrag() {
      window.removeEventListener("pointermove", moveDrag); window.removeEventListener("pointerup", endDrag); window.removeEventListener("pointercancel", endDrag);
      const d = drag; drag = null;
      if (!d || !d.active) return;
      const s = springs.get(d.id); if (s) s.dragging = false;
      nodes.get(d.id).removeAttribute("data-dragging"); root.removeAttribute("data-dragging");
      suppress = true; setTimeout(() => { suppress = false; }, 0);
      kick();
    }

    /* ----- lightbox ----- */
    let openId = null, box = null;
    const mediaRect = id => nodes.get(id)?.querySelector("[data-media]")?.getBoundingClientRect();
    const frameFor = item => {
      const pad = innerWidth < 640 ? 16 : 72, ar = item.height / item.width;
      let w = Math.max(40, innerWidth - pad * 2), h = w * ar;
      const maxH = Math.max(40, innerHeight - pad * 2);
      if (h > maxH) { h = maxH; w = h / ar; }
      return { left: (innerWidth - w) / 2, top: (innerHeight - h) / 2, width: w, height: h };
    };
    function openBox(id, stepping) {
      const item = order.find(i => i.id === id); if (!item) return;
      const prevId = openId; openId = id;
      if (prevId) nodes.get(prevId)?.removeAttribute("data-hidden");
      nodes.get(id)?.setAttribute("data-hidden", "");
      const f = frameFor(item);
      if (!box) {
        box = document.createElement("div");
        box.className = "masonry-lightbox"; box.setAttribute("role", "dialog"); box.setAttribute("aria-modal", "true");
        box.innerHTML = `<div class="masonry-lightbox__backdrop" data-backdrop></div>
          <img class="masonry-lightbox__image" data-image alt="" draggable="false">
          <button type="button" class="masonry-lightbox__button masonry-lightbox__close" data-fade aria-label="Close">${ICON.close}</button>
          <button type="button" class="masonry-lightbox__button masonry-lightbox__prev" data-fade aria-label="Previous photo">${ICON.prev}</button>
          <button type="button" class="masonry-lightbox__button masonry-lightbox__next" data-fade aria-label="Next photo">${ICON.next}</button>`;
        box.querySelector("[data-backdrop]").addEventListener("click", closeBox);
        box.querySelector("[data-image]").addEventListener("click", closeBox);
        box.querySelector(".masonry-lightbox__close").addEventListener("click", closeBox);
        box.querySelector(".masonry-lightbox__prev").addEventListener("click", () => step(-1));
        box.querySelector(".masonry-lightbox__next").addEventListener("click", () => step(1));
        document.body.appendChild(box);
        document.documentElement.style.overflow = "hidden";
        addEventListener("keydown", onKey);
      }
      const img = box.querySelector("[data-image]");
      img.alt = item.alt || "";
      img.src = item.img;                                   // small copy instantly…
      const hi = new Image(); hi.onload = () => { if (openId === id) img.src = hi.src; }; hi.src = item.full;   // …sharp one after
      Object.assign(img.style, { left: f.left + "px", top: f.top + "px", width: f.width + "px", height: f.height + "px", borderRadius: "6px" });
      if (stepping) {
        img.animate([{ opacity: 0, transform: "scale(0.97)" }, { opacity: 1, transform: "none" }], { duration: reduced() ? 1 : 320, easing: EASE });
        return;
      }
      const r = mediaRect(id);
      if (r && !reduced()) {
        const sc = r.width / f.width;
        img.animate([{ transform: `translate(${r.left - f.left}px, ${r.top - f.top}px) scale(${sc})`, borderRadius: `${o.radius / Math.max(sc, 0.01)}px` },
                     { transform: "none", borderRadius: "6px" }], { duration: 520, easing: EASE });
        box.querySelector("[data-backdrop]").animate([{ opacity: 0 }, { opacity: 1 }], { duration: 360, easing: "ease" });
        box.querySelectorAll("[data-fade]").forEach(b => b.animate([{ opacity: 0 }, { opacity: 0, offset: 0.5 }, { opacity: 1 }], { duration: 560 }));
      }
      box.querySelector(".masonry-lightbox__close").focus({ preventScroll: true });
    }
    function step(dir) {
      if (!openId) return;
      const vis = visibleItems(), i = vis.findIndex(x => x.id === openId);
      openBox(vis[(i + dir + vis.length) % vis.length].id, true);
    }
    function closeBox() {
      if (!openId || !box) return;
      const id = openId, b = box, img = b.querySelector("[data-image]"), r = mediaRect(id);
      const finish = () => {
        b.remove(); nodes.get(id)?.removeAttribute("data-hidden");
        document.documentElement.style.overflow = "";
        removeEventListener("keydown", onKey);
        nodes.get(id)?.querySelector(".masonry__card")?.focus({ preventScroll: true });
      };
      openId = null; box = null;
      if (!r || reduced()) { finish(); return; }
      const cur = img.getBoundingClientRect(), sc = r.width / cur.width;
      img.getAnimations().forEach(a => a.cancel());
      const anim = img.animate([{ transform: "none", borderRadius: "6px" },
        { transform: `translate(${r.left - cur.left}px, ${r.top - cur.top}px) scale(${sc})`, borderRadius: `${o.radius / Math.max(sc, 0.01)}px` }],
        { duration: 380, easing: EASE, fill: "forwards" });
      b.querySelector("[data-backdrop]").animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "forwards" });
      b.querySelectorAll("[data-fade]").forEach(x => x.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 160, fill: "forwards" }));
      anim.finished.then(finish, finish);
    }
    function onKey(e) {
      if (e.key === "Escape") closeBox(); else if (e.key === "ArrowRight") step(1); else if (e.key === "ArrowLeft") step(-1);
    }

    /* ----- "Show more" paging ----- */
    let moreBtn = null;
    function updateMore() {
      const left = order.length - shownCount;
      if (left <= 0) { moreBtn?.remove(); moreBtn = null; return; }
      if (!moreBtn) {
        moreBtn = document.createElement("button");
        moreBtn.type = "button"; moreBtn.className = "masonry-more btn btn--ghost";
        moreBtn.addEventListener("click", () => { shownCount = Math.min(order.length, shownCount + o.pageSize); layout(); updateMore(); });
        root.after(moreBtn);
      }
      moreBtn.textContent = o.moreLabel;
    }

    new ResizeObserver(([e]) => { const w = Math.round(e.contentRect.width); if (w !== width) { width = w; layout(); } }).observe(root);
    width = Math.round(root.getBoundingClientRect().width);
    layout(); updateMore();
  };
})();
