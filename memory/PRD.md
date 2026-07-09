# BONORIYA — Full SEO System (Feb 2026)

## Original Problem
Transform the Bonoriya web application into a fully SEO-optimized, search
engine-friendly platform. Implement dynamic SEO for every publicly accessible
page without affecting existing functionality, UI, routing, Supabase
integration, or booking workflows.

## Tech Stack
- **Frontend:** Vite + React 18 + TypeScript, Supabase-js (existing app)
- **Backend:** FastAPI (added SEO endpoints) + existing MongoDB status routes
- **Data:** Supabase (`partner_properties`, `day_trip_properties`,
  `bonoriya_property`) is the source of truth
- **Domain:** https://bonoriya.com

## What's Implemented (2026-02)

### Dynamic per-page SEO (`src/app/utils/seoDynamic.ts`)
- `applyPropertySEO(property, extras)` — unique title / description / canonical /
  OG / Twitter / LodgingBusiness or Hotel Schema.org JSON-LD + AggregateRating,
  Offer, BreadcrumbList — built from real Supabase data.
- `applyDayTripSEO(dt)` — TouristAttraction + Offer + BreadcrumbList + optional
  FAQPage schema from `day_trip_properties`.
- `applyDestinationSEO(input)` — TouristDestination + BreadcrumbList + nearby
  properties ItemList schema.
- `buildPropertyItemList()` — used by /our-properties for ItemList JSON-LD.
- URL parser + push helpers (`parseRoute`, `pushRoute`) for slug URLs:
  `/properties/:slug`, `/destinations/:slug`, `/day-trips/:slug`.
- Image SEO enrichment (`enrichImageAttrs`, `observeImageAttrs`) — automatic
  alt/title/loading/decoding attributes on every `<img>` DOM mutation.

### App.tsx integration
- Parses URL on mount → deep-links to entity pages.
- On URL entity route, fetches property/day-trip from Supabase and applies
  dynamic SEO. Falls back to static page SEO if no match.
- Auto-pushes clean URLs on page state changes (home, book-stays,
  our-properties, day-trip, destinations, prefab, blogs, contact, etc.).

### Sitemap system (`backend/generate_sitemap.py`)
- Reads live Supabase data (properties + day trips) and writes to
  `frontend/public/`:
    * `sitemap.xml` (index)
    * `sitemap-core.xml` — 25 static pages
    * `sitemap-properties.xml` — dynamic per-property URLs
    * `sitemap-destinations.xml` — 8 NE state pages + hub
    * `sitemap-daytrips.xml` — dynamic per-day-trip URLs
    * `sitemap-images.xml` — Google Image sitemap (skips data:/blob: URLs)
    * `robots.txt` — regenerated with all sitemap references + fresh Disallow
      list (admin/partner-dashboard/API/checkout)
- FastAPI endpoints:
    * `POST /api/seo/regenerate-sitemap` — runs the generator and returns
      counts.
    * `GET /api/seo/sitemap-status` — mtime/size for each file.
- Debounced auto-regen (`utils/sitemapTrigger.ts`) fired from property/day-trip
  create/update/delete operations in `utils/auth.ts`.

### Admin dashboard
- `SEODashboard.tsx` gained a "Regenerate Sitemap Now" button + live file
  status grid (size, modified, direct download links).

### robots + OG image
- `frontend/public/og-banner.jpg` — uploaded Bonoriya banner set as fallback
  OG image.
- `frontend/index.html` — cleaned static defaults (index,follow + canonical +
  full OG/Twitter tags for pre-JS crawlers).

## Route matrix
| Route pattern                | Purpose                                  |
| ---------------------------- | ---------------------------------------- |
| `/`, `/book-stays`, …        | Static pages (static SEO)                |
| `/properties/:slug`          | Dynamic property SEO (Supabase lookup)   |
| `/destinations/:state`       | Dynamic destination SEO (8 NE states)    |
| `/day-trips/:slug`           | Dynamic day-trip SEO                     |
| `/admin`, `/partner-login`   | noindex,nofollow                         |

## Verified (screenshots)
- `/` → title / canonical / 4 JSON-LD scripts ✓
- `/properties/kamakhya-homestay-by-bonoriya-773771` → unique title, real
  description, LodgingBusiness + BreadcrumbList JSON-LD ✓
- `/destinations/meghalaya` → TouristDestination + BreadcrumbList ✓
- `/day-trips/bonoriya-agro-eco-tourism-02ad7b` → TouristAttraction +
  BreadcrumbList ✓
- `/our-properties` → Organization + Hotel + ItemList schemas + all 8 images
  with alt attribute ✓
- Backend endpoints via external URL working ✓

## Backlog / Next Actions
- P1: Populate Supabase `partner_properties` with more fields (city, state,
  district, lat, lng, roomTypes) so LodgingBusiness schema is even richer.
- P1: Wire Google Search Console verification meta.
- P1: Add per-blog-post schema on `/blogs/:slug` (BlogPosting helper already
  exists in `utils/seo.ts`).
- P2: Netlify/Vercel deploy — configure prerender or SSR for perfect crawler
  coverage.
- P2: Add hreflang tags for future language variants.
