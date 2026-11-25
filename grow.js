/* =========================================================
   Intro "Wachstum" (Startseite)
   Das Video liegt als Einzelbilder vor: intro/ (Hochformat, Handy)
   und intro-wide/ (Querformat, Computer).
   Beim Scrollen wird das passende Bild auf ein <canvas> gemalt –
   so läuft es vorwärts und rückwärts, auch auf dem iPhone flüssig.
   Dazu: Texte zu den Stationen und Bewertungen in Sprechblasen.
   ========================================================= */
(function () {
    "use strict";
    const sec = document.getElementById("grow");
    if (!sec) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { sec.classList.add("is-off"); return; }

    /* ---------- Einstellungen ---------- */
    // Je Video: Ordner, Bildanzahl, Seitenverhältnis, Zeitpunkte der Texte (data-range / data-range-wide) und Bewertungen
    const SETS = {
        tall: { dir: "intro", frames: 100, ratio: 9 / 16, capAttr: "range", reviews: [0.60, 0.93] },
        wide: { dir: "intro-wide", frames: 120, ratio: 16 / 9, capAttr: "rangeWide", reviews: [0.48, 0.93] }
    };
    const VIDEO_END = 0.9;                                // bis hierhin läuft das Video, danach steht das letzte Bild
    let SET = null, FRAMES = 0, REVIEWS_FROM = 0, REVIEWS_TO = 0;

    const stage = sec.querySelector(".grow-stage");
    const fg = sec.querySelector(".grow-fg");
    const fctx = fg.getContext("2d");

    const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
    const seg = (p, a, b) => clamp((p - a) / (b - a));
    const ease = (t) => t * t * (3 - 2 * t);
    const back = (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
    const r2 = (n) => Math.round(n * 100) / 100;

    /* ---------- Bilder laden: erst das erste, dann der Reihe nach ---------- */
    let imgs = [], ready = [], loadId = 0;
    function load(i, id, tries = 0) {
        return new Promise((res) => {
            const im = new Image();
            im.onload = () => {
                if (id !== loadId) return res();
                imgs[i] = im; ready[i] = true; res();
                if (i === curFrame || drawn < 0 || Math.abs(i - curFrame) < Math.abs(drawn - curFrame)) draw(true);
            };
            // bei Netzwerkfehler bis zu 2x neu versuchen
            im.onerror = () => { if (tries < 2 && id === loadId) setTimeout(() => load(i, id, tries + 1).then(res), 800); else res(); };
            im.src = `${SET.dir}/f${String(i + 1).padStart(3, "0")}.webp`;
        });
    }
    function useSet(key) {
        if (SET === SETS[key]) return;
        SET = SETS[key]; FRAMES = SET.frames; [REVIEWS_FROM, REVIEWS_TO] = SET.reviews;
        imgs = new Array(FRAMES); ready = new Array(FRAMES).fill(false);
        const id = ++loadId;
        caps.forEach((c) => { [c.a, c.b] = (c.el.dataset[SET.capAttr] || c.el.dataset.range).split(" ").map(Number); });
        (async () => {
            await load(0, id);
            // in Paketen laden, damit es schnell vorangeht, ohne alles auf einmal anzufragen
            // erst jedes 4. Bild (grober Ablauf sofort möglich), dann die Lücken füllen
            const order = [];
            for (let i = 4; i < FRAMES; i += 4) order.push(i);
            for (let i = 1; i < FRAMES; i++) if (i % 4) order.push(i);
            for (let j = 0; j < order.length && id === loadId; j += 8) await Promise.all(order.slice(j, j + 8).map((i) => load(i, id)));
        })();
    }
    function nearest(i) {
        for (let d = 0; d < FRAMES; d++) {
            if (i - d >= 0 && ready[i - d]) return i - d;
            if (i + d < FRAMES && ready[i + d]) return i + d;
        }
        return -1;
    }

    /* ---------- Zeichnen ---------- */
    let SW = 1, SH = 1, DPR = 1, curFrame = 0, drawn = -1;
    function measure() {
        SW = stage.clientWidth || 1; SH = stage.clientHeight || 1;
        DPR = Math.min(window.devicePixelRatio || 1, 2);
        fg.width = Math.round(SW * DPR); fg.height = Math.round(SH * DPR);
        useSet(SW / SH >= 1.15 ? "wide" : "tall");
        drawn = -1;
        render(true);
    }
    function draw(force) {
        const k = nearest(curFrame);
        if (k < 0 || (!force && k === drawn)) return;
        drawn = k;
        const im = imgs[k], iw = im.naturalWidth, ih = im.naturalHeight;
        const W = fg.width, H = fg.height;
        // Bild füllt immer die ganze Fläche (an den Rändern minimal beschnitten), unten ausgerichtet wegen der Wurzeln
        const s = Math.max(W / iw, H / ih);
        const dw = iw * s, dh = ih * s, dx = (W - dw) / 2, dy = (H - dh) * 0.6;
        fctx.clearRect(0, 0, W, H);
        fctx.drawImage(im, dx, dy, dw, dh);
    }

    /* ---------- Texte & Bewertungen ---------- */
    const caps = [...sec.querySelectorAll(".grow-cap")].map((c) => ({ el: c, a: 0, b: 0 }));
    const reviewBox = sec.querySelector(".grow-reviews");
    let reviews = [];
    const POS = [
        { cls: "is-left", css: "left:5%;top:18%", origin: "80% 110%" },
        { cls: "is-right", css: "right:5%;top:24%", origin: "20% 110%" },
        { cls: "is-left", css: "left:7%;top:54%", origin: "80% 110%" },
        { cls: "is-right", css: "right:7%;top:60%", origin: "20% 110%" }
    ];
    const short = (s, n) => { s = s.replace(/\s+/g, " ").trim(); if (s.length <= n) return s; const cut = s.slice(0, n), sp = cut.lastIndexOf(" "); return cut.slice(0, sp > n * 0.6 ? sp : n) + "…"; };
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
            const nm = document.createElement("strong"); nm.textContent = c.querySelector("strong")?.textContent || "";
            const st = document.createElement("span"); st.className = "stars"; st.textContent = c.querySelector(".stars")?.textContent || "";
            f.append(nm, st);
            box.append(p, f);
            reviewBox.appendChild(box);
            return box;
        });
        render(true);
    }
    const grid = document.getElementById("comments-grid");
    if (grid) { new MutationObserver(pullReviews).observe(grid, { childList: true }); pullReviews(); }

    const veil = sec.querySelector(".grow-veil"), hint = sec.querySelector(".grow-hint"), skip = sec.querySelector(".grow-skip");
    skip.addEventListener("click", () => document.getElementById("home")?.scrollIntoView({ behavior: "smooth" }));

    /* ---------- Ein Bild für Fortschritt p ---------- */
    let lastP = -1;
    function render(force) {
        const rect = sec.getBoundingClientRect();
        const headerH = parseFloat(getComputedStyle(stage).top) || 0;
        const p = clamp((headerH - rect.top) / (rect.height - stage.offsetHeight));
        if (!force && p === lastP) return;
        lastP = p;

        curFrame = Math.round(clamp(p / VIDEO_END) * (FRAMES - 1));
        draw(force);

        for (const c of caps) {
            const v = Math.min(seg(p, c.a - 0.01, c.a + 0.01), 1 - seg(p, c.b - 0.01, c.b + 0.01));
            c.el.style.opacity = r2(v);
            c.el.style.transform = `translateY(${r2((1 - v) * 10)}px)`;
        }

        // Bewertungen: breit = nacheinander dazu; schmal = eine nach der anderen
        if (reviews.length) {
            const n = reviews.length, wide = SW >= 900;
            reviews.forEach((el, i) => {
                let v;
                if (wide) v = Math.min(seg(p, REVIEWS_FROM + i * 0.03, REVIEWS_FROM + i * 0.03 + 0.02), 1 - seg(p, REVIEWS_TO, REVIEWS_TO + 0.015));
                else { const len = (REVIEWS_TO - REVIEWS_FROM) / n, a = REVIEWS_FROM + i * len; v = Math.min(seg(p, a, a + 0.015), 1 - seg(p, a + len - 0.015, a + len)); }
                el.style.opacity = r2(v);
                el.style.transform = `scale(${r2(0.85 + 0.15 * back(v))})`;
            });
        }

        veil.style.opacity = r2(ease(seg(p, 0.95, 1)));
        hint.style.opacity = r2(1 - seg(p, 0, 0.025));
        skip.style.opacity = r2(1 - seg(p, 0.93, 0.96));
        skip.style.visibility = p > 0.96 ? "hidden" : "visible";
    }

    let ticking = false;
    window.addEventListener("scroll", () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => { ticking = false; render(false); });
    }, { passive: true });
    window.addEventListener("resize", measure);
    measure();
})();
