/* =========================================================
   Intro "Wachstum" (Startseite)
   Das Video liegt als 100 Einzelbilder in intro/ (f001.webp …).
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
    const FRAMES = 100;                                   // Anzahl Bilder in intro/
    const SRC = (i) => `intro/f${String(i + 1).padStart(3, "0")}.webp`;
    const VIDEO_END = 0.9;                                // bis hierhin läuft das Video, danach steht das letzte Bild
    const REVIEWS_FROM = 0.60, REVIEWS_TO = 0.93;         // wann die Bewertungen sichtbar sind

    const stage = sec.querySelector(".grow-stage");
    const fg = sec.querySelector(".grow-fg"), bg = sec.querySelector(".grow-bg");
    const fctx = fg.getContext("2d"), bctx = bg.getContext("2d");

    const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
    const seg = (p, a, b) => clamp((p - a) / (b - a));
    const ease = (t) => t * t * (3 - 2 * t);
    const back = (t) => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
    const r2 = (n) => Math.round(n * 100) / 100;

    /* ---------- Bilder laden: erst das erste, dann der Reihe nach ---------- */
    const imgs = new Array(FRAMES);
    const ready = new Array(FRAMES).fill(false);
    function load(i) {
        return new Promise((res) => {
            const im = new Image();
            im.decoding = "async";
            im.onload = () => { imgs[i] = im; ready[i] = true; res(); if (Math.abs(i - curFrame) < 3) draw(true); };
            im.onerror = res;
            im.src = SRC(i);
        });
    }
    (async () => {
        await load(0);
        // in Paketen laden, damit es schnell vorangeht, ohne alles auf einmal anzufragen
        for (let i = 1; i < FRAMES; i += 6) await Promise.all([0, 1, 2, 3, 4, 5].map((k) => i + k < FRAMES ? load(i + k) : null));
    })();
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
        bg.width = 48; bg.height = Math.round(48 * SH / SW) || 48;
        drawn = -1;
        render(true);
    }
    function draw(force) {
        const k = nearest(curFrame);
        if (k < 0 || (!force && k === drawn)) return;
        drawn = k;
        const im = imgs[k], iw = im.naturalWidth, ih = im.naturalHeight;
        const W = fg.width, H = fg.height;
        // Hochformat-Bildschirm: Bild füllt alles (leicht beschnitten). Breiter Bildschirm: ganze Höhe, Seiten weich ausblenden.
        const cover = SW / SH <= iw / ih * 1.25;
        const s = cover ? Math.max(W / iw, H / ih) : H / ih;
        const dw = iw * s, dh = ih * s, dx = (W - dw) / 2, dy = (H - dh) / 2;
        fctx.globalCompositeOperation = "source-over";
        fctx.clearRect(0, 0, W, H);
        fctx.drawImage(im, dx, dy, dw, dh);
        if (!cover) {
            const f = Math.min(120 * DPR, dw * 0.18);
            fctx.globalCompositeOperation = "destination-out";
            let g = fctx.createLinearGradient(dx, 0, dx + f, 0);
            g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
            fctx.fillStyle = g; fctx.fillRect(dx - 2, 0, f + 2, H);
            g = fctx.createLinearGradient(dx + dw, 0, dx + dw - f, 0);
            g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(1, "rgba(0,0,0,0)");
            fctx.fillStyle = g; fctx.fillRect(dx + dw - f, 0, f + 2, H);
            fctx.globalCompositeOperation = "source-over";
        }
        // unscharfer Hintergrund (nur sichtbar, wo das Bild nicht hinreicht)
        const bs = Math.max(bg.width / iw, bg.height / ih);
        bctx.drawImage(im, (bg.width - iw * bs) / 2, (bg.height - ih * bs) / 2, iw * bs, ih * bs);
    }

    /* ---------- Texte & Bewertungen ---------- */
    const caps = [...sec.querySelectorAll(".grow-cap")].map((c) => {
        const [a, b] = c.dataset.range.split(" ").map(Number);
        return { el: c, a, b };
    });
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
