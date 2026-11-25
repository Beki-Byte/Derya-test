/* =========================================================
   Intro-Animation "Wachstum" (Startseite)
   Samen fällt in die Erde → Gießkanne gießt → Setzling →
   nochmal gießen → Baum wächst (Bewertungen in Sprechblasen) →
   Kamera fährt zu den Wurzeln (Unterbewusstsein): verknotet wie
   ein Wollknäuel, entwirren sich (Angebote in Sprechblasen) → Hero.
   Alles wird beim Scrollen gesteuert (0 … 1), keine Bibliothek nötig.
   ========================================================= */
(function () {
    "use strict";
    const sec = document.getElementById("grow");
    if (!sec) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { sec.classList.add("is-off"); return; }

    const NS = "http://www.w3.org/2000/svg";
    const stage = sec.querySelector(".grow-stage");
    const svg = sec.querySelector(".grow-svg");

    /* ---------- kleine Helfer ---------- */
    const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
    const seg = (p, a, b) => clamp((p - a) / (b - a));              // 0…1 innerhalb [a,b]
    const ease = (t) => t * t * (3 - 2 * t);                          // weich rein/raus
    const easeOut = (t) => 1 - Math.pow(1 - t, 3);
    const back = (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
    const lerp = (a, b, t) => a + (b - a) * t;
    const r1 = (n) => Math.round(n * 10) / 10;
    function el(tag, attrs, parent) {
        const e = document.createElementNS(NS, tag);
        for (const k in attrs) e.setAttribute(k, attrs[k]);
        if (parent) parent.appendChild(e);
        return e;
    }
    // fester Zufall → der Baum sieht bei jedem Besuch gleich aus
    let seed = 20261125;
    const rnd = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    // glatte Kurve durch Punkte (Catmull-Rom → Bézier)
    function smooth(pts) {
        let d = `M${r1(pts[0][0])},${r1(pts[0][1])}`;
        for (let i = 0; i < pts.length - 1; i++) {
            const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
            d += `C${r1(p1[0] + (p2[0] - p0[0]) / 6)},${r1(p1[1] + (p2[1] - p0[1]) / 6)} ${r1(p2[0] - (p3[0] - p1[0]) / 6)},${r1(p2[1] - (p3[1] - p1[1]) / 6)} ${r1(p2[0])},${r1(p2[1])}`;
        }
        return d;
    }

    /* ---------- Farben ---------- */
    const WOOD = "#5b4436", WOOD_ROOT = "#6e5242", GREEN = ["#7f9165", "#8fa173", "#6f8459", "#a2ad80"], SOIL_LINE = "#bfa182";

    /* ---------- Szene aufbauen (Weltkoordinaten: Erdoberfläche bei y = 0) ---------- */
    const defs = el("defs", {}, svg);
    const soilGrad = el("linearGradient", { id: "growSoil", x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    el("stop", { offset: "0", "stop-color": "#e6d5bd" }, soilGrad);
    el("stop", { offset: "1", "stop-color": "#d3bb9a" }, soilGrad);
    el("rect", { x: -3000, y: 0, width: 6000, height: 3000, fill: "url(#growSoil)" }, svg);
    el("path", { d: "M-3000,0 L3000,0", stroke: SOIL_LINE, "stroke-width": 2.5, fill: "none" }, svg);

    // Wurzeln liegen hinter allem (unter der Erde)
    const rootsG = el("g", {}, svg);

    // Erdhügel über dem Samen
    const mound = el("path", { d: "M-34,1 Q0,-22 34,1 Z", fill: "#d9c3a3", stroke: SOIL_LINE, "stroke-width": 2 }, svg);

    // Samen
    const seedEl = el("ellipse", { rx: 7, ry: 10, fill: "#8c6a56", stroke: WOOD, "stroke-width": 1.5 }, svg);

    // Setzling (Fidan)
    const sprout = el("g", {}, svg);
    const sproutStem = el("path", { class: "g-draw", d: "M0,0 C-7,-30 9,-62 0,-92", stroke: "#6f8459", "stroke-width": 5, pathLength: 1 }, sprout);
    const leafL = el("path", { d: "M0,-86 C-16,-108 -46,-106 -54,-92 C-40,-78 -16,-78 0,-86Z", fill: GREEN[1], stroke: "#5f7349", "stroke-width": 1.5 }, sprout);
    const leafR = el("path", { d: "M0,-92 C14,-116 44,-118 54,-104 C42,-88 18,-86 0,-92Z", fill: GREEN[0], stroke: "#5f7349", "stroke-width": 1.5 }, sprout);

    // Baum: Äste rekursiv erzeugen
    const treeG = el("g", {}, svg);
    const leafG = el("g", {}, svg);
    const branches = [], leaves = [];
    const MAX_D = 5, WIDTH = [32, 18, 11, 7, 4.2, 2.6];
    function branch(x, y, a, len, d) {
        const bend = (rnd() - 0.5) * 0.45;
        const ex = x + Math.sin(a) * len, ey = y - Math.cos(a) * len;
        const mx = x + Math.sin(a + bend) * len * 0.5, my = y - Math.cos(a + bend) * len * 0.5;
        const path = el("path", { class: "g-draw", d: `M${r1(x)},${r1(y)} Q${r1(mx)},${r1(my)} ${r1(ex)},${r1(ey)}`, stroke: WOOD, "stroke-width": WIDTH[d], pathLength: 1 }, treeG);
        branches.push({ el: path, d, last: -1 });
        if (d >= 3) addLeaves(lerp(x, ex, 0.6), lerp(y, ey, 0.6), 2, d);
        if (d === MAX_D) { addLeaves(ex, ey, 7, d); return; }
        const n = d < 2 ? 3 : (rnd() < 0.3 ? 3 : 2);
        const spread = d === 0 ? 0.78 : d === 1 ? 0.6 : 0.5;
        for (let i = 0; i < n; i++) {
            let ca = a + (i - (n - 1) / 2) * (spread + rnd() * 0.18) + (rnd() - 0.5) * 0.22;
            ca = clamp(ca, -1.75, 1.75);
            branch(ex, ey, ca, len * (d === 0 ? 0.86 + rnd() * 0.08 : 0.74 + rnd() * 0.1), d + 1);
        }
    }
    function addLeaves(x, y, n, d) {
        for (let i = 0; i < n; i++) {
            const lx = x + (rnd() - 0.5) * 58, ly = y + (rnd() - 0.5) * 50;
            const e = el("ellipse", { rx: 14, ry: 7, fill: GREEN[Math.floor(rnd() * GREEN.length)], opacity: 0.92 }, leafG);
            leaves.push({ el: e, x: r1(lx), y: r1(ly), rot: Math.round(rnd() * 180), delay: rnd() * 0.55 + (d - 3) * 0.08, last: -1 });
        }
    }
    branch(0, 0, 0, 200, 0);

    // Gießkanne
    const can = el("g", {}, svg);
    el("path", { d: "M-100,-66 L-40,-14", stroke: WOOD, "stroke-width": 9, "stroke-linecap": "round", fill: "none" }, can);
    el("ellipse", { cx: -102, cy: -68, rx: 9, ry: 13, transform: "rotate(-48 -102 -68)", fill: "#d7c2a6", stroke: WOOD, "stroke-width": 3 }, can);
    el("path", { d: "M-16,-48 Q4,-88 24,-48", stroke: WOOD, "stroke-width": 6, fill: "none", "stroke-linecap": "round" }, can);
    el("path", { d: "M38,-38 Q78,-22 42,8", stroke: WOOD, "stroke-width": 6, fill: "none", "stroke-linecap": "round" }, can);
    el("path", { d: "M-38,-48 L38,-48 L44,12 Q44,18 38,18 L-38,18 Q-44,18 -44,12 Z", fill: "#d7c2a6", stroke: WOOD, "stroke-width": 3, "stroke-linejoin": "round" }, can);
    el("path", { d: "M-40,-26 L40,-26", stroke: "#bfa182", "stroke-width": 3 }, can);
    const SPOUT = [-104, -72];
    const drops = [];
    for (let i = 0; i < 7; i++) drops.push(el("path", { d: "M0,-7 C4,-1 5,3 0,6 C-5,3 -4,-1 0,-7Z", fill: "#7fa6c4", opacity: 0 }, svg));

    // Wurzeln: geordnete Form und "Wollknäuel"-Form mit gleicher Punktzahl → stufenlos überblenden
    const NPT = 44, ROOTS = 9, KNOT = [0, 250], KR = 150;
    const roots = [];
    for (let k = 0; k < ROOTS; k++) {
        const side = (k - (ROOTS - 1) / 2) / ((ROOTS - 1) / 2);       // -1 … 1
        const sx = side * 14, ang = side * 1.15 + (rnd() - 0.5) * 0.12;
        const len = 300 + (1 - Math.abs(side)) * 170 + rnd() * 60;
        const wav = 10 + rnd() * 14, wf = 2 + rnd() * 1.5, ph = rnd() * 6;
        const ordered = [], tangled = [];
        const turns = 2.2 + rnd() * 1.6, th0 = rnd() * Math.PI * 2, fr = 1.5 + rnd() * 2, kp = rnd() * 6, dir = rnd() < 0.5 ? -1 : 1;
        for (let i = 0; i < NPT; i++) {
            const t = i / (NPT - 1);
            // geordnet: nach unten außen, leicht gewellt, wird zur Spitze hin steiler
            const a = ang * (1 - 0.35 * t);
            const dist = len * t;
            const nx = Math.cos(a), ny = -Math.sin(a);                 // Normale
            const w = Math.sin(t * Math.PI * wf + ph) * wav * t;
            ordered.push([sx + Math.sin(a) * dist + nx * w, Math.cos(a) * dist * 0.95 + ny * w + 2]);
            // verknotet: Schleifen um den Knotenpunkt
            const th = th0 + dir * t * turns * Math.PI * 2;
            const rr = KR * (0.25 + 0.75 * Math.abs(Math.sin(t * Math.PI * fr + kp)));
            const tp = [KNOT[0] + Math.cos(th) * rr, KNOT[1] + Math.sin(th) * rr * 0.82];
            const ramp = clamp(i / 7);
            tangled.push([lerp(sx, tp[0], ease(ramp)), lerp(2, tp[1], ease(ramp))]);
        }
        const path = el("path", { class: "g-draw", stroke: WOOD_ROOT, "stroke-width": 7 - Math.abs(side) * 2, pathLength: 1 }, rootsG);
        // kleine Seitenwurzeln, erscheinen am Ende
        const subs = [0.38, 0.66].map((tt, j) => {
            const i = Math.round(tt * (NPT - 1)), b = ordered[i], s2 = (j ? -1 : 1) * (side >= 0 ? 1 : -1);
            const a = ang * 0.8 + s2 * 0.7, l = 60 + rnd() * 50;
            const e = [b[0] + Math.sin(a) * l, b[1] + Math.cos(a) * l];
            return el("path", { class: "g-draw", d: `M${r1(b[0])},${r1(b[1])} Q${r1((b[0] + e[0]) / 2 + s2 * 10)},${r1((b[1] + e[1]) / 2)} ${r1(e[0])},${r1(e[1])}`, stroke: WOOD_ROOT, "stroke-width": 3, pathLength: 1 }, rootsG);
        });
        roots.push({ path, ordered, tangled, subs, delay: Math.abs(side) * 0.25 + rnd() * 0.08 });
    }

    /* ---------- Texte, Bewertungen, Angebote ---------- */
    const caps = [...sec.querySelectorAll(".grow-cap")].map((c) => {
        const [a, b] = c.dataset.range.split(" ").map(Number);
        return { el: c, a, b, last: -1 };
    });
    const bubbles = [...sec.querySelectorAll(".grow-bubble")];
    const reviewBox = sec.querySelector(".grow-reviews");
    let reviews = [];
    const POS = [
        { cls: "is-left", css: "left:4%;top:16%", origin: "80% 110%" },
        { cls: "is-right", css: "right:4%;top:22%", origin: "20% 110%" },
        { cls: "is-left", css: "left:6%;top:52%", origin: "80% 110%" },
        { cls: "is-right", css: "right:6%;top:58%", origin: "20% 110%" }
    ];
    const short = (s, n) => { s = s.replace(/\s+/g, " ").trim(); if (s.length <= n) return s; const cut = s.slice(0, n); return cut.slice(0, cut.lastIndexOf(" ") > n * 0.6 ? cut.lastIndexOf(" ") : n) + "…"; };
    // Bewertungen kommen aus dem normalen Bewertungsbereich (Firestore) – keine erfundenen Texte
    function pullReviews() {
        const cards = [...document.querySelectorAll("#comments-grid .review-card")].slice(0, 4);
        if (!cards.length || reviews.length) return;
        reviews = cards.map((c, i) => {
            const pos = POS[i];
            const box = document.createElement("figure");
            box.className = "grow-review " + pos.cls;
            box.style.cssText = pos.css + `;--origin:${pos.origin}`;
            const p = document.createElement("p");
            p.textContent = "“" + short(c.querySelector("p")?.textContent || "", 150) + "”";
            const f = document.createElement("footer");
            const st = document.createElement("span"); st.className = "stars"; st.textContent = c.querySelector(".stars")?.textContent || "";
            const nm = document.createElement("strong"); nm.textContent = c.querySelector("strong")?.textContent || "";
            f.append(nm, st);
            box.append(p, f);
            reviewBox.appendChild(box);
            return { el: box, last: -1 };
        });
        render(true);
    }
    const grid = document.getElementById("comments-grid");
    if (grid) { new MutationObserver(pullReviews).observe(grid, { childList: true }); pullReviews(); }

    const veil = sec.querySelector(".grow-veil"), hint = sec.querySelector(".grow-hint"), skip = sec.querySelector(".grow-skip");
    skip.addEventListener("click", () => document.getElementById("home")?.scrollIntoView({ behavior: "smooth" }));

    /* ---------- Kamera ---------- */
    const CAM = [
        { p: 0.00, cy: -150, h: 500, w: 430 },
        { p: 0.36, cy: -170, h: 540, w: 450 },
        { p: 0.52, cy: -460, h: 1200, w: 1200 },
        { p: 0.62, cy: -460, h: 1200, w: 1200 },
        { p: 0.73, cy: 250, h: 900, w: 1200 },
        { p: 1.00, cy: 250, h: 900, w: 1200 }
    ];
    let SW = 1, SH = 1;
    function camera(p) {
        let i = 0;
        while (i < CAM.length - 2 && p > CAM[i + 1].p) i++;
        const A = CAM[i], B = CAM[i + 1], t = ease(seg(p, A.p, B.p));
        const cy = lerp(A.cy, B.cy, t), h = lerp(A.h, B.h, t), w = lerp(A.w, B.w, t);
        let vh = h, vw = h * SW / SH;
        if (vw < w) { vw = w; vh = vw * SH / SW; }
        svg.setAttribute("viewBox", `${r1(-vw / 2)} ${r1(cy - vh / 2)} ${r1(vw)} ${r1(vh)}`);
    }

    /* ---------- Ein Bild für Fortschritt p zeichnen ---------- */
    function setDraw(o, t) {
        t = Math.round(t * 1000) / 1000;
        if (t === o.last) return;
        o.last = t;
        o.el.style.strokeDashoffset = 1 - t;
        o.el.style.opacity = t > 0 ? 1 : 0;
    }
    function fade(o, a, b, p, edge = 0.01) {
        const v = Math.min(seg(p, a - edge, a + edge), 1 - seg(p, b - edge, b + edge));
        const r = Math.round(v * 100) / 100;
        if (r === o.last) return r;
        o.last = r;
        return r;
    }
    const sproutStemO = { el: sproutStem, last: -1 };
    const wide = () => SW >= 900;

    function render(force) {
        const rect = sec.getBoundingClientRect();
        const headerH = parseFloat(getComputedStyle(stage).top) || 0;
        const total = rect.height - stage.offsetHeight;
        const p = clamp((headerH - rect.top) / total);
        if (!force && p === render.lastP) return;
        render.lastP = p;

        camera(p);

        // 1) Samen fällt (0 – .08), Erdhügel (.07 – .11)
        const fall = easeOut(seg(p, 0.015, 0.08) ** 1.6);
        seedEl.setAttribute("transform", `translate(0 ${r1(lerp(-270, -4, fall))}) rotate(${r1(fall * 160)})`);
        seedEl.style.opacity = 1 - seg(p, 0.085, 0.11);
        const m = back(seg(p, 0.07, 0.11));
        mound.setAttribute("transform", `scale(${r1(m * 10) / 10 || 0.001} ${r1(m * 10) / 10 || 0.001})`);
        mound.style.opacity = 1 - seg(p, 0.44, 0.48);

        // 2) Gießkanne: rein (.11–.15), gießen (.15–.22), warten, nochmal (.33–.41), raus (.41–.45)
        const inT = ease(seg(p, 0.11, 0.15)), outT = ease(seg(p, 0.41, 0.45));
        const tilt = Math.max(ease(seg(p, 0.15, 0.17)) * (1 - ease(seg(p, 0.215, 0.235))), ease(seg(p, 0.33, 0.35)) * (1 - ease(seg(p, 0.395, 0.415))));
        const cx = lerp(420, 128, inT) + outT * 320, cyy = -178 - outT * 60, ang = -36 * tilt;
        can.setAttribute("transform", `translate(${r1(cx)} ${r1(cyy)}) rotate(${r1(ang)})`);
        can.style.opacity = inT * (1 - outT);
        const rad = ang * Math.PI / 180, cs = Math.cos(rad), sn = Math.sin(rad);
        const tipX = cx + SPOUT[0] * cs - SPOUT[1] * sn, tipY = cyy + SPOUT[0] * sn + SPOUT[1] * cs;
        const pouring = tilt > 0.85;
        drops.forEach((d, i) => {
            if (!pouring) { d.setAttribute("opacity", 0); return; }
            const f = (p * 260 + i / drops.length) % 1;
            const y = lerp(tipY + 6, -6, f), x = tipX - 4 - f * 10 + (i % 3 - 1) * 5;
            d.setAttribute("transform", `translate(${r1(x)} ${r1(y)})`);
            d.setAttribute("opacity", r1((1 - f * 0.6) * 0.9));
        });

        // 3) Setzling (.24–.32), wächst beim 2. Gießen (.35–.43), geht in den Stamm über (.43–.47)
        setDraw(sproutStemO, seg(p, 0.235, 0.29));
        const lf = back(seg(p, 0.275, 0.32));
        const grow2 = 1 + ease(seg(p, 0.35, 0.43)) * 0.6;
        leafL.setAttribute("transform", `translate(0 -86) scale(${r1(lf * 100) / 100 || 0.001}) translate(0 86)`);
        leafR.setAttribute("transform", `translate(0 -92) scale(${r1(lf * 100) / 100 || 0.001}) translate(0 92)`);
        sprout.setAttribute("transform", `scale(${r1(grow2 * 100) / 100})`);
        sprout.style.opacity = 1 - seg(p, 0.44, 0.47);

        // 4) Baum: Äste nach Tiefe (.43–.57), Blätter (.50–.60)
        const g = seg(p, 0.43, 0.57);
        for (const b of branches) setDraw(b, ease(clamp((g - b.d * 0.13) / 0.3)));
        const L = seg(p, 0.50, 0.60);
        for (const l of leaves) {
            const s = Math.round(back(clamp((L - l.delay) / 0.38)) * 100) / 100;
            if (s === l.last) continue;
            l.last = s;
            l.el.setAttribute("transform", `translate(${l.x} ${l.y}) rotate(${l.rot}) scale(${s || 0.001})`);
        }

        // 5) Wurzeln: Knäuel zeichnet sich (.58–.68), entwirrt sich (.73–.88), Seitenwurzeln (.86–.92)
        const R = seg(p, 0.58, 0.68), U = seg(p, 0.73, 0.88), S = seg(p, 0.86, 0.92);
        for (const r of roots) {
            const u = ease(clamp((U - r.delay) / 0.7));
            const key = Math.round(u * 400);
            if (force || key !== r.lastU) {
                r.lastU = key;
                r.path.setAttribute("d", smooth(r.ordered.map((o, i) => [lerp(r.tangled[i][0], o[0], u), lerp(r.tangled[i][1], o[1], u)])));
            }
            setDraw(r.rd || (r.rd = { el: r.path, last: -1 }), ease(R));
            r.subs.forEach((s, j) => setDraw(s.o || (s.o = { el: s, last: -1 }), ease(clamp(S * 1.6 - j * 0.4))));
        }

        // Texte
        for (const c of caps) {
            const v = fade(c, c.a, c.b, p);
            c.el.style.opacity = v;
            c.el.style.transform = `translateY(${r1((1 - v) * 10)}px)`;
        }

        // Bewertungen: breit = alle nacheinander erscheinen; schmal = eine nach der anderen
        if (reviews.length) {
            const A = 0.50, B = 0.63, n = reviews.length;
            reviews.forEach((r, i) => {
                let v;
                if (wide()) v = Math.min(seg(p, A + i * 0.022, A + i * 0.022 + 0.02), 1 - seg(p, B, B + 0.015));
                else { const len = (B - A) / n, a = A + i * len; v = Math.min(seg(p, a, a + 0.012), 1 - seg(p, a + len - 0.012, a + len)); }
                r.el.style.opacity = v;
                r.el.style.transform = `scale(${r1((0.85 + 0.15 * back(v)) * 100) / 100})`;
            });
        }

        // Angebote: erscheinen nacheinander, während sich die Wurzeln ordnen
        bubbles.forEach((b, i) => {
            const v = Math.min(seg(p, 0.77 + i * 0.012, 0.79 + i * 0.012), 1 - seg(p, 0.945, 0.965));
            b.style.opacity = v;
            b.style.transform = `translateY(${r1((1 - v) * 14)}px) scale(${r1((0.9 + 0.1 * v) * 100) / 100})`;
            b.style.visibility = v > 0.02 ? "visible" : "hidden";
        });

        // Ende: sanft ausblenden, dann kommt der Hero
        veil.style.opacity = ease(seg(p, 0.95, 1));
        hint.style.opacity = 1 - seg(p, 0, 0.025);
        skip.style.opacity = 1 - seg(p, 0.93, 0.96);
        skip.style.visibility = p > 0.96 ? "hidden" : "visible";
    }

    /* ---------- Ablauf ---------- */
    function measure() { SW = stage.clientWidth || 1; SH = stage.clientHeight || 1; render(true); }
    let ticking = false;
    const onScroll = () => { if (ticking) return; ticking = true; requestAnimationFrame(() => { ticking = false; render(false); }); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    measure();
})();
