# Changelog

## [Build 20] — 2026-04-18
- Add Bucko project card to devs page (links to getbucko.com)
- Add Bucko app icon from bucko-site project
- Bucko status badge: iOS &amp; Android

## [Build 19] — 2026-04-12
- Add Sorted Money project card to devs page (links to money.sortedapp.io)
- Add Sorted Money app icon from website project

## [Build 18] — 2026-04-10
- Replace all emoji icons with inline SVG line-drawing icons on garden.html and devs.html
- Garden: seedling, tree, grid icons for Seasonal Blooms, Heritage Trees, Garden Rooms
- Devs: phone, globe, gear icons for Mobile Apps, Web Apps, Side Projects
- SVGs use currentColor stroke so they inherit each page's theme colours

## [Build 17] — 2026-04-08
- Location band background changed from dark green to dark cream (#f5f0e8)
- Text colours adjusted for light background (green coords, muted divider, mid-tone text)

## [Build 16] — 2026-04-08
- Add garden steps photo to garden.html, replacing placeholder
- Image resized to 1600px wide and compressed (11MB → 1.2MB)
- Essence label updated to "Est. 2017"
- Garden split card background changed to #3D6B1E

## [Build 15] — 2026-04-08
- Garden split card background changed to #3D6B1E with white/gold text for contrast
- Essence label updated to "Est. 2017"
- Remove fountain particle/string effects — cleaner hero

## [Build 14] — 2026-04-08
- Fountain string effects (removed in Build 15)

## [Build 13] — 2026-04-08
- Rebuilt fountain effect as flowing strings: thin luminous threads that cascade from the fountain
- Strands drift toward the cursor — each strand has its own cursor affinity for organic feel
- Smooth quadratic curves between points with tapered width and fading opacity along length
- Slow, elegant fall speed with gentle sway and gravity acceleration
- Opening sequence: 4 strands spawn staggered after hero entrance animation
- Max 14 concurrent strands, spawn gradually on scroll
- Fix footer: stack fountain icon above brand text so "Thorley Park" is truly centred

## [Build 12] — 2026-04-08
- Particle spray effect (replaced in Build 13 with flowing strings)

## [Build 11] — 2026-04-08
- Initial fountain particle system (replaced in Build 12)

## [Build 10] — 2026-04-08
- Luxury homepage redesign: cinematic full-bleed hero with gold accents, film grain texture, and entrance animations
- New "Essence" section with large serif statement, gold divider, and estate philosophy copy
- Split cards upgraded with gold labels, animated accent lines, and more generous spacing
- New location band with geographic coordinates and italic Cormorant Garamond copy
- Luxe footer with fountain logo, brand wordmark, and gold divider
- Gold colour palette added to CSS design system (--gold, --gold-light, --gold-soft, --gold-line)
- Staggered scroll-reveal animations with IntersectionObserver for all homepage sections
- Hero entrance animation sequence: logo fade, title reveal, gold line expand, subtitle fade
- Responsive refinements for mobile (stacked split cards, scaled typography, smaller fountain logo)

## [Build 9] — 2026-04-08
- Unify contact email to hello@thorleypark.com across all pages

## [Build 8] — 2026-04-07
- Feature the Sorted app (sortedapp.io) on the devs Projects section with app icon
- Move Projects section above Capabilities for better page flow
- Add clickable project card component with hover states and external link styling
- Keep "Coming Soon" placeholder for future projects
