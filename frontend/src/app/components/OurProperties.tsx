import { useState, useEffect, useCallback } from 'react';
import { MapPin, Star, ExternalLink, Building2 } from 'lucide-react';
import heroImage from '../../imports/our-properties.png';
import DayTripBooking from './DayTripBooking';
import { ImageWithFallback } from './figma/ImageWithFallback';
import {
  getApprovedPartnerProperties, getBonoriyaPropertyData,
  getActiveDayTripProperties, mapDbProperty,
  type PartnerProperty,
} from '../utils/auth';

interface OurPropertiesProps {
  setCurrentPage: (page: string, section?: string) => void;
}

// ── Type badge config ─────────────────────────────────────────────────────────
const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  'Bonoriya Own': { label: 'BONORIYA OWN', cls: 'bg-primary text-primary-foreground' },
  'Associated':   { label: 'ASSOCIATED',   cls: 'bg-green-600 text-white' },
};

function getBadge(type: string) {
  return TYPE_BADGE[type] ?? TYPE_BADGE['Associated'];
}

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1568644559664-e4a5735c37ea?w=800&q=80',
  'https://images.unsplash.com/photo-1655314945875-6d09b1442b97?w=800&q=80',
  'https://images.unsplash.com/photo-1705851965750-8587a65d4fd1?w=800&q=80',
  'https://images.unsplash.com/photo-1660558870112-d776ba4b0157?w=800&q=80',
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
];

export default function OurProperties({ setCurrentPage }: OurPropertiesProps) {
  const [showDayTripBooking, setShowDayTripBooking] = useState(false);
  const [selectedDayTripId, setSelectedDayTripId] = useState<string | undefined>(undefined);
  const [partnerProperties, setPartnerProperties] = useState<PartnerProperty[]>([]);
  const [loadingPartners, setLoadingPartners] = useState(true);
  const [dayTripProperties, setDayTripProperties] = useState<import('../utils/auth').DayTripProperty[]>([]);
  const bonoriyaOwn = getBonoriyaPropertyData();

  // ── Load Day Trip Properties ─────────────────────────────────────────────────
  useEffect(() => {
    getActiveDayTripProperties().then(props => {
      const legacy = getBonoriyaPropertyData();
      const merged = props.map(p => ({
        ...p,
        heroImage:        p.heroImage   || legacy.heroImage   || '',
        gallery:          p.gallery?.length   ? p.gallery   : (legacy.gallery   || []),
        highlights:       p.highlights?.length ? p.highlights : (legacy.highlights || []),
        mealOptions:      p.mealOptions?.length ? p.mealOptions : (legacy.mealOptions || []),
        shortDescription: p.shortDescription || legacy.shortDescription || '',
        tagline:          p.tagline     || legacy.tagline     || '',
        rating:           p.rating      || legacy.rating      || '4.8',
        priceRange:       p.priceRange  || legacy.priceRange  || '₹1,000–1,500',
        contactPhone:     p.contactPhone || legacy.contactPhone || '',
        contactEmail:     p.contactEmail || legacy.contactEmail || '',
        howToReach:       p.howToReach  || legacy.howToReach  || '',
      }));
      setDayTripProperties(merged);
    });
  }, []);

  // ── Load Partner Properties (Supabase-first, with fallback + realtime) ───────
  const loadPartnerProperties = useCallback(async () => {
    try {
      const { supabase } = await import('../utils/db');

      // ── 1. Get ALL approved partner IDs ──────────────────────────────────────
      const { data: approvedPartners, error: pErr } = await supabase
        .from('partners')
        .select('id')
        .eq('approved', true)
        .eq('rejected', false);

      if (pErr) throw pErr;

      const approvedIds = (approvedPartners || []).map((p: any) => String(p.id));

      if (approvedIds.length === 0) {
        setPartnerProperties([]);
        setLoadingPartners(false);
        return;
      }

      // ── 2. Fetch ALL properties of approved partners ──────────────────────────
      // No active=true filter in query — treat active=null as visible.
      // Admin can explicitly deactivate (active=false) to hide.
      const { data: props, error: prErr } = await supabase
        .from('partner_properties')
        .select('*')
        .in('partner_id', approvedIds)
        .order('created_at', { ascending: false });

      if (prErr) throw prErr;

      // Filter: show if active is true OR null (never show active=false)
      const visible = (props || []).filter((p: any) => p.active !== false);

      // ── 3. Fetch main images from partner_property_data (partner-uploaded photos) ─
      // Partners set their main image via Partner Dashboard → Photos → Set as Main
      // This is stored as `image` on `partner_properties` after syncing, but
      // we also check `partner_property_data.images` for the isMainImage flag.
      const partnerIdsForImages = [...new Set(visible.map((p: any) => String(p.partner_id)))];
      let mainImageMap: Record<string, string> = {};

      if (partnerIdsForImages.length > 0) {
        try {
          const { data: imgData } = await supabase
            .from('partner_property_data')
            .select('partner_id, images')
            .in('partner_id', partnerIdsForImages);

          (imgData || []).forEach((row: any) => {
            const imgs: any[] = row.images || [];
            const main = imgs.find((i: any) => i.isMainImage) || imgs[0];
            if (main?.url) mainImageMap[String(row.partner_id)] = main.url;
          });
        } catch {
          // Image lookup is best-effort — don't fail the whole load
        }
      }

      // ── 4. Map rows → PartnerProperty, inject main image ─────────────────────
      const mapped: PartnerProperty[] = visible.map((row: any) => {
        const base = mapDbProperty(row);
        // Priority: partner_properties.image (admin-set) → partner_property_data main image → empty
        const image = base.image || mainImageMap[String(row.partner_id)] || '';
        return { ...base, image };
      });

      setPartnerProperties(mapped);
    } catch (e) {
      console.warn('[OurProperties] Partner properties load failed:', e);
      // Fallback to cached data
      const cached = getApprovedPartnerProperties();
      if (cached.length > 0) setPartnerProperties(cached);
    } finally {
      setLoadingPartners(false);
    }
  }, []);

  // Initial load
  useEffect(() => { loadPartnerProperties(); }, [loadPartnerProperties]);

  // ── Dynamic ItemList JSON-LD for SEO (updates as properties load) ──────────
  useEffect(() => {
    if (loadingPartners) return;
    import('../utils/seoDynamic').then(({ buildPropertyItemList, BASE_URL }) => {
      const list = buildPropertyItemList(
        partnerProperties,
        `${BASE_URL}/our-properties`,
        'BONORIYA Partner Properties — Northeast India'
      );
      document.querySelectorAll('script[data-seo-dynamic="itemlist"]').forEach(el => el.remove());
      const el = document.createElement('script');
      el.type = 'application/ld+json';
      el.setAttribute('data-seo-dynamic', 'itemlist');
      el.textContent = JSON.stringify(list);
      document.head.appendChild(el);
    });
  }, [partnerProperties, loadingPartners]);

  // ── Realtime subscriptions ────────────────────────────────────────────────────
  // Reload when: partner approved, property added/updated/deleted
  useEffect(() => {
    let channelA: any, channelB: any;

    import('../utils/db').then(({ supabase }) => {
      // Watch partners table — reload when approval status changes
      channelA = supabase
        .channel('our_properties_partners')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'partners' },
          () => { loadPartnerProperties(); })
        .subscribe();

      // Watch partner_properties table — reload when property added/updated/deleted
      channelB = supabase
        .channel('our_properties_props')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'partner_properties' },
          () => { loadPartnerProperties(); })
        .subscribe();
    });

    return () => {
      import('../utils/db').then(({ supabase }) => {
        if (channelA) supabase.removeChannel(channelA);
        if (channelB) supabase.removeChannel(channelB);
      });
    };
  }, [loadPartnerProperties]);

  if (showDayTripBooking) {
    return <DayTripBooking propertyId={selectedDayTripId} onBack={() => { setShowDayTripBooking(false); setSelectedDayTripId(undefined); }} />;
  }

  // ── Derived sets for rendering ────────────────────────────────────────────────
  const dayTripNames   = new Set(dayTripProperties.map(p => p.name.toLowerCase().trim()));
  const ownDayTripProps   = dayTripProperties.filter(p => p.propertyType !== 'associated');
  const assocDayTripProps = dayTripProperties.filter(p => p.propertyType === 'associated');
  const ownPartnerProps  = partnerProperties.filter(p => p.type === 'Bonoriya Own');
  // Associated: everything that isn't "Bonoriya Own" and doesn't duplicate a day trip
  const assocProps     = partnerProperties.filter(
    p => p.type !== 'Bonoriya Own' && !dayTripNames.has(p.name.toLowerCase().trim())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <div className="w-full bg-black">
        <ImageWithFallback src={heroImage} alt="Our Properties" className="w-full h-auto object-contain" />
      </div>

      {/* Intro */}
      <div className="bg-background py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl mb-4">Our Handpicked Stays</h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            From rolling tea estates to misty mountain peaks, discover properties that capture the soul of Northeast India
          </p>
        </div>
      </div>

      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* ── BONORIYA Own Properties ───────────────────────────────────────────
               Day trip properties + partner properties tagged as "Bonoriya Own" */}
          <div className="mb-16">
            <div className="mb-8">
              <h2 className="text-3xl mb-2">BONORIYA Own Properties</h2>
              <p className="text-muted-foreground">
                Curated and managed directly by BONORIYA for exceptional quality and service
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">

              {/* Day Trip Properties from day_trip_properties table (Bonoriya Own only) */}
              {(ownDayTripProps.length > 0 ? ownDayTripProps : (dayTripProperties.length === 0 ? [{
                id: '__legacy__',
                name: bonoriyaOwn.name,
                location: bonoriyaOwn.location,
                shortDescription: bonoriyaOwn.shortDescription,
                heroImage: bonoriyaOwn.heroImage,
                gallery: bonoriyaOwn.gallery,
                highlights: bonoriyaOwn.highlights,
                mealOptions: bonoriyaOwn.mealOptions,
                rating: bonoriyaOwn.rating,
                priceRange: bonoriyaOwn.priceRange,
                propertyType: 'bonoriya_own' as const,
                tagline: bonoriyaOwn.tagline,
                aboutUs: bonoriyaOwn.aboutUs,
                amenities: [] as string[],
                maxCapacityPerDay: bonoriyaOwn.maxCapacityPerDay,
                contactPhone: bonoriyaOwn.contactPhone,
                contactEmail: bonoriyaOwn.contactEmail,
                howToReach: bonoriyaOwn.howToReach,
                active: true, sortOrder: 0,
                lat: 25.5788, lng: 91.8933, mapAddress: '',
              }] : [])).map((prop, idx) => (
                <div key={prop.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer">
                  <div className="relative h-[200px] overflow-hidden">
                    <ImageWithFallback
                      src={prop.heroImage || FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length]}
                      alt={prop.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-3 right-3 bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">
                      BONORIYA OWN
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg mb-2">{prop.name}</h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                      <MapPin className="h-4 w-4" /><span>{prop.location}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{prop.shortDescription}</p>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-medium">{prop.rating}</span>
                      </div>
                      <div>
                        <span className="text-lg font-medium">{prop.priceRange}</span>
                        <span className="text-sm text-muted-foreground">/person</span>
                      </div>
                    </div>
                    {prop.maxCapacityPerDay > 0 && (
                      <p className="text-xs text-muted-foreground mb-3">Max {prop.maxCapacityPerDay} guests/day</p>
                    )}
                    <button
                      data-testid={`book-daytrip-btn-${prop.id}`}
                      onClick={() => { setSelectedDayTripId(String(prop.id)); setShowDayTripBooking(true); }}
                      className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
                    >
                      Book Your Day Trip
                    </button>
                  </div>
                </div>
              ))}

              {/* Partner properties explicitly tagged "Bonoriya Own" */}
              {ownPartnerProps.map((property, idx) => {
                const badge = getBadge(property.type);
                return (
                  <div key={property.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer">
                    <div className="relative h-[200px] overflow-hidden">
                      <ImageWithFallback
                        src={property.image || FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length]}
                        alt={property.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                      <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold ${badge.cls}`}>
                        {badge.label}
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="text-lg mb-2">{property.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                        <MapPin className="h-4 w-4" /><span>{property.location}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{property.description}</p>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-1">
                          {parseFloat(property.rating) > 0
                            ? <><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /><span className="text-sm font-medium">{property.rating}</span></>
                            : <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">New</span>}
                        </div>
                        <div>
                          <span className="text-lg font-medium">{property.price}</span>
                          <span className="text-sm text-muted-foreground">/night</span>
                        </div>
                      </div>
                      <button onClick={() => setCurrentPage('book-stays')} className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90">
                        Book Now
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Associated Partner Properties ─────────────────────────────────────
               All approved partner properties with type = "Associated" (default).
               Fetched directly from Supabase with realtime sync. */}
          <div className="mb-16">
            <div className="mb-8">
              <h2 className="text-3xl mb-2">BONORIYA Associated Properties</h2>
              <p className="text-muted-foreground">
                Carefully selected partner properties that meet our standards of quality and hospitality
              </p>
            </div>

            {loadingPartners ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[0, 1, 2, 3].map(i => (
                  <div key={i} className="bg-white rounded-xl shadow-lg overflow-hidden animate-pulse">
                    <div className="h-[200px] bg-muted" />
                    <div className="p-5 space-y-3">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                      <div className="h-3 bg-muted rounded w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (assocDayTripProps.length + assocProps.length) > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Associated Day Trip Properties */}
                {assocDayTripProps.map((prop, idx) => (
                  <div key={`dt-${prop.id}`} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer">
                    <div className="relative h-[200px] overflow-hidden">
                      <ImageWithFallback
                        src={prop.heroImage || FALLBACK_IMAGES[idx % FALLBACK_IMAGES.length]}
                        alt={prop.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-3 right-3 bg-green-600 text-white px-3 py-1 rounded-full text-xs font-semibold">
                        ASSOCIATED
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="text-lg mb-2">{prop.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                        <MapPin className="h-4 w-4" /><span>{prop.location}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{prop.shortDescription}</p>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{prop.rating}</span>
                        </div>
                        <div>
                          <span className="text-lg font-medium">{prop.priceRange}</span>
                          <span className="text-sm text-muted-foreground">/person</span>
                        </div>
                      </div>
                      {prop.maxCapacityPerDay > 0 && (
                        <p className="text-xs text-muted-foreground mb-3">Max {prop.maxCapacityPerDay} guests/day</p>
                      )}
                      <button
                        data-testid={`book-daytrip-btn-${prop.id}`}
                        onClick={() => { setSelectedDayTripId(String(prop.id)); setShowDayTripBooking(true); }}
                        className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
                      >
                        Book Your Day Trip
                      </button>
                    </div>
                  </div>
                ))}
                {assocProps.map((property, index) => {
                  const badge = getBadge(property.type);
                  return (
                    <div key={property.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer">
                      <div className="relative h-[200px] overflow-hidden">
                        <ImageWithFallback
                          src={property.image || FALLBACK_IMAGES[index % FALLBACK_IMAGES.length]}
                          alt={property.name}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        />
                        <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-semibold ${badge.cls}`}>
                          {badge.label}
                        </div>
                      </div>
                      <div className="p-5">
                        <h3 className="text-lg mb-2">{property.name}</h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                          <MapPin className="h-4 w-4" /><span>{property.location}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{property.description}</p>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-1">
                            {parseFloat(property.rating) > 0 ? (
                              <><Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /><span className="text-sm font-medium">{property.rating}</span></>
                            ) : (
                              <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">New</span>
                            )}
                          </div>
                          <div>
                            <span className="text-lg font-medium">{property.price}</span>
                            <span className="text-sm text-muted-foreground">/night</span>
                          </div>
                        </div>
                        <button
                          onClick={() => setCurrentPage('book-stays')}
                          className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-16 text-center border-2 border-dashed border-border rounded-2xl bg-muted/10">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-muted rounded-full mb-4">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl mb-2">More Properties Coming Soon</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-6 text-sm leading-relaxed">
                  We are onboarding verified property partners across Northeast India.
                  New properties will appear here once partners register and are approved by BONORIYA.
                </p>
                <button
                  onClick={() => setCurrentPage('partner-login')}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity inline-flex items-center gap-2"
                >
                  List Your Property with BONORIYA
                </button>
              </div>
            )}
          </div>

          {/* Explore More CTA */}
          <div className="text-center py-12 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-xl">
            <h3 className="text-2xl mb-4">Explore More Destinations</h3>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-6">
              We have many more properties available across Northeast India, carefully selected to give you an unbeatable experience.
            </p>
            <button
              onClick={() => setCurrentPage('book-stays')}
              className="px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity inline-flex items-center gap-2"
            >
              Browse All Stays
              <ExternalLink className="h-4 w-4" />
            </button>
          </div>

        </div>
      </section>
    </div>
  );
}
