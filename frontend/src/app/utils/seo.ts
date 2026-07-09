/**
 * BONORIYA – SEO, Metadata & Analytics Utilities
 * All head tag management is done via direct DOM manipulation since this is
 * a client-rendered React app without an index.html template we can edit.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PageSEO {
  title: string;
  description: string;
  keywords?: string;
  robots?: 'index,follow' | 'noindex,nofollow' | 'noindex,follow';
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: 'website' | 'article' | 'business.business';
  canonical?: string;
  schemaType?: 'home' | 'property' | 'prefab' | 'contact' | 'blog' | 'none';
}

export interface AnalyticsConfig {
  ga4Id: string;         // G-XXXXXXXXXX
  gtmId: string;         // GTM-XXXXXXX
  metaPixelId: string;   // 12-digit numeric ID
  enabled: boolean;
}

const ANALYTICS_KEY = 'bonoriya_analytics_config';
const BASE_URL = 'https://bonoriya.com';
const SITE_NAME = 'BONORIYA';

// ─── Social sharing assets ────────────────────────────────────────────────────
//
// BONORIYA logo — also used as the OG image so the logo appears on every
// WhatsApp / Facebook / Twitter / Instagram link preview.
//
// Setup (one-time):
//   Supabase Dashboard → Storage → bonoriya-assets → Upload both files:
//     1.  bonoriya-logo.png   ← the logo PNG used in email headers
//     2.  og-image.jpg        ← optional 1200×630 banner (falls back to logo)
//
const SUPABASE_ASSETS = 'https://mltpbbbauvluhhddteoy.supabase.co/storage/v1/object/public/bonoriya-assets';
const OG_IMAGE        = `${SUPABASE_ASSETS}/bonoriya-logo.png`;   // logo shown on social shares
const OG_IMAGE_BANNER = `${SUPABASE_ASSETS}/og-image.jpg`;         // optional full banner (1200×630)

const SOCIAL_DESCRIPTION = "BONORIYA — Northeast India's premium platform for offbeat stays, eco resorts, homestays & prefabricated cottage manufacturing in Assam and beyond.";

const TOURISM_KW = [
  // Broad NE India
  'stays in northeast india', 'homestays in northeast india', 'offbeat stays in northeast india',
  'eco resorts in northeast india', 'best resorts in assam', 'offbeat tourism northeast india',
  'travel booking platform northeast india', 'offbeat tourism',
  // Guwahati & Kamakhya
  'hotels in guwahati', 'homestay near kamakhya railway junction',
  'hotels near kamakhya junction', 'homestay near maa kamakhya temple',
  'hotels near maa kamakhya temple', 'budget stays in guwahati',
  // Meghalaya
  'homestays in shillong', 'resorts in meghalaya', 'hotels in shillong',
  'eco stays meghalaya', 'homestay in cherrapunji', 'hotels in cherrapunji',
  'best day trips guwahati', 'day trip near guwahati', 'day trip meghalaya',
  'Jimbrigaon', 'eco tourism meghalaya',
  // Assam nature & wildlife
  'hotels in kaziranga national park', 'homestay in kaziranga national park',
  'homestay in chandubi', 'resorts in chandubi',
  'resorts in manas national park', 'homestay in manas national park',
  'homestay in pobitora', 'resorts in pobitora',
  'budget stays in assam', 'resorts near guwahati',
  // Arunachal Pradesh
  'hotels in tawang', 'homestay in tawang',
  'hotels in shergaon', 'homestays in shergaon',
  'stays in dirang valley', 'homestays in dirang valley',
  'homestay in anini', 'homestay near zero valley',
  'hotels in machuka', 'homestay in machuka',
  // Manipur & other states
  'hotels in imphal', 'homestay in imphal',
  'hotel booking Northeast India', 'homestay booking Assam', 'Meghalaya travel',
  'Arunachal Pradesh stays',
];

const PREFAB_KW = [
  'prefab house manufacturer in assam', 'prefabricated cottages in assam',
  'prefab cottages manufacturer northeast india', 'modular cottages in assam',
  'prefabricated structures manufacturer in northeast india', 'prefab resort cottages manufacturer',
  'prefab home assam', 'modular resort cottages', 'glamping pod manufacturer',
  'A-frame cottage northeast india', 'prefabricated cottage manufacturer',
  'prefab house Northeast India', 'modular home Guwahati', 'bamboo cottage manufacturer',
  'barnhouse manufacturer assam', 'alpine villa prefab',
];

const BASE_KEYWORDS = ['BONORIYA', 'Bonoriya', ...TOURISM_KW, ...PREFAB_KW].join(', ');
const PREFAB_KEYWORDS = PREFAB_KW.join(', ');

// ─── Page configs ─────────────────────────────────────────────────────────────

export const PAGE_SEO: Record<string, PageSEO> = {
  home: {
    title: 'Bonoriya | Book Resorts & Homestays in Northeast India',
    description: 'Book resorts, hotels and homestays across Northeast India with Bonoriya. Also explore prefab cottages, modular resorts in Assam.',
    keywords: BASE_KEYWORDS,
    robots: 'index,follow',
    ogType: 'website',
    ogTitle: 'BONORIYA — Northeast India Stays & Prefab Cottages',
    schemaType: 'home',
    canonical: `${BASE_URL}/`,
  },
  'book-stays': {
    title: 'Book Hotels, Resorts & Homestays in Northeast India — Bonoriya',
    description: 'Find and book the best hotels, resorts and homestays in Guwahati, Shillong, Kaziranga, Tawang, Imphal and across Northeast India. Instant booking with Bonoriya.',
    keywords: 'book stays northeast india, offbeat stays northeast india, homestays northeast india, eco resorts northeast india, best resorts assam, homestays shillong, resorts meghalaya, ' + BASE_KEYWORDS,
    robots: 'index,follow',
    ogType: 'website',
    schemaType: 'property',
    canonical: `${BASE_URL}/book-stays`,
  },
  'our-properties': {
    title: 'Partner Hotels, Resorts & Homestays | Northeast India — Bonoriya',
    description: "Explore verified partner hotels, eco resorts and homestays listed on Bonoriya across Assam, Meghalaya, Arunachal Pradesh and Northeast India. All properties vetted for quality.",
    keywords: 'best stays northeast india, eco resorts assam, homestays meghalaya, offbeat resorts northeast india, ' + BASE_KEYWORDS,
    robots: 'index,follow',
    ogType: 'website',
    schemaType: 'property',
    canonical: `${BASE_URL}/our-properties`,
  },
  prefab: {
    title: 'Prefab Cottages Manufacturer in Assam | Modular Homes Northeast India — BONORIYA',
    description: 'BONORIYA — leading prefab cottage manufacturer in Assam. Premium prefabricated cottages, glamping pods, A-frame cabins, modular resort structures for Northeast India. Quick installation.',
    keywords: PREFAB_KEYWORDS + ', ' + BASE_KEYWORDS,
    robots: 'index,follow',
    ogType: 'website',
    schemaType: 'prefab',
    canonical: `${BASE_URL}/prefab`,
  },
  'day-trip': {
    title: 'Best Day Trip Near Guwahati | Jimbrigaon Meghalaya Eco Tourism — BONORIYA',
    description: 'Book the best day trip near Guwahati — Jimbrigaon, Meghalaya with BONORIYA. Organic orange farm trek, waterfall hike, Khasi culture & traditional Assamese cuisine.',
    keywords: 'day trip near guwahati, day trip meghalaya, Jimbrigaon eco tourism, best day trips guwahati, Khasi culture tour, eco stays meghalaya, waterfall trek meghalaya, ' + BASE_KEYWORDS,
    robots: 'index,follow',
    ogType: 'website',
    schemaType: 'property',
    canonical: `${BASE_URL}/day-trip`,
  },
  contact: {
    title: 'Contact BONORIYA | Offbeat Stays, Day Trips & Prefab Enquiries — Northeast India',
    description: 'Contact BONORIYA for bookings, offbeat stay enquiries, property partnerships, prefab cottage quotations or general support. Call +91-9864282966 or email info@bonoriya.com.',
    keywords: 'contact BONORIYA, BONORIYA enquiry, prefab cottage quote, property partnership northeast india, ' + BASE_KEYWORDS,
    robots: 'index,follow',
    ogType: 'website',
    schemaType: 'contact',
    canonical: `${BASE_URL}/contact`,
  },
  blogs: {
    title: 'Northeast India Travel Blog | Offbeat Stays, Treks & Culture — BONORIYA',
    description: 'Read the BONORIYA travel blog — Northeast India guides, offbeat stays, hidden gems, eco resorts, treks, Meghalaya culture, Assam tourism tips and prefab living inspiration.',
    keywords: 'northeast india travel blog, offbeat stays northeast india, meghalaya travel guide, assam tourism, hidden gems northeast india, eco tourism blog, ' + BASE_KEYWORDS,
    robots: 'index,follow',
    ogType: 'article',
    schemaType: 'blog',
    canonical: `${BASE_URL}/blogs`,
  },
  destinations: {
    title: 'Offbeat Destinations in Northeast India | Assam, Meghalaya & More — BONORIYA',
    description: 'Explore 8 breathtaking states of Northeast India with BONORIYA. Offbeat stays in Assam, Meghalaya, Arunachal Pradesh, Nagaland, Manipur, Mizoram, Tripura and Sikkim.',
    keywords: 'offbeat destinations northeast india, northeast india travel, assam destinations, meghalaya destinations, arunachal pradesh tourism, ' + BASE_KEYWORDS,
    robots: 'index,follow',
    ogType: 'website',
    schemaType: 'property',
    canonical: `${BASE_URL}/destinations`,
  },
  // ── STATE & CITY LOCATION PAGES ─────────────────────────────────────────────

  'stays-in-assam': {
    title: 'Hotels & Homestays in Assam | Guwahati, Kaziranga & Beyond — Bonoriya',
    description: 'Book hotels, eco resorts and homestays in Assam — Kamakhya Temple, Guwahati, Kaziranga National Park, Manas, Chandubi and Pobitora. Instant booking with Bonoriya.',
    keywords: 'hotels in guwahati, homestay near kamakhya, hotels near kamakhya junction, homestay near maa kamakhya temple, hotels in kaziranga national park, homestay kaziranga, resorts chandubi, budget stays assam, ' + BASE_KEYWORDS,
    robots: 'index,follow',
    ogType: 'website',
    schemaType: 'property',
    canonical: `${BASE_URL}/stays-in-assam`,
  },
  'stays-in-meghalaya': {
    title: 'Hotels & Homestays in Meghalaya | Shillong, Cherrapunji — Bonoriya',
    description: 'Book hotels and homestays in Meghalaya — Shillong, Cherrapunji, Mawlynnong. Best day trips near Guwahati. Instant booking with Bonoriya.',
    keywords: 'hotels in shillong, homestays in shillong, homestay in cherrapunji, hotels in meghalaya, day trip meghalaya, resorts meghalaya, ' + BASE_KEYWORDS,
    robots: 'index,follow',
    ogType: 'website',
    schemaType: 'property',
    canonical: `${BASE_URL}/stays-in-meghalaya`,
  },
  'hotels-in-guwahati': {
    title: 'Hotels & Homestays Near Kamakhya Temple, Guwahati — Bonoriya',
    description: 'Book hotels and homestays near Kamakhya Railway Junction and Maa Kamakhya Temple, Guwahati. Budget to premium options. Instant booking with Bonoriya.',
    keywords: 'hotels in guwahati, hotels near kamakhya junction, homestay near kamakhya temple, hotels near maa kamakhya temple, budget stays guwahati, ' + BASE_KEYWORDS,
    robots: 'index,follow',
    ogType: 'website',
    schemaType: 'property',
    canonical: `${BASE_URL}/hotels-in-guwahati`,
  },
  'hotels-in-kaziranga': {
    title: 'Hotels & Resorts Near Kaziranga National Park — Bonoriya',
    description: 'Book hotels, jungle resorts and homestays near Kaziranga National Park. Best wildlife resort deals. Easy rhino safari access. Book with Bonoriya.',
    keywords: 'hotels in kaziranga national park, homestay in kaziranga, resorts near kaziranga, jungle resort kaziranga, wildlife stays assam, ' + BASE_KEYWORDS,
    robots: 'index,follow',
    ogType: 'website',
    schemaType: 'property',
    canonical: `${BASE_URL}/hotels-in-kaziranga`,
  },
  'hotels-in-tawang': {
    title: 'Hotels & Homestays in Tawang, Arunachal Pradesh — Bonoriya',
    description: 'Book hotels and homestays in Tawang, Arunachal Pradesh. Explore Tawang Monastery and scenic mountain town. Best mountain-view stays with Bonoriya.',
    keywords: 'hotels in tawang, homestay in tawang, resorts tawang, hotels in shergaon, homestays in shergaon, stays in dirang valley, homestays dirang valley, ' + BASE_KEYWORDS,
    robots: 'index,follow',
    ogType: 'website',
    schemaType: 'property',
    canonical: `${BASE_URL}/hotels-in-tawang`,
  },
  'homestays-in-shillong': {
    title: 'Homestays & Budget Hotels in Shillong, Meghalaya — Bonoriya',
    description: 'Find the best homestays and budget hotels in Shillong near Ward\'s Lake, Police Bazaar and Elephant Falls. Book instantly with Bonoriya.',
    keywords: 'homestays in shillong, hotels in shillong, budget hotels shillong, homestay shillong meghalaya, shillong tourism, ' + BASE_KEYWORDS,
    robots: 'index,follow',
    ogType: 'website',
    schemaType: 'property',
    canonical: `${BASE_URL}/homestays-in-shillong`,
  },
  'homestay-in-imphal': {
    title: 'Hotels & Homestays in Imphal, Manipur — Bonoriya',
    description: 'Book hotels and homestays in Imphal, Manipur near Kangla Fort, Loktak Lake and Ima Keithel market. Authentic Manipuri hospitality with Bonoriya.',
    keywords: 'hotels in imphal, homestay in imphal, budget stays imphal, manipur tourism, kangla fort stays, ' + BASE_KEYWORDS,
    robots: 'index,follow',
    ogType: 'website',
    schemaType: 'property',
    canonical: `${BASE_URL}/homestay-in-imphal`,
  },
  'prefab-cottages-assam': {
    title: 'Prefabricated Cottage Manufacturer in Assam, Guwahati — Bonoriya',
    description: 'Bonoriya manufactures premium prefabricated cottages, glamping pods, A-frame cabins and modular resort structures in Assam. Fast installation across Northeast India. Get a free quote.',
    keywords: 'prefab cottage manufacturer assam, prefabricated cottage guwahati, modular cottage northeast india, glamping pod manufacturer assam, prefab house manufacturer assam, ' + PREFAB_KEYWORDS,
    robots: 'index,follow',
    ogType: 'website',
    schemaType: 'prefab',
    canonical: `${BASE_URL}/prefab-cottages-assam`,
  },
  'partner-login': {
    title: 'Partner Portal | BONORIYA',
    description: 'BONORIYA Partner Portal — manage your property listings, bookings, pricing and availability.',
    robots: 'noindex,nofollow',
    ogType: 'website',
    schemaType: 'none',
  },
  admin: {
    title: 'Admin Dashboard | BONORIYA',
    description: 'BONORIYA Administration Panel',
    robots: 'noindex,nofollow',
    ogType: 'website',
    schemaType: 'none',
  },
};

// ─── Structured Data (JSON-LD) ────────────────────────────────────────────────

const SCHEMA_ORGANIZATION = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'BONORIYA',
  url: BASE_URL,
  logo: `${BASE_URL}/logo.png`,
  description: 'BONORIYA is a hospitality booking platform and prefabricated cottage manufacturer based in Northeast India.',
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+91-9864282966',
    contactType: 'customer service',
    areaServed: 'IN',
    availableLanguage: ['English', 'Hindi', 'Assamese'],
  },
  sameAs: [
    'https://www.facebook.com/bonoriya',
    'https://www.instagram.com/bonoriya',
  ],
  address: {
    '@type': 'PostalAddress',
    addressRegion: 'Assam',
    addressCountry: 'IN',
  },
};

const SCHEMA_WEBSITE = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: BASE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: `${BASE_URL}/book-stays?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
};

const SCHEMA_LOCAL_BUSINESS = {
  '@context': 'https://schema.org',
  '@type': ['LodgingBusiness', 'TouristAttraction', 'LocalBusiness'],
  name: 'BONORIYA',
  description: 'Off-beat tourism, homestay bookings and prefabricated cottage manufacturing across Northeast India.',
  url: BASE_URL,
  telephone: '+91-9864282966',
  email: 'info@bonoriya.com',
  address: {
    '@type': 'PostalAddress',
    addressRegion: 'Assam',
    addressCountry: 'IN',
  },
  geo: { '@type': 'GeoCoordinates', latitude: 26.1445, longitude: 91.7362 },
  priceRange: '₹₹',
  servesCuisine: 'Assamese',
  amenityFeature: ['Eco-Friendly', 'Online Booking', 'Day Trips', 'Cultural Tours'],
};

const SCHEMA_PREFAB = {
  '@context': 'https://schema.org',
  '@type': 'HomeAndConstructionBusiness',
  name: 'BONORIYA Prefab Structures',
  description: 'Leading manufacturer of prefabricated cottages, glamping pods, A-frame cabins, barnhouses and alpine villas in Northeast India (Assam, Guwahati).',
  url: `${BASE_URL}/prefab`,
  telephone: '+91-9864282966',
  email: 'info@bonoriya.com',
  address: { '@type': 'PostalAddress', addressRegion: 'Assam', addressCountry: 'IN' },
  areaServed: ['Assam', 'Meghalaya', 'Arunachal Pradesh', 'Nagaland', 'Manipur', 'Mizoram', 'Tripura', 'Sikkim'],
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Prefab Structures',
    itemListElement: [
      { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Glamping Pod — Single Room Cottage' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Product', name: '1 BHK Barnhouse' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'A-Frame 1 BHK Cottage' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Product', name: 'Alpine Villa' } },
    ],
  },
};

const SCHEMA_HOTEL = {
  '@context': 'https://schema.org',
  '@type': 'Hotel',
  name: 'BONORIYA — Offbeat Stays Northeast India',
  description: 'Premium offbeat stays, eco resorts, homestays and hotels across Northeast India curated by BONORIYA.',
  url: `${BASE_URL}/book-stays`,
  telephone: '+91-9864282966',
  email: 'info@bonoriya.com',
  address: { '@type': 'PostalAddress', addressRegion: 'Assam', addressCountry: 'IN' },
  starRating: { '@type': 'Rating', ratingValue: '4.8' },
  priceRange: '₹₹',
};

const SCHEMA_PRODUCTS = [
  { '@context': 'https://schema.org', '@type': 'Product', name: 'Glamping Pod — Single Room Prefab Cottage', description: 'Premium glamping pod prefab cottage for resorts and homestays. Quick installation, weather-resistant, designed for Northeast India.', brand: { '@type': 'Brand', name: 'BONORIYA' }, manufacturer: { '@type': 'Organization', name: 'BONORIYA' }, category: 'Prefabricated Structures', offers: { '@type': 'Offer', availability: 'https://schema.org/InStock', priceCurrency: 'INR' } },
  { '@context': 'https://schema.org', '@type': 'Product', name: 'A-Frame 1 BHK Prefabricated Cottage', description: 'Iconic A-Frame 1 BHK prefab cottage ideal for resorts, eco-lodges and homestays in Northeast India.', brand: { '@type': 'Brand', name: 'BONORIYA' }, manufacturer: { '@type': 'Organization', name: 'BONORIYA' }, category: 'Prefabricated Structures', offers: { '@type': 'Offer', availability: 'https://schema.org/InStock', priceCurrency: 'INR' } },
  { '@context': 'https://schema.org', '@type': 'Product', name: '1 BHK Barnhouse — Prefab Structure', description: 'BONORIYA 1 BHK Barnhouse prefabricated structure for hospitality in Northeast India.', brand: { '@type': 'Brand', name: 'BONORIYA' }, manufacturer: { '@type': 'Organization', name: 'BONORIYA' }, category: 'Prefabricated Structures', offers: { '@type': 'Offer', availability: 'https://schema.org/InStock', priceCurrency: 'INR' } },
];

const SCHEMA_FAQ_TOURISM = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'What are the best offbeat stays in Northeast India?', acceptedAnswer: { '@type': 'Answer', text: 'BONORIYA curates the best offbeat stays across Northeast India — eco resorts in Meghalaya, riverside homestays in Assam, mountain retreats in Arunachal Pradesh, and cultural stays in Nagaland. Browse all at bonoriya.com/our-properties.' } },
    { '@type': 'Question', name: 'What is the best day trip near Guwahati?', acceptedAnswer: { '@type': 'Answer', text: 'BONORIYA Agro Eco Tourism at Jimbrigaon, Halher, Meghalaya is one of the best day trips near Guwahati — organic orange farm trek, waterfall hike, traditional Assamese cuisine and live Khasi folk music.' } },
    { '@type': 'Question', name: 'How do I book a homestay in Northeast India?', acceptedAnswer: { '@type': 'Answer', text: 'Visit bonoriya.com/book-stays, search by location or property name, select dates and guests, choose a room, and confirm instantly. Full payment is due at check-in.' } },
    { '@type': 'Question', name: 'What are the best resorts in Assam?', acceptedAnswer: { '@type': 'Answer', text: 'BONORIYA lists verified eco stays and partner resorts in Assam — near Kaziranga, Majuli island, tea estate country and the Brahmaputra riverbank.' } },
    { '@type': 'Question', name: 'What resorts are available in Meghalaya?', acceptedAnswer: { '@type': 'Answer', text: "BONORIYA lists eco resorts and boutique homestays in Shillong, Cherrapunji, Mawlynnong, Dawki and living root bridge areas of Meghalaya." } },
    { '@type': 'Question', name: 'How can I list my property on BONORIYA?', acceptedAnswer: { '@type': 'Answer', text: 'Register as a BONORIYA Partner at bonoriya.com/partner-login. Submit property details for review. Once approved your property goes live. BONORIYA charges 10% commission on successful bookings only.' } },
  ],
};

const SCHEMA_FAQ_PREFAB = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: 'Who is the best prefab cottage manufacturer in Assam?', acceptedAnswer: { '@type': 'Answer', text: 'BONORIYA is a leading prefabricated cottage manufacturer based in Assam, Northeast India. We design and manufacture glamping pods, A-frame cottages, barnhouses, alpine villas and modular resort structures.' } },
    { '@type': 'Question', name: 'What is the cost of a prefabricated cottage in India?', acceptedAnswer: { '@type': 'Answer', text: "Costs vary by type and size. Contact BONORIYA at +91-9864282966 for a free detailed quote." } },
    { '@type': 'Question', name: 'How long does it take to install a prefab cottage?', acceptedAnswer: { '@type': 'Answer', text: 'BONORIYA prefab cottages can be installed in 2–8 weeks — much faster than traditional construction.' } },
    { '@type': 'Question', name: 'Do you manufacture prefab cottages for resorts in Northeast India?', acceptedAnswer: { '@type': 'Answer', text: 'Yes. BONORIYA specialises in prefabricated resort cottages and glamping structures for hospitality businesses across all 8 Northeast Indian states.' } },
  ],
};

export function buildBlogPostingSchema(blog: { title: string; excerpt?: string; authorName?: string; publishDate?: string; url?: string; imageUrl?: string; }): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: blog.title,
    description: blog.excerpt || '',
    author: { '@type': 'Person', name: blog.authorName || 'BONORIYA Team' },
    publisher: { '@type': 'Organization', name: 'BONORIYA', logo: { '@type': 'ImageObject', url: 'https://mltpbbbauvluhhddteoy.supabase.co/storage/v1/object/public/bonoriya-assets/bonoriya-logo.png' } },
    datePublished: blog.publishDate || new Date().toISOString(),
    url: blog.url || 'https://bonoriya.com/blogs',
    image: blog.imageUrl,
    mainEntityOfPage: { '@type': 'WebPage', '@id': blog.url || 'https://bonoriya.com/blogs' },
  };
}

export function injectBlogSchema(blog: Parameters<typeof buildBlogPostingSchema>[0]): void {
  document.querySelectorAll('[data-bonoriya-blog-schema]').forEach(s => s.remove());
  const el = document.createElement('script');
  el.type = 'application/ld+json';
  el.setAttribute('data-bonoriya-blog-schema', '1');
  el.textContent = JSON.stringify(buildBlogPostingSchema(blog));
  document.head.appendChild(el);
}

const SCHEMA_MAP: Record<string, object[]> = {
  home:     [SCHEMA_ORGANIZATION, SCHEMA_WEBSITE, SCHEMA_LOCAL_BUSINESS, SCHEMA_FAQ_TOURISM],
  property: [SCHEMA_ORGANIZATION, SCHEMA_LOCAL_BUSINESS, SCHEMA_HOTEL],
  prefab:   [SCHEMA_ORGANIZATION, SCHEMA_PREFAB, ...SCHEMA_PRODUCTS, SCHEMA_FAQ_PREFAB],
  contact:  [SCHEMA_ORGANIZATION],
  blog:     [SCHEMA_ORGANIZATION],
  none:     [],
};

// ─── Analytics Config ─────────────────────────────────────────────────────────

export const getAnalyticsConfig = (): AnalyticsConfig => {
  const raw = localStorage.getItem(ANALYTICS_KEY);
  return raw ? JSON.parse(raw) : { ga4Id: '', gtmId: '', metaPixelId: '', enabled: false };
};

export const saveAnalyticsConfig = (cfg: AnalyticsConfig): void => {
  localStorage.setItem(ANALYTICS_KEY, JSON.stringify(cfg));
};

// ─── Head tag helpers ──────────────────────────────────────────────────────────

function setMetaTag(name: string, content: string, property = false) {
  const attr = property ? 'property' : 'name';
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLinkTag(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) { el = document.createElement('link'); el.rel = rel; document.head.appendChild(el); }
  el.href = href;
}

function removeScriptById(id: string) {
  document.getElementById(id)?.remove();
}

function injectScript(id: string, src: string, async_ = true) {
  if (document.getElementById(id)) return;
  const s = document.createElement('script');
  s.id = id; s.src = src; if (async_) s.async = true;
  document.head.appendChild(s);
}

function injectInlineScript(id: string, code: string) {
  if (document.getElementById(id)) return;
  const s = document.createElement('script');
  s.id = id; s.textContent = code;
  document.head.appendChild(s);
}

function injectNoscript(id: string, html: string) {
  if (document.getElementById(id)) return;
  const ns = document.createElement('noscript');
  ns.id = id; ns.innerHTML = html;
  document.body.insertBefore(ns, document.body.firstChild);
}

// ─── Main SEO applicator ──────────────────────────────────────────────────────

export function applySEO(pageKey: string, overrides?: Partial<PageSEO>, _bonoriyaLogoUrl?: string) {
  const cfg: PageSEO = { ...PAGE_SEO[pageKey] ?? PAGE_SEO.home, ...overrides };
  const canonicalUrl = cfg.canonical || `${BASE_URL}/${pageKey}`;

  // Social share title — strictly "BONORIYA", nothing else, on every platform
  const socialTitle = 'BONORIYA';

  // Social share description — canonical across all platforms
  const socialDesc = SOCIAL_DESCRIPTION;

  // OG image: BONORIYA logo hosted on Supabase Storage (publicly accessible).
  // Local bundle imports / relative paths cannot be fetched by WhatsApp/Facebook crawlers.
  const ogImage = OG_IMAGE;

  // ── Browser title (SEO — page specific) ──
  document.title = cfg.title;

  // ── CRITICAL: Purge any SDK-injected noindex before setting correct value ──
  // Figma Make / hosting platforms can inject noindex; we override it here.
  document.querySelectorAll('meta[name="robots"], meta[name="googlebot"]')
    .forEach(el => el.remove());
  const robotsEl = document.createElement('meta');
  robotsEl.name    = 'robots';
  robotsEl.content = cfg.robots || 'index,follow';
  document.head.insertBefore(robotsEl, document.head.firstChild);
  const googlebotEl = document.createElement('meta');
  googlebotEl.name    = 'googlebot';
  googlebotEl.content = cfg.robots || 'index,follow';
  document.head.insertBefore(googlebotEl, document.head.firstChild);

  // ── Basic meta — use page-specific description for Google snippet ──
  setMetaTag('description', cfg.description || socialDesc);
  if (cfg.keywords) setMetaTag('keywords', cfg.keywords);
  setMetaTag('author', 'BONORIYA');
  setMetaTag('viewport', 'width=device-width, initial-scale=1');

  // ── Canonical ──
  setLinkTag('canonical', canonicalUrl);

  // ── Open Graph (WhatsApp / Facebook / LinkedIn / Telegram / Instagram) ──
  setMetaTag('og:type',        cfg.ogType || 'website', true);
  setMetaTag('og:site_name',   'BONORIYA',                          true);
  setMetaTag('og:title',       cfg.ogTitle || 'BONORIYA',           true);
  setMetaTag('og:description', cfg.description || socialDesc,       true);
  setMetaTag('og:image',       ogImage,                 true);  // BONORIYA logo PNG
  setMetaTag('og:image:secure_url', ogImage,            true);  // HTTPS required by Facebook
  setMetaTag('og:image:width', '512',                   true);  // logo dimensions
  setMetaTag('og:image:height','512',                   true);
  setMetaTag('og:image:type',  'image/png',             true);  // PNG logo, not JPEG
  setMetaTag('og:image:alt',   'BONORIYA',              true);  // shown when image blocked
  setMetaTag('og:url',         canonicalUrl,            true);
  setMetaTag('og:locale',      'en_IN',                 true);

  // ── Twitter / X Card ──
  setMetaTag('twitter:card',        'summary');          // 'summary' suits a square logo
  setMetaTag('twitter:title',       'BONORIYA');
  setMetaTag('twitter:description', socialDesc);
  setMetaTag('twitter:image',       ogImage);
  setMetaTag('twitter:image:alt',   'BONORIYA');
  setMetaTag('twitter:site',        '@bonoriya');
  setMetaTag('twitter:creator',     '@bonoriya');

  // ── Application name (shown in browser tab on some platforms) ──
  setMetaTag('application-name', 'BONORIYA');
  setMetaTag('apple-mobile-web-app-title', 'BONORIYA');

  // ── Structured data ──
  const schemaType = cfg.schemaType || 'none';
  const schemas = SCHEMA_MAP[schemaType] || [];
  // Remove old schema scripts
  document.querySelectorAll('script[data-bonoriya-schema]').forEach(el => el.remove());
  schemas.forEach((schema, i) => {
    const el = document.createElement('script');
    el.type = 'application/ld+json';
    el.setAttribute('data-bonoriya-schema', String(i));
    el.textContent = JSON.stringify(schema, null, 2);
    document.head.appendChild(el);
  });

  // ── Analytics (only if enabled and IDs configured) ──
  const analytics = getAnalyticsConfig();
  if (analytics.enabled) {
    // Google Analytics 4
    if (analytics.ga4Id) {
      injectScript('bonoriya-ga4-src', `https://www.googletagmanager.com/gtag/js?id=${analytics.ga4Id}`);
      injectInlineScript('bonoriya-ga4-init', `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${analytics.ga4Id}', { page_path: window.location.pathname });
      `);
    }

    // Google Tag Manager
    if (analytics.gtmId) {
      injectInlineScript('bonoriya-gtm-head', `
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
        var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
        j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
        f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${analytics.gtmId}');
      `);
      injectNoscript('bonoriya-gtm-body',
        `<iframe src="https://www.googletagmanager.com/ns.html?id=${analytics.gtmId}" height="0" width="0" style="display:none;visibility:hidden"></iframe>`
      );
    }

    // Meta (Facebook) Pixel
    if (analytics.metaPixelId) {
      injectInlineScript('bonoriya-meta-pixel', `
        !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
        n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
        document,'script','https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${analytics.metaPixelId}');
        fbq('track', 'PageView');
      `);
    }
  }

  // ── Track GA4 page view on page change (if already initialized) ──
  if (analytics.enabled && analytics.ga4Id && (window as any).gtag) {
    (window as any).gtag('event', 'page_view', {
      page_title: cfg.title,
      page_path: `/${pageKey}`,
    });
  }

  // ── Track Meta Pixel page view ──
  if (analytics.enabled && analytics.metaPixelId && (window as any).fbq) {
    (window as any).fbq('track', 'PageView');
  }
}

/** Fire a custom analytics event (GA4 + Meta Pixel) */
export function trackEvent(eventName: string, params: Record<string, unknown> = {}) {
  const analytics = getAnalyticsConfig();
  if (!analytics.enabled) return;
  if (analytics.ga4Id && (window as any).gtag) {
    (window as any).gtag('event', eventName, params);
  }
  if (analytics.metaPixelId && (window as any).fbq) {
    (window as any).fbq('trackCustom', eventName, params);
  }
}

/** Standard Meta Pixel events */
export const PixelEvents = {
  viewProperty:    (name: string)       => trackEvent('ViewContent',      { content_name: name, content_type: 'property' }),
  startBooking:    (name: string)       => trackEvent('InitiateCheckout', { content_name: name }),
  completeBooking: (ref: string, v: number) => trackEvent('Purchase',     { transaction_id: ref, value: v, currency: 'INR' }),
  partnerSignup:   ()                   => trackEvent('CompleteRegistration', { content_name: 'Partner Signup' }),
  guestSignup:     ()                   => trackEvent('CompleteRegistration', { content_name: 'Guest Signup' }),
};