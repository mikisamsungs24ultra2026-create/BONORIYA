import { useState, useEffect } from 'react';
import { Menu, X, Mountain, Home as HomeIcon, Building2, MapPin, User, Mail, Phone, LogOut, Search, Calendar, Users, Plus, Minus } from 'lucide-react';
import { getApprovedPartnerProperties, getBonoriyaPropertyData, loadPartnerPropertyData, getActiveDayTripProperties, type PartnerProperty, type GuestRecord } from './utils/auth';
import { applySEO, PixelEvents } from './utils/seo';
import { applyPropertySEO, applyDayTripSEO, applyDestinationSEO, parseRoute, propertySlug, enrichImageAttrs, observeImageAttrs } from './utils/seoDynamic';
import { checkAndUpdateVersion, APP_VERSION, importAppData } from './utils/cacheVersion';
import { initSupabase } from './utils/auth';
import bonoriyaLogo from '../imports/Bonoriya_2___1_.png';
import bonoriyaFavicon from '../imports/1000276893.png';
import heroImage from '../imports/Arunachal_Pradesh.jpg';
import offBeatTourismImage from '../imports/64576125Mawlynnong_Living_Root_Bridge__Main.jpg';
import aboutSectionImage from '../imports/1000274181.jpg';
import glampingPodCottage from '../imports/Glamping_Pod__Single_Room_Cottage_.png';
import barnhouseGroundFloor from '../imports/Burn_House__1BHK_.png';
import aFrame1BHK from '../imports/A_Frame_1_BHK.png';
import BookStays from './components/BookStays';
import Footer from './components/Footer';
import PartnerLogin from './components/PartnerLogin';
import ContactUs from './components/ContactUs';
import Blogs from './components/Blogs';
import OurProperties from './components/OurProperties';
import DayTripBooking from './components/DayTripBooking';
import BonoriyaAI from './components/BonoriyaAI';
import AdminLogin from './components/AdminLogin';
import LocationAutocomplete from './components/LocationAutocomplete';
import PrefabStructure from './components/PrefabStructure';
import Destinations from './components/Destinations';
import GatewayPage from './components/GatewayPage';
import { ImageWithFallback } from './components/figma/ImageWithFallback';

export default function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('gateway');
  const [currentSection, setCurrentSection] = useState<string | undefined>(undefined);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [currentGuest, setCurrentGuest] = useState<GuestRecord | null>(null);
  const [isPartnerLoggedIn, setIsPartnerLoggedIn] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [searchParams, setSearchParams] = useState({
    location: '',
    checkIn: '',
    checkOut: '',
    adults: 2,
    children: 0,
    coordinates: { lat: 0, lng: 0 }
  });
  const [featuredPartnerProps, setFeaturedPartnerProps] = useState<PartnerProperty[]>([]);
  const bonoriyaOwnData = getBonoriyaPropertyData();

  useEffect(() => {
    const props = getApprovedPartnerProperties();
    setFeaturedPartnerProps([...props].sort(() => Math.random() - 0.5).slice(0, 2));
  }, []);

  // Enhanced setCurrentPage to handle section navigation
  const handleSetCurrentPage = (page: string, section?: string) => {
    setCurrentPage(page);
    setCurrentSection(section);
  };

  // ── URL sync: whenever currentPage changes, keep window.location in sync ──
  const [urlSyncReady, setUrlSyncReady] = useState(false);
  useEffect(() => {
    if (!urlSyncReady) return;
    const map: Record<string, string> = {
      gateway: '/',       // "/" ⇒ Explore Bonoriya gateway landing page
      home:    '/home',
      admin:   window.location.pathname,
    };
    const path = map[currentPage] ?? `/${currentPage}`;
    const already = window.location.pathname;
    const isEntityRoute = /^\/(properties|day-trips|destinations)\/[^/]+/.test(already);
    if (!isEntityRoute && already !== path) {
      window.history.pushState({}, '', path);
    }
  }, [currentPage, urlSyncReady]);

  // ── SEO: update all head tags + analytics on every page change ──────────────
  useEffect(() => {
    // Determine which page key to use (admin login vs admin dashboard both use 'admin')
    const pageKey = currentPage === 'admin' ? 'admin'
      : isPartnerLoggedIn ? 'partner-login'
      : currentPage;

    // Parse URL for dynamic entity routes: /properties/:slug, /day-trips/:slug, /destinations/:slug
    const route = parseRoute();
    let dynamicHandled = false;

    if (route.entityType === 'property' && route.slug) {
      // Async lookup: fetch fresh partner list from Supabase to guarantee data
      dynamicHandled = true;
      (async () => {
        try {
          const { supabase } = await import('./utils/db');
          const { mapDbProperty } = await import('./utils/auth');
          const { data } = await supabase.from('partner_properties').select('*').eq('active', true);
          const list = (data || []).map(mapDbProperty);
          const bonoriya = getBonoriyaPropertyData();
          const bonoriyaAsPartner: PartnerProperty = {
            id: 'bonoriya-own', partnerId: 'bonoriya', partnerName: 'BONORIYA',
            partnerEmail: bonoriya.contactEmail, name: bonoriya.name, location: bonoriya.location,
            description: bonoriya.aboutUs || bonoriya.shortDescription, price: bonoriya.priceRange,
            pricePerNight: 1500, type: 'Bonoriya Own', image: bonoriya.heroImage,
            rating: bonoriya.rating, rooms: 6, maxGuests: 20,
            amenities: bonoriya.highlights || [], createdAt: bonoriya.updatedAt, active: true,
          };
          const found = [bonoriyaAsPartner, ...list].find(p => propertySlug(p) === route.slug);
          if (found) applyPropertySEO(found);
          else applySEO(pageKey);
        } catch {
          applySEO(pageKey);
        }
      })();
    } else if (route.entityType === 'day-trip' && route.slug) {
      dynamicHandled = true;
      getActiveDayTripProperties().then(list => {
        const dt = list.find(d => propertySlug({ id: d.id, name: d.name }) === route.slug);
        if (dt) applyDayTripSEO(dt);
        else applySEO(pageKey);
      }).catch(() => applySEO(pageKey));
    } else if (route.entityType === 'destination' && route.slug) {
      const stateNames: Record<string, { name: string; desc: string; attractions: string[] }> = {
        'assam': { name: 'Assam', desc: 'Assam — the gateway to Northeast India. Book stays near Kamakhya Temple, Kaziranga National Park, Majuli island, tea estates and the mighty Brahmaputra.', attractions: ['Kamakhya Temple', 'Kaziranga National Park', 'Majuli', 'Manas National Park', 'Chandubi', 'Pobitora'] },
        'meghalaya': { name: 'Meghalaya', desc: 'Meghalaya — the abode of clouds. Discover Shillong, Cherrapunji, Dawki, Mawlynnong and the living root bridges. Book eco resorts and homestays with BONORIYA.', attractions: ['Shillong', 'Cherrapunji', 'Dawki', 'Mawlynnong', 'Living Root Bridge', 'Nohkalikai Falls', 'Jimbrigaon'] },
        'arunachal-pradesh': { name: 'Arunachal Pradesh', desc: 'Arunachal Pradesh — India\'s land of the dawn-lit mountains. Explore Tawang, Dirang, Shergaon, Anini and Ziro Valley. Book high-altitude homestays with BONORIYA.', attractions: ['Tawang Monastery', 'Sela Pass', 'Dirang Valley', 'Shergaon', 'Ziro Valley', 'Anini'] },
        'nagaland': { name: 'Nagaland', desc: 'Nagaland — Land of festivals. Experience Hornbill Festival, tribal villages of Kohima, Mokokchung and Longwa. Book cultural homestays with BONORIYA.', attractions: ['Kohima', 'Hornbill Festival', 'Dzukou Valley', 'Longwa Village', 'Mokokchung'] },
        'manipur': { name: 'Manipur', desc: 'Manipur — jewel of India. Explore Imphal, Loktak Lake, Kangla Fort and Ima Keithel. Book heritage homestays with BONORIYA.', attractions: ['Loktak Lake', 'Kangla Fort', 'Ima Keithel', 'Keibul Lamjao National Park'] },
        'mizoram': { name: 'Mizoram', desc: 'Mizoram — rolling blue hills. Discover Aizawl, Reiek Peak, Champhai and Vantawng Falls. Book authentic Mizo homestays with BONORIYA.', attractions: ['Aizawl', 'Reiek Peak', 'Champhai', 'Vantawng Falls'] },
        'tripura': { name: 'Tripura', desc: 'Tripura — heritage kingdoms of Northeast India. Visit Ujjayanta Palace, Neermahal and Unakoti rock carvings.', attractions: ['Ujjayanta Palace', 'Neermahal', 'Unakoti', 'Tripura Sundari Temple'] },
        'sikkim': { name: 'Sikkim', desc: 'Sikkim — snow-capped Himalayan gem. Explore Gangtok, Tsomgo Lake, Nathula Pass and Yumthang Valley. Book mountain view stays with BONORIYA.', attractions: ['Gangtok', 'Tsomgo Lake', 'Nathula Pass', 'Yumthang Valley', 'Pelling'] },
      };
      const meta = stateNames[route.slug];
      const approved = getApprovedPartnerProperties();
      if (meta) {
        applyDestinationSEO({
          slug: route.slug, name: meta.name, state: meta.name,
          description: meta.desc, attractions: meta.attractions,
          bestTimeToVisit: 'October to April',
          nearbyProperties: approved.filter(p => p.location.toLowerCase().includes(meta.name.toLowerCase())),
        });
        dynamicHandled = true;
      }
    }

    // Fall back to static page SEO if no dynamic handler matched
    if (!dynamicHandled) {
      applySEO(pageKey);
    }

    // Auto-enrich image alt / title / loading attributes for SEO
    setTimeout(() => enrichImageAttrs(), 100);
    setTimeout(() => enrichImageAttrs(), 800);
    setTimeout(() => enrichImageAttrs(), 2000);

    // Favicon — use dedicated BONORIYA favicon (black bg + yellow "B")
    // The entrypoint already injects the public/ file links on first load.
    // This keeps them in sync after React hydration / page navigation.
    const faviconSrc = bonoriyaFavicon as unknown as string;
    (['icon', 'shortcut icon'] as const).forEach(rel => {
      let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!el) { el = document.createElement('link'); el.rel = rel; document.head.appendChild(el); }
      el.href = faviconSrc;
      el.type = 'image/png';
    });

    let appleIcon = document.querySelector('link[rel="apple-touch-icon"]') as HTMLLinkElement;
    if (!appleIcon) { appleIcon = document.createElement('link'); appleIcon.rel = 'apple-touch-icon'; document.head.appendChild(appleIcon); }
    appleIcon.href = faviconSrc;
    appleIcon.setAttribute('sizes', '180x180');
  }, [currentPage, isPartnerLoggedIn]);

  // Check if current URL is admin route
  useEffect(() => {
    const route = parseRoute();
    if (window.location.pathname === '/admin' || route.page === 'admin') {
      setCurrentPage('admin');
    } else if (route.page && !['partner-login'].includes(route.page)) {
      // Map URL page slug → internal state so deep links work.
      // "/" ⇒ 'gateway' (Explore Bonoriya), "/home" ⇒ 'home'.
      setCurrentPage(route.page);
    }
    // Enable URL push sync only AFTER initial URL is parsed so we don't
    // overwrite deep links (e.g., /properties/:slug) with the default page.
    setUrlSyncReady(true);

    // Listen for browser back/forward to sync state
    const onPop = () => {
      const r = parseRoute();
      setCurrentPage(r.page === 'admin' ? 'admin' : r.page || 'gateway');
    };
    window.addEventListener('popstate', onPop);

    // Auto-enrich image alt/title attributes on any DOM mutation (SEO)
    observeImageAttrs();

    // Check app version on startup — clears stale UI caches if version changed
    checkAndUpdateVersion();

    // Hydrate app data from Supabase (replaces localStorage as source of truth)
    initSupabase().catch(e => console.warn('[App] Supabase hydration failed:', e));

    // Handle ?bonoriya_import= URL param for cross-device data transfer
    const params = new URLSearchParams(window.location.search);
    const importParam = params.get('bonoriya_import');
    if (importParam) {
      try {
        const decoded = decodeURIComponent(importParam);
        const data = JSON.parse(decodeURIComponent(escape(atob(decoded))));
        const count = importAppData(data);
        if (count > 0) {
          const clean = window.location.href.replace(/[?&]bonoriya_import=[^&]*/, '').replace(/[?&]$/, '');
          window.history.replaceState({}, '', clean);
          window.location.reload();
        }
      } catch (e) {
        console.warn('[BONORIYA] Failed to process import URL param:', e);
      }
    }
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const handleLogout = () => {
    setIsSignedIn(false);
    setCurrentGuest(null);
    setCurrentPage('home');
  };

  const handlePartnerLogout = () => {
    setIsPartnerLoggedIn(false);
    setCurrentPage('home');
  };

  // Admin page doesn't need header/footer
  if (currentPage === 'admin') {
    return (
      <>
        <AdminLogin isAdminLoggedIn={isAdminLoggedIn} setIsAdminLoggedIn={setIsAdminLoggedIn} />
        <BonoriyaAI setCurrentPage={handleSetCurrentPage} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* SEO: Noscript content for crawlers */}
      <noscript>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <h1>BONORIYA – Northeast India's Premium Platform for Offbeat Stays & Prefab Solutions</h1>
          <p>Book resorts, hotels and homestays across Northeast India with Bonoriya. Also explore prefab cottages, modular resorts and custom structures in Assam.</p>
          <p>Services: Book Stays | Prefab Structures | Our Properties | Partner Login | Contact Us | Blogs</p>
          <p>Phone: +91-9864282966 | Email: info@bonoriya.com</p>
          <p>Please enable JavaScript to use the full functionality of this site.</p>
        </div>
      </noscript>

      {/* ── Navigation ── */}
      <nav className="sticky top-0 z-50 bg-forest-900/97 backdrop-blur-md border-b border-white/8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-[72px]">

            {/* Logo */}
            <button onClick={() => handleSetCurrentPage('gateway')} className="flex-shrink-0 flex items-center">
              <ImageWithFallback src={bonoriyaLogo} alt="BONORIYA" className="h-16 object-contain cursor-pointer hover:opacity-85 transition-opacity duration-200" />
            </button>

            {/* Desktop nav — centre cluster */}
            <div className="hidden lg:flex items-center gap-1">
              {([
                ['home',           'Home'],
                ['book-stays',     'Book Stays'],
                ['prefab',         'Prefab'],
                ['our-properties', 'Properties'],
                ['blogs',          'Journal'],
                ['gateway',        'Explore'],
              ] as [string, string][]).map(([page, label]) => (
                <button
                  key={page}
                  onClick={() => handleSetCurrentPage(page)}
                  className={`px-3.5 py-2 text-sm tracking-wide rounded-md transition-all duration-200 ${
                    currentPage === page
                      ? 'text-brand-gold'
                      : 'text-white/65 hover:text-white hover:bg-white/6'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Right cluster */}
            <div className="hidden lg:flex items-center gap-3">
              <button
                onClick={() => handleSetCurrentPage('partner-login')}
                className={`px-3.5 py-2 text-sm tracking-wide rounded-md transition-all duration-200 ${
                  currentPage === 'partner-login' ? 'text-brand-gold' : 'text-white/65 hover:text-white hover:bg-white/6'
                }`}
              >
                Partner
              </button>
              <button
                onClick={() => handleSetCurrentPage('contact')}
                className={`px-3.5 py-2 text-sm tracking-wide rounded-md transition-all duration-200 ${
                  currentPage === 'contact' ? 'text-brand-gold' : 'text-white/65 hover:text-white hover:bg-white/6'
                }`}
              >
                Contact
              </button>
              <button
                onClick={() => handleSetCurrentPage('book-stays')}
                className="ml-1 px-5 py-2 bg-brand-gold text-forest-900 text-sm font-semibold rounded-full hover:bg-amber-400 transition-colors duration-200"
              >
                Book Now
              </button>
              {isSignedIn && (
                <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-2 text-white/60 hover:text-white text-sm transition-colors">
                  <LogOut className="h-3.5 w-3.5" /> Out
                </button>
              )}
              {isPartnerLoggedIn && (
                <button onClick={handlePartnerLogout} className="flex items-center gap-1.5 px-3 py-2 text-white/60 hover:text-white text-sm transition-colors">
                  <LogOut className="h-3.5 w-3.5" /> Sign Out
                </button>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-white/80 hover:text-white transition-colors"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-white/8 bg-forest-900">
            <div className="px-5 py-5 space-y-1">
              {([
                ['home',           'Home'],
                ['book-stays',     'Book Stays'],
                ['prefab',         'Prefab Structure'],
                ['our-properties', 'Our Properties'],
                ['partner-login',  'Partner Login'],
                ['contact',        'Contact Us'],
                ['blogs',          'Journal / Blogs'],
                ['gateway',        'Explore Bonoriya'],
              ] as [string, string][]).map(([page, label]) => (
                <button
                  key={page}
                  onClick={() => { handleSetCurrentPage(page); setMobileMenuOpen(false); }}
                  className={`flex items-center w-full text-left px-3 py-3 rounded-lg text-sm tracking-wide transition-all duration-150 ${
                    currentPage === page
                      ? 'text-brand-gold bg-white/5 border-l-2 border-brand-gold pl-4'
                      : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {label}
                </button>
              ))}
              {(isSignedIn || isPartnerLoggedIn) && (
                <div className="pt-2 border-t border-white/10 mt-2">
                  {isSignedIn && (
                    <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="flex items-center gap-2 w-full text-left px-3 py-3 text-white/60 hover:text-white text-sm">
                      <LogOut className="h-4 w-4" /> Logout
                    </button>
                  )}
                  {isPartnerLoggedIn && (
                    <button onClick={() => { handlePartnerLogout(); setMobileMenuOpen(false); }} className="flex items-center gap-2 w-full text-left px-3 py-3 text-white/60 hover:text-white text-sm">
                      <LogOut className="h-4 w-4" /> Partner Logout
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Page Content */}
      {currentPage === 'book-stays' ? (
        <BookStays
          isSignedIn={isSignedIn}
          setIsSignedIn={setIsSignedIn}
          setCurrentPage={handleSetCurrentPage}
          initialSearchParams={searchParams}
          currentGuest={currentGuest}
          setCurrentGuest={setCurrentGuest}
        />
      ) : currentPage === 'partner-login' ? (
        <PartnerLogin
          isPartnerLoggedIn={isPartnerLoggedIn}
          setIsPartnerLoggedIn={setIsPartnerLoggedIn}
          setCurrentPage={handleSetCurrentPage}
        />
      ) : currentPage === 'contact' ? (
        <>
          <ContactUs />
          <Footer setCurrentPage={handleSetCurrentPage} />
        </>
      ) : currentPage === 'blogs' ? (
        <>
          <Blogs setCurrentPage={handleSetCurrentPage} />
          <Footer setCurrentPage={handleSetCurrentPage} />
        </>
      ) : currentPage === 'our-properties' ? (
        <>
          <OurProperties setCurrentPage={handleSetCurrentPage} />
          <Footer setCurrentPage={handleSetCurrentPage} />
        </>
      ) : currentPage === 'day-trip' ? (
        <>
          <DayTripBooking onBack={() => setCurrentPage('home')} />
          <Footer setCurrentPage={handleSetCurrentPage} />
        </>
      ) : currentPage === 'prefab' ? (
        <>
          <PrefabStructure setCurrentPage={handleSetCurrentPage} section={currentSection} />
          <Footer setCurrentPage={handleSetCurrentPage} />
        </>
      ) : currentPage === 'destinations' ? (
        <>
          <Destinations />
          <Footer setCurrentPage={handleSetCurrentPage} />
        </>
      ) : currentPage === 'gateway' ? (
        <>
          <GatewayPage setCurrentPage={handleSetCurrentPage} />
          <Footer setCurrentPage={handleSetCurrentPage} />
        </>
      ) : (
        <>
          {/* ── HERO ── */}
          <section id="home" className="relative min-h-[92vh] overflow-hidden flex items-end">
            {/* Background image */}
            <div className="absolute inset-0">
              <ImageWithFallback
                src={heroImage}
                alt="Northeast India — BONORIYA"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/30 to-black/75" />
            </div>

            {/* Floating editorial content */}
            <div className="relative w-full pb-20 pt-32">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="max-w-3xl">
                  {/* Eyebrow */}
                  <p className="text-white/60 text-xs tracking-[0.25em] uppercase mb-6 font-body">
                    Northeast India &nbsp;·&nbsp; Offbeat Stays &nbsp;·&nbsp; Prefab Cottages
                  </p>
                  {/* Headline */}
                  <h1 className="text-white text-5xl sm:text-6xl lg:text-7xl mb-6 leading-[1.05]" style={{fontFamily: 'var(--font-display)', fontWeight: 400}}>
                    Where wildness<br />
                    <em className="italic">meets comfort.</em>
                  </h1>
                  <p className="text-white/75 text-lg sm:text-xl mb-10 max-w-xl leading-relaxed font-body font-light">
                    Curated offbeat stays, eco resorts, and day trips across Assam, Meghalaya &amp; the Northeast — plus India's finest prefab cottage manufacturer.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <button
                      onClick={() => handleSetCurrentPage('book-stays')}
                      className="px-7 py-3.5 bg-brand-gold text-forest-900 text-sm font-semibold rounded-full hover:bg-amber-400 transition-all duration-200 shadow-lg"
                    >
                      Explore Stays
                    </button>
                    <button
                      onClick={() => handleSetCurrentPage('prefab')}
                      className="px-7 py-3.5 border border-white/40 text-white text-sm font-medium rounded-full hover:bg-white/10 backdrop-blur-sm transition-all duration-200"
                    >
                      View Prefab Designs
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Scroll cue */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 opacity-50">
              <div className="w-px h-10 bg-white animate-pulse" />
              <span className="text-white text-[10px] tracking-widest uppercase font-body">Scroll</span>
            </div>
          </section>

          {/* ── SEARCH PANEL ── */}
          <section className="relative z-10 -mt-1 bg-white border-b border-border shadow-sm">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <form
                onSubmit={(e) => { e.preventDefault(); handleSetCurrentPage('book-stays'); }}
                className="flex flex-col lg:flex-row items-end gap-4"
              >
                {/* Location */}
                <div className="flex-1 min-w-0 w-full lg:w-auto">
                  <label className="block text-xs tracking-wide uppercase text-muted-foreground mb-1.5 font-body">Destination</label>
                  <LocationAutocomplete
                    value={searchParams.location}
                    onChange={(value, placeDetails) => setSearchParams({ ...searchParams, location: value, coordinates: placeDetails ? { lat: placeDetails.lat, lng: placeDetails.lng } : { lat: 0, lng: 0 } })}
                    placeholder="Where to?"
                    className="bg-secondary border-border"
                  />
                </div>
                {/* Check-in */}
                <div className="w-full lg:w-44">
                  <label className="block text-xs tracking-wide uppercase text-muted-foreground mb-1.5 font-body">Check-in</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <input type="date" className="w-full pl-9 pr-3 py-2.5 bg-secondary rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      value={searchParams.checkIn} onChange={e => setSearchParams({ ...searchParams, checkIn: e.target.value })} min={new Date().toISOString().split('T')[0]} />
                  </div>
                </div>
                {/* Check-out */}
                <div className="w-full lg:w-44">
                  <label className="block text-xs tracking-wide uppercase text-muted-foreground mb-1.5 font-body">Check-out</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                    <input type="date" className="w-full pl-9 pr-3 py-2.5 bg-secondary rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      value={searchParams.checkOut} onChange={e => setSearchParams({ ...searchParams, checkOut: e.target.value })} min={searchParams.checkIn || new Date().toISOString().split('T')[0]} />
                  </div>
                </div>
                {/* Guests */}
                <div className="w-full lg:w-36">
                  <label className="block text-xs tracking-wide uppercase text-muted-foreground mb-1.5 font-body">Guests</label>
                  <div className="flex items-center gap-2 px-3 py-2.5 bg-secondary rounded-lg border border-border">
                    <Users className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex items-center gap-2 flex-1">
                      <button type="button" onClick={() => setSearchParams(p => ({ ...p, adults: Math.max(1, p.adults - 1) }))} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground"><Minus className="h-3 w-3" /></button>
                      <span className="text-sm w-4 text-center">{searchParams.adults + searchParams.children}</span>
                      <button type="button" onClick={() => setSearchParams(p => ({ ...p, adults: p.adults + 1 }))} className="w-5 h-5 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground"><Plus className="h-3 w-3" /></button>
                    </div>
                  </div>
                </div>
                {/* Search */}
                <button type="submit" className="w-full lg:w-auto px-8 py-2.5 bg-forest-900 text-white text-sm font-medium rounded-lg hover:bg-forest-900/85 transition-colors flex items-center justify-center gap-2 flex-shrink-0">
                  <Search className="h-4 w-4" />
                  Search
                </button>
              </form>
            </div>
          </section>

          {/* ── BRAND STATEMENT ── */}
          <section className="py-20 bg-background">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-5 font-body">Est. Northeast India</p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl text-foreground leading-tight mb-6" style={{fontFamily: 'var(--font-display)'}}>
                BONORIYA is more than travel.<br />
                <em className="italic text-muted-foreground">It is a sense of place.</em>
              </h2>
              <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-2xl mx-auto mb-10 font-body font-light">
                We connect curious travellers with the Northeast's untouched corners, while empowering local entrepreneurs to build lasting hospitality ventures through our prefab cottage manufacturing and land development expertise.
              </p>
              <div className="flex flex-wrap justify-center gap-8 text-center">
                {[['50+', 'Partner Properties'], ['8', 'Northeast States'], ['100%', 'Verified Stays'], ['10+', 'Prefab Designs']].map(([n, l]) => (
                  <div key={l}>
                    <p className="text-3xl font-light text-forest-900 mb-1" style={{fontFamily: 'var(--font-display)'}}>{n}</p>
                    <p className="text-xs tracking-wide uppercase text-muted-foreground font-body">{l}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── WHAT WE OFFER ── editorial 2-col ── */}
          <section className="py-20 bg-secondary">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="mb-12">
                <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-3 font-body">Our Services</p>
                <h2 className="text-3xl sm:text-4xl text-foreground" style={{fontFamily: 'var(--font-display)'}}>Two worlds, one vision.</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Tourism */}
                <div
                  onClick={() => handleSetCurrentPage('book-stays')}
                  className="group relative overflow-hidden rounded-2xl cursor-pointer bg-card border border-border hover:shadow-xl transition-all duration-300"
                >
                  <div className="relative h-72 overflow-hidden">
                    <ImageWithFallback
                      src={offBeatTourismImage}
                      alt="Off-beat Tourism Northeast India — Mawlynnong Living Root Bridge"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <span className="absolute top-4 left-4 px-3 py-1 bg-forest-900/80 backdrop-blur-sm text-white text-xs tracking-widest uppercase rounded-full font-body">Travel & Stays</span>
                  </div>
                  <div className="p-7">
                    <h3 className="text-2xl mb-3 text-foreground" style={{fontFamily: 'var(--font-display)'}}>Off-Beat Tourism</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-5 font-body">Pristine valleys, untouched mountains, and authentic cultural experiences curated across eight states of Northeast India. Every stay is personally verified.</p>
                    <span className="inline-flex items-center gap-2 text-forest-900 text-sm font-medium group-hover:gap-3 transition-all duration-200 font-body">
                      Explore Stays <span className="text-brand-gold">→</span>
                    </span>
                  </div>
                </div>
                {/* Prefab */}
                <div
                  onClick={() => handleSetCurrentPage('prefab')}
                  className="group relative overflow-hidden rounded-2xl cursor-pointer bg-card border border-border hover:shadow-xl transition-all duration-300"
                >
                  <div className="relative h-72 overflow-hidden bg-muted">
                    {/* Primary: glamping pod fills the card */}
                    <ImageWithFallback
                      src={glampingPodCottage}
                      alt="BONORIYA Glamping Pod — Prefabricated Cottage"
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                    />
                    {/* Small inset thumbnails — A-frame + barnhouse */}
                    <div className="absolute bottom-3 right-3 flex gap-1.5">
                      <div className="w-16 h-11 rounded-lg overflow-hidden border-2 border-white/60 shadow-md">
                        <ImageWithFallback src={aFrame1BHK} alt="A-Frame 1BHK" className="w-full h-full object-cover" />
                      </div>
                      <div className="w-16 h-11 rounded-lg overflow-hidden border-2 border-white/60 shadow-md">
                        <ImageWithFallback src={barnhouseGroundFloor} alt="Barnhouse 1BHK" className="w-full h-full object-cover" />
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                    <span className="absolute top-4 left-4 px-3 py-1 bg-forest-900/80 backdrop-blur-sm text-white text-xs tracking-widest uppercase rounded-full font-body">Construction</span>
                  </div>
                  <div className="p-7">
                    <h3 className="text-2xl mb-3 text-foreground" style={{fontFamily: 'var(--font-display)'}}>Prefabricated Cottages</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed mb-5 font-body">Modern, sustainable, and beautifully crafted prefab homes and resort structures. From glamping pods to A-frame villas — designed for any terrain.</p>
                    <span className="inline-flex items-center gap-2 text-forest-900 text-sm font-medium group-hover:gap-3 transition-all duration-200 font-body">
                      View Designs <span className="text-brand-gold">→</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── ABOUT ── asymmetric 2-col ── */}
          <section className="py-20 bg-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
                <div className="relative">
                  <ImageWithFallback
                    src={aboutSectionImage}
                    alt="Beyond Just a Journey — BONORIYA Northeast India"
                    className="w-full h-[480px] object-cover rounded-2xl"
                  />
                  {/* Floating accent card */}
                  <div className="absolute -bottom-6 -right-4 hidden lg:block bg-forest-900 text-white p-6 rounded-xl shadow-xl max-w-[200px]">
                    <p className="text-brand-gold text-2xl font-light mb-1" style={{fontFamily: 'var(--font-display)'}}>2020</p>
                    <p className="text-white/70 text-xs tracking-wide uppercase font-body">Est. in Assam</p>
                  </div>
                </div>
                <div className="lg:pl-4">
                  <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-4 font-body">About BONORIYA</p>
                  <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-6 text-foreground" style={{fontFamily: 'var(--font-display)'}}>
                    Beyond<br />just a journey.
                  </h2>
                  <p className="text-muted-foreground leading-relaxed mb-4 font-body">
                    BONORIYA is a multidisciplinary team committed to transforming Northeast India's hospitality landscape — connecting travellers with the region's untouched beauty while empowering local entrepreneurs to build lasting ventures.
                  </p>
                  <p className="text-muted-foreground leading-relaxed mb-8 font-body">
                    Our expertise spans prefabricated cottage design, landscape consultation, and end-to-end project development — ensuring every space we build is both economically viable and environmentally conscious.
                  </p>
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    {[['Tourism Experiences', 'Authentic off-beat destinations'], ['Prefab Solutions', 'Sustainable cottage design'], ['Partnerships', 'Collaborative development'], ['Consultation', 'Landscape & site planning']].map(([h, d]) => (
                      <div key={h} className="p-4 bg-secondary rounded-xl border border-border">
                        <h4 className="text-sm font-medium mb-1 text-foreground font-body">{h}</h4>
                        <p className="text-xs text-muted-foreground font-body">{d}</p>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => handleSetCurrentPage('partner-login')}
                    className="px-7 py-3 bg-forest-900 text-white text-sm font-medium rounded-full hover:bg-forest-900/85 transition-colors font-body"
                  >
                    Partner With Us
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* ── FEATURED PROPERTIES ── */}
          <section id="properties" className="py-20 bg-secondary">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-end justify-between mb-10">
                <div>
                  <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-3 font-body">Handpicked Stays</p>
                  <h2 className="text-3xl sm:text-4xl text-foreground" style={{fontFamily: 'var(--font-display)'}}>Featured properties.</h2>
                </div>
                <button onClick={() => handleSetCurrentPage('our-properties')} className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-body">
                  View all <span className="text-brand-gold">→</span>
                </button>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                {/* BONORIYA Own day trip */}
                <div
                  onClick={() => handleSetCurrentPage('day-trip')}
                  className="group bg-card rounded-2xl overflow-hidden border border-border hover:shadow-xl cursor-pointer transition-all duration-300"
                >
                  <div className="relative h-52 overflow-hidden bg-muted">
                    <ImageWithFallback
                      src={bonoriyaOwnData.heroImage}
                      alt={bonoriyaOwnData.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="px-2.5 py-1 bg-forest-900/90 text-brand-gold text-[10px] tracking-widest uppercase rounded-full font-body backdrop-blur-sm">Day Trip</span>
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg mb-1.5 text-foreground" style={{fontFamily: 'var(--font-display)'}}>{bonoriyaOwnData.name}</h3>
                    <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1 font-body"><MapPin className="h-3 w-3 flex-shrink-0" />{bonoriyaOwnData.location}</p>
                    <p className="text-muted-foreground text-sm mb-4 line-clamp-2 leading-relaxed font-body">{bonoriyaOwnData.shortDescription}</p>
                    <span className="inline-flex items-center gap-1.5 text-forest-900 text-sm font-medium group-hover:gap-2.5 transition-all font-body">
                      Book Trip <span className="text-brand-gold">→</span>
                    </span>
                  </div>
                </div>

                {featuredPartnerProps.length > 0 ? (
                  featuredPartnerProps.map(prop => {
                    const partnerData = loadPartnerPropertyData(prop.partnerId);
                    const imgs = partnerData?.images ?? [];
                    const mainImg = imgs.find(i => i.isMainImage)?.url || imgs[0]?.url || prop.image
                      || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80';
                    return (
                      <div key={prop.id} onClick={() => handleSetCurrentPage('book-stays')}
                        className="group bg-card rounded-2xl overflow-hidden border border-border hover:shadow-xl cursor-pointer transition-all duration-300">
                        <div className="relative h-52 overflow-hidden bg-muted">
                          <ImageWithFallback src={mainImg} alt={prop.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                          {parseFloat(prop.rating) > 0 && (
                            <div className="absolute top-3 right-3">
                              <span className="px-2.5 py-1 bg-black/60 text-white text-[10px] tracking-wide rounded-full font-body backdrop-blur-sm">★ {prop.rating}</span>
                            </div>
                          )}
                        </div>
                        <div className="p-5">
                          <h3 className="text-lg mb-1.5 text-foreground" style={{fontFamily: 'var(--font-display)'}}>{prop.name}</h3>
                          <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1 font-body"><MapPin className="h-3 w-3 flex-shrink-0" />{prop.location}</p>
                          <p className="text-muted-foreground text-sm mb-4 line-clamp-2 leading-relaxed font-body">{prop.description}</p>
                          <span className="inline-flex items-center gap-1.5 text-forest-900 text-sm font-medium group-hover:gap-2.5 transition-all font-body">
                            Book Stay <span className="text-brand-gold">→</span>
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  [0, 1].map(i => (
                    <div key={i} className="bg-card rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center min-h-[320px] p-8 text-center">
                      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mb-4"><Building2 className="h-6 w-6 text-muted-foreground" /></div>
                      <p className="text-sm font-medium text-muted-foreground mb-2 font-body">Coming Soon</p>
                      <p className="text-xs text-muted-foreground mb-4 font-body">Partner properties will appear here once approved.</p>
                      <button onClick={() => handleSetCurrentPage('partner-login')} className="text-forest-900 hover:underline text-sm font-body">List Your Property →</button>
                    </div>
                  ))
                )}
              </div>
              <div className="text-center mt-8 sm:hidden">
                <button onClick={() => handleSetCurrentPage('our-properties')} className="px-6 py-2.5 border border-border rounded-full text-sm text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors font-body">
                  View All Properties
                </button>
              </div>
            </div>
          </section>

          {/* ── PREFAB STRUCTURES ── dark section ── */}
          <section id="prefab" className="py-20 bg-forest-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-end justify-between mb-10">
                <div>
                  <p className="text-xs tracking-[0.2em] uppercase text-white/40 mb-3 font-body">Manufacturing</p>
                  <h2 className="text-3xl sm:text-4xl text-white" style={{fontFamily: 'var(--font-display)'}}>Prefabricated structures.</h2>
                </div>
                <button onClick={() => handleSetCurrentPage('prefab')} className="hidden sm:flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors font-body">
                  All designs <span className="text-brand-gold">→</span>
                </button>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {[
                  { image: glampingPodCottage, title: 'Glamping Pod', tag: 'Studio', desc: 'Single room luxury pod — perfect for glamping sites and romantic retreats.' },
                  { image: barnhouseGroundFloor, title: '1 BHK Barnhouse', tag: '1 Bedroom', desc: 'Eco-friendly barnhouse with quick installation — blend with any landscape.' },
                  { image: aFrame1BHK, title: 'A-Frame Cottage', tag: '1 Bedroom', desc: 'Iconic A-frame silhouette, weather-resistant and exceptionally photogenic.' },
                ].map((s, i) => (
                  <div key={i} className="group bg-white/5 rounded-2xl overflow-hidden border border-white/8 hover:border-white/20 hover:bg-white/8 transition-all duration-300">
                    <div className="relative h-52 overflow-hidden bg-white/5">
                      <ImageWithFallback src={s.image} alt={s.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      <span className="absolute top-3 left-3 px-2.5 py-1 bg-black/50 backdrop-blur-sm text-white/80 text-[10px] tracking-widest uppercase rounded-full font-body">{s.tag}</span>
                    </div>
                    <div className="p-5">
                      <h3 className="text-lg text-white mb-2" style={{fontFamily: 'var(--font-display)'}}>{s.title}</h3>
                      <p className="text-white/50 text-sm mb-5 leading-relaxed font-body">{s.desc}</p>
                      <button
                        onClick={() => handleSetCurrentPage('prefab')}
                        className="w-full py-2.5 border border-white/20 text-white/80 text-sm rounded-lg hover:border-brand-gold hover:text-brand-gold transition-all duration-200 font-body"
                      >
                        Request Quote
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── WHY BONORIYA ── minimal strip ── */}
          <section className="py-20 bg-background border-y border-border">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-14">
                <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-3 font-body">Our Promise</p>
                <h2 className="text-3xl sm:text-4xl text-foreground" style={{fontFamily: 'var(--font-display)'}}>Why choose BONORIYA.</h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                  { icon: MapPin, title: 'Unique Locations', desc: 'Hand-selected off-beat destinations verified by our team on the ground.' },
                  { icon: HomeIcon, title: 'Eco-Conscious', desc: 'Every property and structure is evaluated for environmental responsibility.' },
                  { icon: Building2, title: 'Custom Design', desc: 'Prefab structures tailored to your terrain, budget, and vision.' },
                  { icon: User, title: 'End-to-End', desc: 'From site selection to guest check-in — we manage the full journey.' },
                ].map((item, i) => (
                  <div key={i} className="text-center group">
                    <div className="inline-flex items-center justify-center w-14 h-14 bg-secondary border border-border rounded-2xl mb-5 group-hover:bg-forest-900 group-hover:border-forest-900 transition-all duration-300">
                      <item.icon className="h-6 w-6 text-forest-900 group-hover:text-white transition-colors duration-300" />
                    </div>
                    <h3 className="text-base font-medium mb-2 text-foreground font-body">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed font-body">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── CONTACT ── */}
          <section id="contact" className="py-20 bg-secondary">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
                <div>
                  <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-4 font-body">Get In Touch</p>
                  <h2 className="text-3xl sm:text-4xl text-foreground mb-6" style={{fontFamily: 'var(--font-display)'}}>
                    Let's build something<br /><em className="italic">beautiful together.</em>
                  </h2>
                  <p className="text-muted-foreground mb-10 leading-relaxed font-body">
                    Whether you're planning an offbeat escape, building an eco-resort, or interested in our prefab solutions — we're here to help.
                  </p>
                  <div className="space-y-5">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-forest-900/8 rounded-xl flex items-center justify-center flex-shrink-0"><Phone className="h-4 w-4 text-forest-900" /></div>
                      <div>
                        <p className="text-sm font-medium text-foreground mb-0.5 font-body">+91-9864282966 · +91-9435855559</p>
                        <p className="text-xs text-muted-foreground font-body">Available Mon–Sat, 9 AM – 6 PM</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-forest-900/8 rounded-xl flex items-center justify-center flex-shrink-0"><Mail className="h-4 w-4 text-forest-900" /></div>
                      <div>
                        <p className="text-sm font-medium text-foreground mb-0.5 font-body">info@bonoriya.com</p>
                        <p className="text-xs text-muted-foreground font-body">General inquiries &amp; bookings</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-forest-900/8 rounded-xl flex items-center justify-center flex-shrink-0"><MapPin className="h-4 w-4 text-forest-900" /></div>
                      <div>
                        <p className="text-sm font-medium text-foreground mb-0.5 font-body">Kamakhya Mandir Rd, Bhutnath, Guwahati-10, Assam</p>
                        <p className="text-xs text-muted-foreground font-body">Registered Office</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
                  <h3 className="text-xl mb-6 text-foreground" style={{fontFamily: 'var(--font-display)'}}>Send a message</h3>
                  <form className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-1.5 font-body">Name</label>
                        <input type="text" className="w-full px-4 py-2.5 bg-secondary rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring font-body" placeholder="Your name" />
                      </div>
                      <div>
                        <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-1.5 font-body">Email</label>
                        <input type="email" className="w-full px-4 py-2.5 bg-secondary rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring font-body" placeholder="your@email.com" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-1.5 font-body">Interest</label>
                      <select className="w-full px-4 py-2.5 bg-secondary rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring font-body">
                        <option>Tourism &amp; Stays</option>
                        <option>Prefab Structures</option>
                        <option>Partnership</option>
                        <option>Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wide text-muted-foreground mb-1.5 font-body">Message</label>
                      <textarea rows={4} className="w-full px-4 py-2.5 bg-secondary rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none font-body" placeholder="Tell us about your requirements..." />
                    </div>
                    <button type="submit" className="w-full py-3 bg-forest-900 text-white text-sm font-medium rounded-lg hover:bg-forest-900/85 transition-colors font-body">
                      Send Message
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </section>

          {/* ── FAQ ── */}
          <section className="py-20 bg-background" id="faq">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-10">
                <p className="text-xs tracking-[0.2em] uppercase text-muted-foreground mb-3 font-body">Help Centre</p>
                <h2 className="text-3xl sm:text-4xl text-foreground" style={{fontFamily: 'var(--font-display)'}}>Frequently asked questions.</h2>
              </div>
              <div className="divide-y divide-border">
                {([
                  ['What are the best offbeat stays in Northeast India?', 'BONORIYA curates the best offbeat stays across Northeast India — eco resorts in Meghalaya, riverside homestays in Assam, mountain retreats in Arunachal Pradesh, and unique cultural stays in Nagaland. Every property is verified for quality and authenticity.'],
                  ['What is the best day trip near Guwahati?', 'BONORIYA Agro Eco Tourism at Jimbrigaon, Halher, Meghalaya (≈50 km from Guwahati) is one of the best day trips near Guwahati — organic orange farm trek, waterfall hike, traditional Assamese cuisine and live Khasi folk music.'],
                  ['How do I book a homestay in Northeast India?', 'Visit Book Stays on BONORIYA, search by location or property name, select check-in/check-out dates and guests, then confirm instantly. Full payment is due at check-in — no advance required.'],
                  ['What are the best resorts in Assam?', 'BONORIYA lists verified eco stays, boutique resorts and partner properties in Assam — near Kaziranga National Park, Majuli island, tea estate country and the Brahmaputra riverbank.'],
                  ["What resorts are available in Meghalaya?", "BONORIYA lists eco resorts, boutique homestays and offbeat stays in Shillong, Cherrapunji, Mawlynnong (Asia's cleanest village), Dawki and the living root bridge areas of Meghalaya."],
                  ['Who is the best prefab cottage manufacturer in Assam?', 'BONORIYA is a leading prefabricated cottage manufacturer based in Assam, Northeast India. We design and build glamping pods, A-frame cottages, barnhouses, alpine villas and modular resort structures.'],
                  ['What is the cost of a prefabricated cottage in India?', 'BONORIYA prefab cottage costs vary by structure type, size and customisation. Contact +91-9864282966 for a free quote.'],
                  ['How can I list my property on BONORIYA?', 'Register as a BONORIYA Partner via Partner Login. Submit your property details for review. Once approved, your property will be listed and receive bookings. BONORIYA charges only 10% commission on successful bookings.'],
                ] as [string, string][]).map(([q, a], i) => (
                  <details key={i} className="group py-5">
                    <summary className="flex items-start justify-between cursor-pointer list-none gap-6">
                      <span className="font-medium text-foreground text-sm leading-relaxed font-body">{q}</span>
                      <span className="flex-shrink-0 w-5 h-5 rounded-full border border-border text-muted-foreground text-xs font-bold flex items-center justify-center group-open:rotate-45 transition-transform duration-200 mt-0.5">+</span>
                    </summary>
                    <div className="pt-3 pr-11">
                      <p className="text-sm text-muted-foreground leading-relaxed font-body">{a}</p>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </section>

          <Footer setCurrentPage={handleSetCurrentPage} />
        </>
      )}

      {/* Bonoriya AI — visible on all pages */}
      <BonoriyaAI setCurrentPage={handleSetCurrentPage} />
    </div>
  );
}