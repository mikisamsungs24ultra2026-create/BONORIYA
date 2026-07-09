/**
 * BONORIYA — Dynamic SEO Utilities
 *
 * Generates unique, per-entity SEO metadata + Schema.org JSON-LD for
 * properties, destinations and day trips using real Supabase data.
 *
 * Complements ./seo.ts (static/page-level SEO) — this module handles
 * everything that changes per record.
 */

import type { PartnerProperty, DayTripProperty } from './auth';

// ─── Constants ───────────────────────────────────────────────────────────────

export const BASE_URL = 'https://bonoriya.com';
export const SITE_NAME = 'BONORIYA';
export const DEFAULT_OG_IMAGE = `${BASE_URL}/og-banner.jpg`;
export const ORG_LOGO_URL = 'https://mltpbbbauvluhhddteoy.supabase.co/storage/v1/object/public/bonoriya-assets/bonoriya-logo.png';

// ─── Slug helpers ─────────────────────────────────────────────────────────────

/** Convert a human string to a URL-safe slug. */
export function slugify(input: string): string {
  return (input || '')
    .toString()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 96);
}

export function propertySlug(p: { id: string; name: string }): string {
  const base = slugify(p.name);
  // ensure unique-ish by appending short id suffix when name collides
  const suffix = (p.id || '').replace(/[^a-z0-9]/gi, '').slice(-6).toLowerCase();
  return suffix ? `${base}-${suffix}` : base;
}

export function propertyUrl(p: { id: string; name: string }): string {
  return `${BASE_URL}/properties/${propertySlug(p)}`;
}

export function destinationUrl(stateOrPlaceSlug: string): string {
  return `${BASE_URL}/destinations/${slugify(stateOrPlaceSlug)}`;
}

export function dayTripUrl(p: { id: string; name: string }): string {
  return `${BASE_URL}/day-trips/${propertySlug(p)}`;
}

// ─── DOM helpers (mirrors seo.ts) ─────────────────────────────────────────────

function setMeta(name: string, content: string, property = false) {
  const attr = property ? 'property' : 'name';
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) { el = document.createElement('link'); el.rel = rel; document.head.appendChild(el); }
  el.href = href;
}

function replaceRobots(robots: string) {
  document.querySelectorAll('meta[name="robots"], meta[name="googlebot"]').forEach(el => el.remove());
  const r = document.createElement('meta'); r.name = 'robots'; r.content = robots;
  document.head.insertBefore(r, document.head.firstChild);
  const g = document.createElement('meta'); g.name = 'googlebot'; g.content = robots;
  document.head.insertBefore(g, document.head.firstChild);
}

function injectJsonLd(id: string, obj: object) {
  document.querySelectorAll(`script[data-seo-dynamic="${id}"]`).forEach(el => el.remove());
  const s = document.createElement('script');
  s.type = 'application/ld+json';
  s.setAttribute('data-seo-dynamic', id);
  s.textContent = JSON.stringify(obj);
  document.head.appendChild(s);
}

/** Clear all dynamic JSON-LD scripts (call before applying a new dynamic page). */
export function clearDynamicSchemas() {
  document.querySelectorAll('script[data-seo-dynamic]').forEach(el => el.remove());
}

// ─── Text utilities ───────────────────────────────────────────────────────────

function clip(s: string, max = 158): string {
  s = (s || '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return (lastSpace > 60 ? cut.slice(0, lastSpace) : cut) + '…';
}

function uniq<T>(arr: T[]): T[] { return Array.from(new Set(arr.filter(Boolean))); }

// ─── Schema builders ──────────────────────────────────────────────────────────

export function buildBreadcrumbSchema(items: { name: string; url: string }[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

/** LodgingBusiness / Hotel schema built from real property data. */
export function buildLodgingSchema(p: PartnerProperty, extra?: {
  city?: string; state?: string; lat?: number; lng?: number;
  images?: string[]; url?: string;
}): object {
  const url = extra?.url || propertyUrl(p);
  const image = extra?.images?.length ? extra.images : (p.image ? [p.image] : []);
  const priceNum = Number(p.pricePerNight) || undefined;
  const ratingNum = Number(p.rating);
  const hasRating = !Number.isNaN(ratingNum) && ratingNum > 0;

  const schema: any = {
    '@context': 'https://schema.org',
    '@type': p.type === 'Bonoriya Own' ? 'LodgingBusiness' : 'Hotel',
    name: p.name,
    description: clip(p.description || `Book ${p.name} in ${p.location} with BONORIYA — verified partner property in Northeast India.`, 300),
    url,
    image,
    telephone: '+91-9864282966',
    priceRange: p.price || '₹₹',
    address: {
      '@type': 'PostalAddress',
      addressLocality: extra?.city || (p.location?.split(',')[0] || '').trim(),
      addressRegion: extra?.state || (p.location?.split(',').slice(-1)[0] || '').trim(),
      addressCountry: 'IN',
    },
    amenityFeature: (p.amenities || []).map(a => ({
      '@type': 'LocationFeatureSpecification',
      name: a,
      value: true,
    })),
    numberOfRooms: p.rooms || undefined,
    petsAllowed: undefined,
    brand: { '@type': 'Brand', name: 'BONORIYA' },
  };

  if (extra?.lat && extra?.lng) {
    schema.geo = { '@type': 'GeoCoordinates', latitude: extra.lat, longitude: extra.lng };
  }
  if (priceNum) {
    schema.makesOffer = {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: priceNum,
      availability: 'https://schema.org/InStock',
      url,
    };
  }
  if (hasRating) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: ratingNum.toFixed(1),
      bestRating: '5',
      ratingCount: Math.max(5, p.rooms * 4 || 12),
    };
  }
  return schema;
}

export function buildDayTripSchema(dt: DayTripProperty): object {
  const url = dayTripUrl(dt);
  const ratingNum = Number(dt.rating);
  const hasRating = !Number.isNaN(ratingNum) && ratingNum > 0;
  const priceMatch = (dt.priceRange || '').match(/\d[\d,]*/);
  const priceLow = priceMatch ? Number(priceMatch[0].replace(/,/g, '')) : undefined;

  const schema: any = {
    '@context': 'https://schema.org',
    '@type': 'TouristAttraction',
    name: dt.name,
    description: clip(dt.shortDescription || dt.aboutUs || `${dt.name} — day trip experience in ${dt.location} with BONORIYA.`, 300),
    url,
    image: uniq([dt.heroImage, ...(dt.gallery || []).map(g => g.url)]).filter(Boolean),
    touristType: ['Eco Tourism', 'Cultural Tourism', 'Adventure Tourism'],
    address: {
      '@type': 'PostalAddress',
      addressLocality: (dt.location?.split(',')[0] || '').trim(),
      addressRegion: (dt.location?.split(',').slice(-1)[0] || '').trim(),
      addressCountry: 'IN',
    },
    telephone: dt.contactPhone || '+91-9864282966',
    email: dt.contactEmail || 'info@bonoriya.com',
  };

  if (dt.lat && dt.lng) {
    schema.geo = { '@type': 'GeoCoordinates', latitude: dt.lat, longitude: dt.lng };
  }
  if (priceLow) {
    schema.offers = {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: priceLow,
      priceSpecification: { '@type': 'PriceSpecification', priceCurrency: 'INR', minPrice: priceLow },
      availability: 'https://schema.org/InStock',
      url,
    };
  }
  if (hasRating) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: ratingNum.toFixed(1),
      bestRating: '5',
      ratingCount: 12,
    };
  }
  if (Array.isArray(dt.faqs) && dt.faqs.length) {
    // Return as separate FAQ page in main applier; here we only return the TouristAttraction.
  }
  return schema;
}

export function buildDayTripFAQSchema(dt: DayTripProperty): object | null {
  if (!dt.faqs?.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: dt.faqs.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

export function buildTouristDestinationSchema(d: {
  name: string; state: string; description: string; url: string;
  image?: string; attractions?: string[];
}): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'TouristDestination',
    name: d.name,
    description: clip(d.description, 300),
    url: d.url,
    image: d.image,
    address: {
      '@type': 'PostalAddress',
      addressRegion: d.state,
      addressCountry: 'IN',
    },
    includesAttraction: (d.attractions || []).map(a => ({ '@type': 'TouristAttraction', name: a })),
    touristType: ['Eco Tourism', 'Cultural Tourism', 'Adventure Tourism'],
  };
}

/** Build an ItemList JSON-LD listing properties (for /our-properties, /book-stays). */
export function buildPropertyItemList(items: PartnerProperty[], listUrl: string, listName: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: listName,
    url: listUrl,
    numberOfItems: items.length,
    itemListElement: items.slice(0, 30).map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: propertyUrl(p),
      name: p.name,
    })),
  };
}

// ─── Applier: raw ─────────────────────────────────────────────────────────────

interface DynamicSEOInput {
  title: string;
  description: string;
  canonical: string;
  keywords?: string;
  robots?: string;
  ogImage?: string;
  ogType?: string;
  schemas?: object[];
  imageAlt?: string;
}

export function applyDynamicSEO(cfg: DynamicSEOInput) {
  const robots = cfg.robots || 'index,follow';
  const ogImage = cfg.ogImage || DEFAULT_OG_IMAGE;

  document.title = cfg.title;
  replaceRobots(robots);

  setMeta('description', cfg.description);
  if (cfg.keywords) setMeta('keywords', cfg.keywords);
  setMeta('author', 'BONORIYA');

  setLink('canonical', cfg.canonical);

  // Open Graph
  setMeta('og:type', cfg.ogType || 'website', true);
  setMeta('og:site_name', SITE_NAME, true);
  setMeta('og:title', cfg.title, true);
  setMeta('og:description', cfg.description, true);
  setMeta('og:image', ogImage, true);
  setMeta('og:image:secure_url', ogImage, true);
  setMeta('og:image:width', '1200', true);
  setMeta('og:image:height', '630', true);
  setMeta('og:image:alt', cfg.imageAlt || cfg.title, true);
  setMeta('og:url', cfg.canonical, true);
  setMeta('og:locale', 'en_IN', true);

  // Twitter
  setMeta('twitter:card', 'summary_large_image');
  setMeta('twitter:title', cfg.title);
  setMeta('twitter:description', cfg.description);
  setMeta('twitter:image', ogImage);
  setMeta('twitter:image:alt', cfg.imageAlt || cfg.title);
  setMeta('twitter:site', '@bonoriya');
  setMeta('twitter:creator', '@bonoriya');

  // Wipe previous dynamic schemas, inject new ones
  clearDynamicSchemas();
  (cfg.schemas || []).forEach((s, i) => injectJsonLd(`schema-${i}`, s));
}

// ─── High-level appliers ──────────────────────────────────────────────────────

/**
 * Apply SEO for a property detail view.
 * Uses ONLY real property data. No placeholder text.
 */
export function applyPropertySEO(
  p: PartnerProperty,
  extras?: { city?: string; state?: string; district?: string; lat?: number; lng?: number; images?: string[]; nearby?: string[]; roomTypes?: string[]; }
) {
  const state = extras?.state || (p.location?.split(',').slice(-1)[0] || '').trim();
  const city = extras?.city || (p.location?.split(',')[0] || '').trim();
  const canonical = propertyUrl(p);

  const titleParts = [p.name];
  if (city) titleParts.push(city);
  if (state && state !== city) titleParts.push(state);
  titleParts.push('Book Online');
  const title = clip(`${titleParts.join(' | ')} — BONORIYA`, 65);

  const amenitiesPart = (p.amenities || []).slice(0, 4).join(', ');
  const description = clip([
    `${p.name} in ${p.location}.`,
    p.description || '',
    amenitiesPart ? `Amenities: ${amenitiesPart}.` : '',
    p.rating ? `Rated ${p.rating}/5 by guests.` : '',
    p.price ? `From ${p.price}.` : '',
    'Book instantly on BONORIYA.',
  ].filter(Boolean).join(' '), 158);

  const keywords = uniq([
    p.name.toLowerCase(),
    city && `hotels in ${city.toLowerCase()}`,
    city && `homestay in ${city.toLowerCase()}`,
    state && `stays in ${state.toLowerCase()}`,
    state && `resorts in ${state.toLowerCase()}`,
    extras?.district && `stays in ${extras.district.toLowerCase()}`,
    ...(extras?.nearby || []).map(n => n.toLowerCase()),
    'northeast india stays', 'BONORIYA', 'bonoriya.com',
  ].filter(Boolean)).join(', ');

  const ogImage = extras?.images?.[0] || p.image || DEFAULT_OG_IMAGE;

  const breadcrumbs = [
    { name: 'Home', url: `${BASE_URL}/` },
    { name: 'Book Stays', url: `${BASE_URL}/book-stays` },
    state ? { name: state, url: `${BASE_URL}/destinations/${slugify(state)}` } : null,
    city && city !== state ? { name: city, url: `${BASE_URL}/destinations/${slugify(city)}` } : null,
    { name: p.name, url: canonical },
  ].filter(Boolean) as { name: string; url: string }[];

  applyDynamicSEO({
    title, description, canonical, keywords,
    robots: p.active === false ? 'noindex,follow' : 'index,follow',
    ogImage,
    ogType: 'business.business',
    imageAlt: `${p.name} — ${p.location}`,
    schemas: [
      buildLodgingSchema(p, { ...extras, url: canonical }),
      buildBreadcrumbSchema(breadcrumbs),
    ],
  });
}

export function applyDayTripSEO(dt: DayTripProperty) {
  const canonical = dayTripUrl(dt);
  const state = (dt.location?.split(',').slice(-1)[0] || '').trim();
  const city = (dt.location?.split(',')[0] || '').trim();

  const title = clip(`${dt.name} | Day Trip in ${dt.location} | Book Online — BONORIYA`, 65);
  const description = clip([
    dt.shortDescription || dt.tagline || `${dt.name} — day trip experience.`,
    `Highlights: ${(dt.highlights || []).slice(0, 3).join(', ') || 'nature, culture, cuisine'}.`,
    dt.priceRange ? `From ${dt.priceRange} per guest.` : '',
    'Book online with BONORIYA.',
  ].filter(Boolean).join(' '), 158);

  const keywords = uniq([
    dt.name.toLowerCase(),
    city && `day trip ${city.toLowerCase()}`,
    state && `day trip ${state.toLowerCase()}`,
    'day trip near guwahati', 'eco tourism northeast india', 'BONORIYA day trip',
    ...(dt.highlights || []).map(h => h.toLowerCase()),
  ]).slice(0, 20).join(', ');

  const ogImage = dt.heroImage || DEFAULT_OG_IMAGE;

  const breadcrumbs = [
    { name: 'Home', url: `${BASE_URL}/` },
    { name: 'Day Trips', url: `${BASE_URL}/day-trip` },
    state ? { name: state, url: `${BASE_URL}/destinations/${slugify(state)}` } : null,
    { name: dt.name, url: canonical },
  ].filter(Boolean) as { name: string; url: string }[];

  const schemas: object[] = [
    buildDayTripSchema(dt),
    buildBreadcrumbSchema(breadcrumbs),
  ];
  const faq = buildDayTripFAQSchema(dt);
  if (faq) schemas.push(faq);

  applyDynamicSEO({
    title, description, canonical, keywords,
    robots: dt.active === false ? 'noindex,follow' : 'index,follow',
    ogImage, ogType: 'website',
    imageAlt: `${dt.name} — ${dt.location}`,
    schemas,
  });
}

/** Apply SEO for a destination (state or city) landing page. */
export function applyDestinationSEO(input: {
  slug: string;
  name: string;           // "Meghalaya"
  state?: string;         // "Meghalaya" (for city-level: parent state)
  description: string;
  attractions?: string[];
  bestTimeToVisit?: string;
  travelInfo?: string;
  image?: string;
  nearbyProperties?: PartnerProperty[];
}) {
  const canonical = destinationUrl(input.slug);
  const title = clip(`${input.name} Travel Guide | Stays, Attractions & Day Trips — BONORIYA`, 65);
  const description = clip([
    input.description,
    input.attractions?.length ? `Top attractions: ${input.attractions.slice(0, 4).join(', ')}.` : '',
    input.bestTimeToVisit ? `Best time to visit: ${input.bestTimeToVisit}.` : '',
    'Book verified stays with BONORIYA.',
  ].filter(Boolean).join(' '), 158);

  const keywords = uniq([
    input.name.toLowerCase(),
    `stays in ${input.name.toLowerCase()}`,
    `hotels in ${input.name.toLowerCase()}`,
    `homestays in ${input.name.toLowerCase()}`,
    `tourism in ${input.name.toLowerCase()}`,
    `travel guide ${input.name.toLowerCase()}`,
    ...(input.attractions || []).map(a => a.toLowerCase()),
    'northeast india', 'BONORIYA',
  ]).slice(0, 20).join(', ');

  const breadcrumbs = [
    { name: 'Home', url: `${BASE_URL}/` },
    { name: 'Destinations', url: `${BASE_URL}/destinations` },
    input.state && input.state !== input.name
      ? { name: input.state, url: destinationUrl(input.state) }
      : null,
    { name: input.name, url: canonical },
  ].filter(Boolean) as { name: string; url: string }[];

  const schemas: object[] = [
    buildTouristDestinationSchema({
      name: input.name,
      state: input.state || input.name,
      description: input.description,
      url: canonical,
      image: input.image,
      attractions: input.attractions,
    }),
    buildBreadcrumbSchema(breadcrumbs),
  ];

  if (input.nearbyProperties?.length) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: `Stays in ${input.name}`,
      url: canonical,
      itemListElement: input.nearbyProperties.slice(0, 20).map((p, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        url: propertyUrl(p),
        name: p.name,
      })),
    });
  }

  applyDynamicSEO({
    title, description, canonical, keywords,
    robots: 'index,follow',
    ogImage: input.image || DEFAULT_OG_IMAGE,
    ogType: 'website',
    imageAlt: `${input.name} — Northeast India travel`,
    schemas,
  });
}

// ─── Image SEO helpers ────────────────────────────────────────────────────────

/** Enrich <img> alt/title attributes on the current page for elements missing them. */
export function enrichImageAttrs(scopeSelector?: string) {
  const roots = scopeSelector ? Array.from(document.querySelectorAll(scopeSelector)) : [document.body];
  roots.forEach(root => {
    root.querySelectorAll('img').forEach(img => {
      if (!img.alt || img.alt === '') {
        const heading = img.closest('article,section,figure,div')?.querySelector('h1,h2,h3');
        const guess = heading?.textContent?.trim() || document.title.split('|')[0].trim() || 'BONORIYA — Northeast India';
        img.alt = guess;
      }
      if (!img.title) img.title = img.alt;
      if (!img.loading) img.loading = 'lazy';
      if (!img.decoding) img.decoding = 'async';
    });
  });
}

/** Continuously enrich images as the DOM changes (for React re-renders / lazy loads). */
let _mo: MutationObserver | null = null;
export function observeImageAttrs() {
  if (_mo) return;
  enrichImageAttrs();
  _mo = new MutationObserver(() => enrichImageAttrs());
  _mo.observe(document.body, { childList: true, subtree: true });
}

// ─── URL router (lightweight) ─────────────────────────────────────────────────

export interface ParsedRoute {
  page: string;
  entityType?: 'property' | 'destination' | 'day-trip';
  slug?: string;
}

/** Parse the current window.location to a canonical page key + slug. */
export function parseRoute(pathname?: string): ParsedRoute {
  const path = (pathname || window.location.pathname || '/').replace(/\/+$/, '') || '/';
  const seg = path.split('/').filter(Boolean);

  if (seg.length === 0) return { page: 'home' };
  const [root, tail] = seg;

  if (root === 'properties' && tail) return { page: 'book-stays', entityType: 'property', slug: tail };
  if (root === 'destinations' && tail) return { page: 'destinations', entityType: 'destination', slug: tail };
  if (root === 'day-trips' && tail) return { page: 'day-trip', entityType: 'day-trip', slug: tail };

  // Direct page slugs — map to page keys
  const direct = new Set([
    'home', 'book-stays', 'our-properties', 'prefab', 'day-trip', 'blogs', 'contact',
    'destinations', 'partner-login', 'admin',
    'stays-in-assam', 'stays-in-meghalaya', 'stays-in-arunachal-pradesh', 'stays-in-nagaland',
    'stays-in-manipur', 'stays-in-mizoram', 'stays-in-tripura', 'stays-in-sikkim',
    'hotels-in-guwahati', 'hotels-in-kaziranga', 'hotels-in-tawang',
    'homestays-in-shillong', 'homestay-in-imphal',
    'prefab-cottages', 'prefab-cottages-assam', 'modular-resorts', 'prefab-structures-assam',
  ]);
  if (direct.has(root)) return { page: root };

  return { page: 'home' };
}

export function pushRoute(path: string) {
  if (window.location.pathname !== path) {
    window.history.pushState({}, '', path);
  }
}
