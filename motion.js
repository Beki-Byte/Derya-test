/* =========================================================
   Bewegungs-Ebene für alle Seiten (siehe CONCEPT.md)
   Arbeitet nur mit dem vorhandenen HTML – Funktionen in script.js
   bleiben unberührt. Ohne GSAP oder bei „Bewegung reduzieren“
   bleibt alles einfach sichtbar.
   ========================================================= */
(function () {
    "use strict";
    const html = document.documentElement;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = window.matchMedia("(pointer: coarse)").matches || !window.matchMedia("(hover: hover)").matches;
    const tier = reduced ? "low" : (coarse || (navigator.hardwareConcurrency || 4) <= 2 ? "mid" : "high");
    html.dataset.tier = tier;

    const page = (location.pathname.split("/").pop() || "index.html").replace(".html", "") || "index";
    // Seiten mit Kalender, Dialogen oder Chat: natives Scrollen behalten
    const APP_PAGES = ["kalender", "portal", "odeme", "asistent"];
    const isApp = APP_PAGES.includes(page);
    const veil = document.querySelector(".page-veil");
    const hasGsap = !!(window.gsap && window.ScrollTrigger);
    const EASE = "power3.out";

    /* ---------- Ladebild öffnen ---------- */
    function openVeil() {
        if (!veil) return;
        const first = !sessionStorage.getItem("veilSeen");
        try { sessionStorage.setItem("veilSeen", "1"); } catch (e) {}
        const count = veil.querySelector(".veil-count");
        const done = () => requestAnimationFrame(() => { veil.classList.add("is-open"); html.classList.add("is-ready"); });
        if (!first || reduced || !count) { done(); return; }
        // Erster Besuch: kurzer Zähler bis 100 % (max. ~1,6 s, wartet nicht auf alle Bilder)
        const t0 = performance.now(), dur = 1100;
        (function tick(t) {
            const k = Math.min(1, (t - t0) / dur);
            count.textContent = String(Math.round(k * 100)).padStart(3, "0");
            if (k < 1) requestAnimationFrame(tick); else setTimeout(done, 120);
        })(t0);
    }

    /* ---------- Seitenübergang beim Verlassen ---------- */
    function initTransitions() {
        if (!veil || reduced) return;
        document.addEventListener("click", (e) => {
            if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
            const a = e.target.closest("a[href]");
            if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
            const url = new URL(a.href, location.href);
            if (url.origin !== location.origin) return;
            if (!/\.html$|\/$/.test(url.pathname)) return;
            if (url.pathname === location.pathname && url.hash) return;   // Anker auf derselben Seite
            e.preventDefault();
            veil.classList.remove("is-open");
            veil.classList.add("is-enter-start");
            void veil.offsetWidth;
            veil.classList.remove("is-enter-start");
            veil.classList.add("is-leaving");
            setTimeout(() => { location.href = a.href; }, 520);
        });
        // Zurück-Taste (Seite aus dem Speicher): Vorhang wieder öffnen
        window.addEventListener("pageshow", (e) => { if (e.persisted) { veil.classList.remove("is-leaving"); veil.classList.add("is-open"); } });
    }

    if (!hasGsap) { openVeil(); initTransitions(); return; }
    const { gsap, ScrollTrigger } = window;
    gsap.registerPlugin(ScrollTrigger);

    /* ---------- Weiches Scrollen (Computer, Inhaltsseiten) ---------- */
    let lenis = null;
    if (tier === "high" && !isApp && window.Lenis) {
        lenis = new window.Lenis({ lerp: 0.1, anchors: { offset: -((parseFloat(getComputedStyle(html).getPropertyValue("--header-h")) || 76) + 12) } });
        window.__lenis = lenis;
        lenis.on("scroll", ScrollTrigger.update);
        gsap.ticker.add((t) => lenis.raf(t * 1000));
        gsap.ticker.lagSmoothing(0);
        // Bereiche mit eigenem Scrollen nicht abfangen
        document.querySelectorAll(".chat-panel, .chat-body, .main-nav, .dialog, .fc").forEach((el) => el.setAttribute("data-lenis-prevent", ""));
        new MutationObserver(() => document.querySelectorAll(".dialog, .chat-body").forEach((el) => el.setAttribute("data-lenis-prevent", ""))).observe(document.body, { childList: true });
        // „Nach oben“ über Lenis statt nativ (sonst ruckeln beide gegeneinander)
        document.addEventListener("click", (e) => {
            if (e.target.closest("#toTop")) { e.stopPropagation(); lenis.scrollTo(0); }
        }, true);
        // Menü offen → Seite nicht scrollen
        const nav = document.getElementById("mainNav");
        if (nav) new MutationObserver(() => nav.classList.contains("open") ? lenis.stop() : lenis.start()).observe(nav, { attributes: true, attributeFilter: ["class"] });
    }

    if (reduced) { openVeil(); return; }

    /* ---------- Überschriften Wort für Wort ---------- */
    function splitWords(el) {
        if (el.dataset.split) return [];
        el.dataset.split = "1";
        const words = [];
        const walk = (node) => {
            [...node.childNodes].forEach((n) => {
                if (n.nodeType === 3) {
                    const parts = n.textContent.split(/(\s+)/);
                    const frag = document.createDocumentFragment();
                    parts.forEach((p) => {
                        if (!p) return;
                        if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(" ")); return; }
                        const line = document.createElement("span"); line.className = "split-line";
                        const w = document.createElement("span"); w.className = "split-word"; w.textContent = p;
                        line.appendChild(w); frag.appendChild(line); words.push(w);
                    });
                    n.replaceWith(frag);
                } else if (n.nodeType === 1 && !n.classList.contains("hero-sub")) walk(n);
            });
        };
        walk(el);
        return words;
    }
    const heads = document.querySelectorAll(".section-head h2, .page-hero h1, .about-text h2, .cta-banner h2, .hero h1, .dash-head h1, .login-card h1");
    heads.forEach((h) => {
        const words = splitWords(h);
        if (!words.length) return;
        gsap.set(words, { yPercent: 115, rotate: 3 });
        const inHero = h.closest(".hero, .page-hero");
        gsap.to(words, {
            yPercent: 0, rotate: 0, duration: 1.15, ease: EASE, stagger: 0.045, delay: inHero ? 0.35 : 0,
            scrollTrigger: inHero && !h.closest("#home") ? undefined : { trigger: h, start: "top 88%", once: true }
        });
    });
    // Unterzeile im Hero sanft hinterher
    document.querySelectorAll(".hero .hero-sub, .page-hero p").forEach((el) => gsap.from(el, { opacity: 0, y: 24, duration: 1.2, ease: EASE, delay: 0.7, scrollTrigger: el.closest("#home") ? { trigger: el, start: "top 90%", once: true } : undefined }));

    /* ---------- Zitat färbt sich beim Lesen Wort für Wort ein ---------- */
    document.querySelectorAll(".about-quote").forEach((q) => {
        const words = q.textContent.trim().split(/\s+/);
        q.textContent = "";
        const spans = words.map((w, i) => { const s = document.createElement("span"); s.className = "w"; s.textContent = w + (i < words.length - 1 ? " " : ""); q.appendChild(s); return s; });
        ScrollTrigger.create({
            trigger: q, start: "top 80%", end: "bottom 45%", scrub: true,
            onUpdate: (st) => { const n = Math.round(st.progress * spans.length); spans.forEach((s, i) => s.classList.toggle("on", i < n)); }
        });
    });

    /* ---------- Porträt öffnet sich wie ein Vorhang ---------- */
    document.querySelectorAll(".portrait img").forEach((img) => {
        gsap.fromTo(img, { "--clip": "100%" }, { "--clip": "0%", ease: "none", scrollTrigger: { trigger: img, start: "top 95%", end: "top 35%", scrub: 1 } });
        gsap.fromTo(img, { scale: 1.15 }, { scale: 1, ease: "none", scrollTrigger: { trigger: img, start: "top bottom", end: "bottom top", scrub: true } });
    });

    /* ---------- Leistungen: gepinnte horizontale Scroll-Geschichte (Computer) ---------- */
    const grid = document.querySelector("#services .services-grid");
    if (grid && tier === "high" && window.innerWidth >= 1024) {
        const pin = document.createElement("div");
        pin.className = "services-pin";
        grid.parentNode.insertBefore(pin, grid);
        pin.appendChild(grid);
        grid.classList.add("is-track");
        const bar = document.createElement("div"); bar.className = "services-progress"; bar.innerHTML = "<span></span>";
        pin.appendChild(bar);
        // Raster aus dem schmalen Container lösen: volle Breite
        const section = pin.closest(".section");
        section.appendChild(pin);
        const dist = () => Math.max(0, grid.scrollWidth - window.innerWidth);
        gsap.to(grid, {
            x: () => -dist(), ease: "none",
            scrollTrigger: {
                trigger: pin, start: () => { const hh = parseFloat(getComputedStyle(html).getPropertyValue("--header-h")) || 76; return `center ${Math.round((window.innerHeight + hh) / 2)}px`; },
                end: () => "+=" + dist(), pin: true, scrub: 1, invalidateOnRefresh: true,
                onUpdate: (st) => bar.style.setProperty("--p", st.progress.toFixed(3))
            }
        });
        // Karten gleiten nacheinander herein (eigene CSS-Einblendung dafür abschalten)
        [...grid.children].forEach((c) => c.classList.remove("reveal"));
        gsap.fromTo(grid.children, { opacity: 0, y: 60 }, { opacity: 1, y: 0, duration: 1.1, ease: EASE, stagger: 0.06, scrollTrigger: { trigger: pin, start: "top 85%", once: true } });
    }

    /* ---------- Preise & Schritte: leichtes Gleiten in der Tiefe ---------- */
    document.querySelectorAll(".price-card, .step").forEach((el, i) => {
        gsap.fromTo(el, { y: 40 + (i % 2) * 30 }, { y: 0, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "top 55%", scrub: 1 } });
    });

    /* ---------- Hero: Lichtkugeln folgen der Maus ---------- */
    const hero = document.querySelector(".hero");
    if (hero && tier === "high") {
        hero.addEventListener("pointermove", (e) => {
            const r = hero.getBoundingClientRect();
            hero.style.setProperty("--mx", ((e.clientX - r.left) / r.width - 0.5).toFixed(3));
            hero.style.setProperty("--my", ((e.clientY - r.top) / r.height - 0.5).toFixed(3));
        });
    }

    /* ---------- Wurzel-Linie am Rand (Computer) ---------- */
    if (tier === "high" && !isApp) {
        const NS = "http://www.w3.org/2000/svg";
        const svg = document.createElementNS(NS, "svg");
        svg.setAttribute("class", "root-line"); svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("viewBox", "0 0 30 1000"); svg.setAttribute("preserveAspectRatio", "none");
        const d = ["M15,0 C9,120 22,220 14,340 C7,460 23,560 15,680 C9,790 20,880 15,1000",
            "M14,300 C20,330 26,350 29,380", "M15,520 C9,550 3,575 1,610", "M15,760 C22,790 26,820 28,860", "M15,900 C9,930 5,960 3,1000"];
        const paths = d.map((p) => { const el = document.createElementNS(NS, "path"); el.setAttribute("d", p); el.setAttribute("vector-effect", "non-scaling-stroke"); el.setAttribute("pathLength", "1"); el.style.strokeDasharray = "1"; el.style.strokeDashoffset = "1"; svg.appendChild(el); return el; });
        document.body.appendChild(svg);
        const starts = [0, 0.3, 0.52, 0.76, 0.9];
        ScrollTrigger.create({
            start: 0, end: "max",
            onUpdate: (st) => paths.forEach((p, i) => { const s = starts[i], k = i === 0 ? st.progress : Math.min(1, Math.max(0, (st.progress - s) / 0.08)); p.style.strokeDashoffset = (1 - k).toFixed(3); })
        });
    }

    /* ---------- Eigener Mauszeiger & Magnet-Buttons (Computer) ---------- */
    if (tier === "high") {
        const dot = document.createElement("div"); dot.className = "cursor-dot is-hidden";
        const ring = document.createElement("div"); ring.className = "cursor-ring is-hidden";
        document.body.append(dot, ring);
        html.classList.add("has-cursor");
        const dx = gsap.quickTo(dot, "x", { duration: 0.12, ease: "power2.out" }), dy = gsap.quickTo(dot, "y", { duration: 0.12, ease: "power2.out" });
        const rx = gsap.quickTo(ring, "x", { duration: 0.5, ease: EASE }), ry = gsap.quickTo(ring, "y", { duration: 0.5, ease: EASE });
        const LINK = "a, button, summary, label, [role='button'], .service-card, .story-card";
        const FIELD = "input, textarea, select, iframe, .fc";
        window.addEventListener("pointermove", (e) => {
            if (e.pointerType !== "mouse") return;
            dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
            const t = e.target;
            const onField = !!t.closest?.(FIELD);
            dot.classList.toggle("is-hidden", onField); ring.classList.toggle("is-hidden", onField);
            ring.classList.toggle("is-link", !onField && !!t.closest?.(LINK));
        });
        document.addEventListener("pointerleave", () => { dot.classList.add("is-hidden"); ring.classList.add("is-hidden"); });

        document.querySelectorAll(".btn, .hbtn, .chat-fab, .footer-social a, .nav-toggle").forEach((el) => {
            const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "elastic.out(1, 0.4)" }), yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "elastic.out(1, 0.4)" });
            el.addEventListener("pointermove", (e) => {
                const r = el.getBoundingClientRect();
                xTo((e.clientX - r.left - r.width / 2) * 0.25); yTo((e.clientY - r.top - r.height / 2) * 0.35);
            });
            el.addEventListener("pointerleave", () => { xTo(0); yTo(0); });
        });
    }

    /* ---------- Positionen neu berechnen, wenn Inhalte nachladen ---------- */
    let rt = 0;
    const refresh = () => { clearTimeout(rt); rt = setTimeout(() => ScrollTrigger.refresh(), 200); };
    window.addEventListener("load", refresh);
    document.fonts?.ready.then(refresh);
    if ("ResizeObserver" in window) {
        let lastH = 0;
        new ResizeObserver(() => { const h = document.body.scrollHeight; if (Math.abs(h - lastH) > 40) { lastH = h; refresh(); } }).observe(document.body);
    }

    openVeil();
    initTransitions();
})();
