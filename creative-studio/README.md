# TA Creative Studio — Agency Showcase

Our own rebuild of the Creative Studio agency showcase — previously a Canva-published site at
`partner.tennis.com.au/ta-creative-studio-agency-showcase`. This version is plain HTML/CSS/JS,
fully self-contained, and lives in this repo so **we own it and control every pixel**.

**Owners:** Brie & xmuhlebach

## Run it

```bash
python3 -m http.server 8772 --directory .
```

Then open http://localhost:8772 — or use the `creative-studio` launch config.

## Structure

- `index.html` — the whole site (single scrolling page, chapters 01–08)
- `css/style.css` — all styling; design tokens at the top (`:root`)
- `js/main.js` — scroll reveals, count-up stats, case-study filters, chapter nav
- `assets/media/`, `assets/video/` — pulled from the original published site (TA's own campaign media)
- `assets/fonts/` — self-hosted Anton (display) + Archivo variable (body)
- `vendor/` — GSAP + ScrollTrigger, vendored locally (no CDNs anywhere)

## Notes

- The original Canva fonts are licensed to Canva, so type is set in Anton/Archivo — free,
  self-hosted equivalents of the original condensed-display look.
- Everything works offline; there are no external requests.
- `prefers-reduced-motion` is respected — animations disable cleanly.
