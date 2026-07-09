import { useState, useEffect } from 'react';
import { Calendar, Users, Utensils, ArrowLeft, Check, Phone, Mail, ChevronLeft, ChevronRight, X, Images, MapPin } from 'lucide-react';
import heroImage from '../../imports/Arunachal_Pradesh.jpg';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { saveBooking, sendBookingConfirmationEmail, sendBookingNotificationEmail, getBonoriyaPropertyData, getDayTripDateStatus, getActiveDayTripProperties, getPropertyAvailability, calcDayTripCommission, type BookingEntry, type DayTripDateStatus } from '../utils/auth';
import { WA } from '../utils/whatsapp';
import CouponApply, { type CouponResult } from './CouponApply';
import { redeemCoupon } from '../utils/coupons';

interface DayTripBookingProps {
  onBack: () => void;
  propertyId?: string;
}

interface BookingForm {
  name: string;
  email: string;
  contactNo: string;
  preferredDate: string;
  adults: number;
  children: number;
  childrenUnder5: number;
  mealOption: string;
  vegGuests: number;
  nonVegGuests: number;
}

// ─── Property Gallery ─────────────────────────────────────────────────────────

interface GalleryImage { id: string; url: string; caption: string; isMain: boolean; }

function isRealCaption(caption: string): boolean {
  if (!caption?.trim()) return false;
  if (/\.(jpg|jpeg|png|webp|gif|bmp|svg|tiff|avif)$/i.test(caption.trim())) return false;
  if (/^(IMG_|DSC_|photo_|image_|img\d|pic\d|screenshot|wallpaper|photo\d)/i.test(caption.trim())) return false;
  if (caption.trim().length < 3) return false;
  return true;
}

// ── Gallery Cell ──────────────────────────────────────────────────────────────
function GalleryCell({
  img, index, total, isHero, showAllOverlay, onOpen, onShowAll,
}: {
  img: GalleryImage; index: number; total: number; isHero: boolean;
  showAllOverlay?: boolean; onOpen: (i: number) => void; onShowAll?: () => void;
}) {
  const remaining = total - 5;
  return (
    <div
      className={`relative overflow-hidden cursor-pointer group ${isHero ? 'rounded-tl-2xl rounded-bl-2xl' : index === 1 ? 'rounded-tr-2xl' : index === 4 ? 'rounded-br-2xl' : ''}`}
      style={{ gridArea: isHero ? 'hero' : `cell${index}` }}
      onClick={() => onOpen(index)}
    >
      <img
        src={img.url}
        alt={isRealCaption(img.caption) ? img.caption : `Photo ${index + 1}`}
        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        loading={isHero ? 'eager' : 'lazy'}
      />
      {/* Hover shimmer */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 pointer-events-none" />

      {/* Caption on hero hover */}
      {isHero && isRealCaption(img.caption) && (
        <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black/80 to-transparent px-5 pb-4 pt-10">
          <p className="text-white text-sm font-medium">{img.caption}</p>
        </div>
      )}

      {/* "See all photos" overlay on last visible cell */}
      {showAllOverlay && remaining > 0 && (
        <div
          className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center"
          onClick={e => { e.stopPropagation(); onShowAll?.(); }}
        >
          <Images className="h-7 w-7 text-white mb-2 opacity-90" />
          <span className="text-white font-semibold text-base">+{remaining} more</span>
          <span className="text-white/70 text-xs mt-0.5">View all photos</span>
        </div>
      )}
    </div>
  );
}

// ── Main Gallery Component ────────────────────────────────────────────────────
function PropertyGallery({ images }: { images: GalleryImage[] }) {
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  if (!images || images.length === 0) return null;

  const prevLb = (e: React.MouseEvent) => { e.stopPropagation(); setLightboxIdx(i => ((i ?? 0) - 1 + images.length) % images.length); };
  const nextLb = (e: React.MouseEvent) => { e.stopPropagation(); setLightboxIdx(i => ((i ?? 0) + 1) % images.length); };

  // Sort: main image first
  const sorted = [...images].sort((a, b) => (b.isMain ? 1 : 0) - (a.isMain ? 1 : 0));
  const visible = sorted.slice(0, 5);
  const count = sorted.length;

  // ── Layout grid template based on number of images ──
  const gridStyle = (n: number): React.CSSProperties => {
    if (n === 1) return {
      display: 'grid',
      gridTemplateAreas: '"hero"',
      gridTemplateColumns: '1fr',
      gridTemplateRows: '480px',
    };
    if (n === 2) return {
      display: 'grid',
      gap: '4px',
      gridTemplateAreas: '"hero cell1"',
      gridTemplateColumns: '1fr 1fr',
      gridTemplateRows: '420px',
    };
    if (n === 3) return {
      display: 'grid',
      gap: '4px',
      gridTemplateAreas: '"hero cell1" "hero cell2"',
      gridTemplateColumns: '3fr 2fr',
      gridTemplateRows: '240px 240px',
    };
    if (n === 4) return {
      display: 'grid',
      gap: '4px',
      gridTemplateAreas: '"hero cell1 cell2" "hero cell3 cell3"',
      gridTemplateColumns: '3fr 1.5fr 1.5fr',
      gridTemplateRows: '250px 220px',
    };
    // 5+
    return {
      display: 'grid',
      gap: '4px',
      gridTemplateAreas: '"hero cell1 cell2" "hero cell3 cell4"',
      gridTemplateColumns: '3fr 1.5fr 1.5fr',
      gridTemplateRows: '250px 220px',
    };
  };

  const cellAreas = ['cell1', 'cell2', 'cell3', 'cell4'];

  return (
    <section className="bg-background py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <Images className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Property Gallery</h2>
            <span className="text-sm text-muted-foreground">· {count} photo{count !== 1 ? 's' : ''}</span>
          </div>
          {count > 1 && (
            <button
              onClick={() => setLightboxIdx(0)}
              className="flex items-center gap-1.5 px-4 py-1.5 border border-border rounded-full text-sm hover:bg-muted/50 transition-colors text-foreground"
            >
              <Images className="h-3.5 w-3.5" />
              View all
            </button>
          )}
        </div>

        {/* Collage grid */}
        <div
          style={gridStyle(Math.min(count, 5))}
          className="rounded-2xl overflow-hidden shadow-md"
        >
          {/* Hero cell */}
          <GalleryCell
            img={visible[0]}
            index={0}
            total={count}
            isHero
            onOpen={i => setLightboxIdx(i)}
          />

          {/* Side cells */}
          {visible.slice(1).map((img, idx) => {
            const cellIdx = idx + 1;
            const isLast = cellIdx === Math.min(count, 5) - 1;
            const showOverlay = isLast && count > 5;
            return (
              <div
                key={img.id}
                className="relative overflow-hidden cursor-pointer group"
                style={{ gridArea: cellAreas[idx] }}
                onClick={() => setLightboxIdx(showOverlay ? 4 : cellIdx)}
              >
                <img
                  src={img.url}
                  alt={isRealCaption(img.caption) ? img.caption : `Photo ${cellIdx + 1}`}
                  className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 pointer-events-none" />

                {/* Caption tooltip on hover */}
                {isRealCaption(img.caption) && (
                  <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 bg-gradient-to-t from-black/75 to-transparent px-3 pb-3 pt-8">
                    <p className="text-white text-xs">{img.caption}</p>
                  </div>
                )}

                {/* "See all" overlay on last visible cell when there are more */}
                {showOverlay && (
                  <div
                    className="absolute inset-0 bg-black/55 flex flex-col items-center justify-center"
                    onClick={e => { e.stopPropagation(); setLightboxIdx(0); }}
                  >
                    <Images className="h-6 w-6 text-white mb-1.5" />
                    <span className="text-white font-semibold">+{count - 5} more</span>
                    <span className="text-white/70 text-xs mt-0.5">View all photos</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile: scrollable strip when only 1 image shown on small screens */}
        {count > 1 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 md:hidden scrollbar-none">
            {sorted.map((img, i) => (
              <button
                key={img.id}
                onClick={() => setLightboxIdx(i)}
                className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${i === 0 ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100'}`}
              >
                <img src={img.url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Full-screen Lightbox ── */}
      {lightboxIdx !== null && (() => {
        const lbImg = sorted[lightboxIdx] ?? sorted[0];
        return (
          <div
            className="fixed inset-0 z-[60] flex flex-col bg-black"
            onClick={() => setLightboxIdx(null)}
          >
            {/* Top bar */}
            <div className="flex items-center justify-between px-5 py-3 bg-black/80 backdrop-blur-sm flex-shrink-0" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3">
                <span className="text-white/50 text-sm">{lightboxIdx + 1} / {count}</span>
                {isRealCaption(lbImg.caption) && (
                  <span className="text-white/80 text-sm hidden sm:block">{lbImg.caption}</span>
                )}
              </div>
              <button
                onClick={() => setLightboxIdx(null)}
                className="w-9 h-9 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Main image */}
            <div className="flex-1 flex items-center justify-center px-16 py-4 relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={prevLb}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/10 hover:bg-white/25 text-white rounded-full flex items-center justify-center transition-colors z-10"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>

              <img
                key={lbImg.url}
                src={lbImg.url}
                alt={isRealCaption(lbImg.caption) ? lbImg.caption : `Photo ${lightboxIdx + 1}`}
                className="max-w-full max-h-full object-contain rounded-lg select-none"
                style={{ maxHeight: 'calc(100vh - 160px)' }}
              />

              <button
                onClick={nextLb}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 bg-white/10 hover:bg-white/25 text-white rounded-full flex items-center justify-center transition-colors z-10"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>

            {/* Thumbnail filmstrip */}
            <div
              className="flex gap-2 justify-center overflow-x-auto px-4 py-3 bg-black/80 flex-shrink-0 scrollbar-none"
              onClick={e => e.stopPropagation()}
            >
              {sorted.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setLightboxIdx(i)}
                  className={`flex-shrink-0 w-16 h-11 rounded-md overflow-hidden transition-all duration-200 ring-offset-black ${i === lightboxIdx ? 'ring-2 ring-white scale-105' : 'opacity-45 hover:opacity-75'}`}
                >
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        );
      })()}
    </section>
  );
}

export default function DayTripBooking({ onBack, propertyId }: DayTripBookingProps) {
  const [step, setStep] = useState<'form' | 'confirm' | 'success'>('form');
  const [formData, setFormData] = useState<BookingForm>({
    name: '',
    email: '',
    contactNo: '',
    preferredDate: '',
    adults: 1,
    children: 0,
    childrenUnder5: 0,
    mealOption: '',
    vegGuests: 0,
    nonVegGuests: 0
  });
  const [showFullError, setShowFullError] = useState(false);
  const [bookingRef, setBookingRef] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<CouponResult | null>(null);

  // ── Load property data — merge Supabase day_trip_properties with localStorage fallback ──
  // This ensures gallery images uploaded via Admin are always visible even if
  // hero_image/gallery were not yet synced to the new day_trip_properties table.
  const legacyData = getBonoriyaPropertyData();
  const [propName,    setPropName]    = useState(legacyData.name    || 'Bonoriya Agro Eco Tourism');
  const [propLoc,     setPropLoc]     = useState(legacyData.location || 'Jimbrigaon, Halher, Meghalaya');
  const [propHero,    setPropHero]    = useState(legacyData.heroImage || '');
  const [propGallery, setPropGallery] = useState<typeof legacyData.gallery>(legacyData.gallery || []);
  const [propHighlights, setPropHighlights] = useState<string[]>(
    propertyId ? [] : (legacyData.highlights?.length ? legacyData.highlights : ['Traditional Assamese food', 'Trek to organic orange farm', 'Scenic waterfall trek', 'Live folk music performance'])
  );
  const [propShortDescription, setPropShortDescription] = useState<string>(
    propertyId ? '' : (legacyData.shortDescription || '')
  );
  const [propFaqs, setPropFaqs] = useState<import('../utils/auth').DayTripFAQ[]>([]);
  const [propMeals, setPropMeals] = useState(
    legacyData.mealOptions?.length ? legacyData.mealOptions : [
      { value: 'breakfast-starter-lunch', label: 'Breakfast + Starter + Lunch', price: 1500 },
      { value: 'starter-lunch',           label: 'Starter + Lunch',             price: 1200 },
      { value: 'only-lunch',              label: 'Only Lunch',                  price: 1000 },
    ]
  );
  const [propMaxPerDay, setPropMaxPerDay] = useState(legacyData.maxCapacityPerDay || 100);
  const [propId,        setPropId]        = useState<string>('default');
  const [propPropertyType, setPropPropertyType] = useState<'bonoriya_own' | 'associated'>('bonoriya_own');
  const [propAvailability, setPropAvailability] = useState<DayTripDateStatus[]>([]);
  const [propLat,       setPropLat]       = useState<number>(25.5788);
  const [propLng,       setPropLng]       = useState<number>(91.8933);
  const [propMapAddress, setPropMapAddress] = useState<string>('');

  useEffect(() => {
    const load = async () => {
      try {
        const { supabase } = await import('../utils/db');

        // ── 1. Load day_trip_properties (primary source for name/location/etc.) ──
        const dtProps = await getActiveDayTripProperties();
        // Select the requested property by id, else fallback to first
        const p = (propertyId && dtProps.find(dp => String(dp.id) === String(propertyId))) || dtProps[0];

        // ── 2. Load bonoriya_property directly from Supabase for gallery/hero ──
        // This is the authoritative source — gallery images are saved here by Admin.
        const { data: bpData } = await supabase
          .from('bonoriya_property')
          .select('gallery, hero_image, highlights, meal_options, max_capacity_per_day, price_range, rating, name, location, short_description')
          .eq('id', 1)
          .single();

        // Merge all sources: day_trip_properties → bonoriya_property Supabase → localStorage
        // NOTE: bpData & legacyData both hold Bonoriya Agro Eco Tourism's content.
        // They should ONLY be used as fallback for the Agro Eco property itself —
        // never bleed into other day trip properties.
        const isAgroEco = !p || String(p.id) === '__legacy__' ||
          (p?.name || '').trim().toLowerCase() === (legacyData.name || 'Bonoriya Agro Eco Tourism').trim().toLowerCase();

        const gallery = (p?.gallery?.length && p.gallery.some((g: any) => g.url))
          ? p.gallery
          : (isAgroEco ? (bpData?.gallery?.length ? bpData.gallery : legacyData.gallery || []) : []);

        const heroImage = p?.heroImage || (isAgroEco ? (bpData?.hero_image || legacyData.heroImage || '') : '');

        const highlights = p?.highlights?.length ? p.highlights
          : (isAgroEco
              ? (bpData?.highlights?.length ? bpData.highlights
                  : (legacyData.highlights?.length ? legacyData.highlights
                      : ['Traditional Assamese food', 'Trek to organic orange farm', 'Scenic waterfall trek', 'Live folk music performance']))
              : []);

        const shortDescription = p?.shortDescription || (isAgroEco ? (bpData?.short_description || legacyData.shortDescription || '') : '');

        const meals = p?.mealOptions?.length ? p.mealOptions
          : (isAgroEco
              ? (bpData?.meal_options?.length ? bpData.meal_options
                  : (legacyData.mealOptions?.length ? legacyData.mealOptions : propMeals))
              : propMeals);

        if (p?.name || bpData?.name) {
          setPropName(p?.name || bpData?.name || legacyData.name);
          setPropLoc(p?.location || bpData?.location || legacyData.location);
        }
        setPropHero(heroImage);
        setPropGallery(gallery);
        setPropHighlights(highlights);
        setPropShortDescription(shortDescription);
        setPropMeals(meals);
        setPropFaqs(Array.isArray(p?.faqs) ? p!.faqs.filter(f => f && f.question && f.answer) : []);
        setPropMaxPerDay(p?.maxCapacityPerDay || bpData?.max_capacity_per_day || legacyData.maxCapacityPerDay || 100);

        // Map / GPS coordinates
        if (p?.lat) setPropLat(p.lat);
        if (p?.lng) setPropLng(p.lng);
        if (p?.mapAddress) setPropMapAddress(p.mapAddress);

        // Load per-property availability for date validation
        if (p?.propertyType) setPropPropertyType(p.propertyType as 'bonoriya_own' | 'associated');
        const pid = p?.id || 'default';
        setPropId(pid);
        const avail = await getPropertyAvailability(pid);
        setPropAvailability(avail);

      } catch (e) {
        console.warn('[DayTripBooking] data load failed:', e);
      }
    };
    load();
  }, [propertyId]);

  const bonoriyaData = legacyData; // kept for any remaining references

  // Property-aware date status check
  const isDateClosed = (date: string): boolean => {
    if (propAvailability.length > 0) {
      const slot = propAvailability.find(s => s.date === date);
      return slot?.status === 'closed';
    }
    // Fallback to legacy check
    return getDayTripDateStatus(date) === 'closed';
  };
  const mealOptions = propMeals;
  const maxPerDay   = propMaxPerDay;
  const highlights  = propHighlights;

  const calculateTotal = () => {
    const totalPersons = formData.adults + formData.children + formData.childrenUnder5;
    const selectedMeal = mealOptions.find(m => m.value === formData.mealOption);
    const mealPrice = selectedMeal ? selectedMeal.price : 0;

    // Adults: full price, Children (5-10): 50% price, Under 5: free
    const adultAmount = formData.adults * mealPrice;
    const childAmount = formData.children * (mealPrice * 0.5);
    const totalAmount = adultAmount + childAmount;
    const advanceAmount = totalAmount * 0.4;

    return {
      totalPersons,
      mealPrice,
      adultAmount,
      childAmount,
      totalAmount,
      advanceAmount
    };
  };

  const checkAvailability = (date: string) => {
    // Count existing bookings for this date for THIS property only.
    // Handles legacy bookings that used hard-coded ids (bonoriya-agro-eco / default)
    // by matching the current propId OR the legacy Agro Eco id when applicable.
    const legacyAgroIds = new Set(['bonoriya-agro-eco', 'default', '__legacy__']);
    const acceptedIds = new Set<string>([String(propId)]);
    if (legacyAgroIds.has(String(propId)) ||
        (propName || '').trim().toLowerCase() === (legacyData.name || 'Bonoriya Agro Eco Tourism').trim().toLowerCase()) {
      legacyAgroIds.forEach(id => acceptedIds.add(id));
    }

    const existingCount = JSON.parse(localStorage.getItem('bonoriya_bookings') || '[]')
      .filter((b: any) =>
        b.type === 'day-trip' &&
        acceptedIds.has(String(b.propertyId ?? '')) &&
        (b.tripDate === date || b.checkIn === date) &&
        b.bookingStatus !== 'Cancelled' && b.bookingStatus !== 'No Show'
      )
      .reduce((s: number, b: any) => s + (b.adults || 0) + (b.children || 0), 0);
    const totalPersons = formData.adults + formData.children + formData.childrenUnder5;
    return existingCount + totalPersons <= maxPerDay;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Check admin-controlled date availability first
    if (isDateClosed(formData.preferredDate)) {
      setShowFullError(true);
      return;
    }

    // Check capacity availability
    if (!checkAvailability(formData.preferredDate)) {
      setShowFullError(true);
      return;
    }

    // Check if veg + non-veg equals total paying persons (adults + children 5-10 years, excluding under 5)
    const totalPayingPersons = formData.adults + formData.children;
    const totalGuestPreference = formData.vegGuests + formData.nonVegGuests;

    if (totalGuestPreference !== totalPayingPersons) {
      alert(`Total guest preferences (${totalGuestPreference}) must equal adults and children 5-10 years (${totalPayingPersons}). Children under 5 don't require meal preference.`);
      return;
    }

    setShowFullError(false);
    setStep('confirm');
  };

  const handleConfirmBooking = () => {
    const ref = `DT-${Date.now().toString().slice(-6)}`;
    const totals = calculateTotal();
    const finalTotal = appliedCoupon ? appliedCoupon.finalAmount : totals.totalAmount;
    const finalAdvance = Math.round(finalTotal * 0.4);
    const booking: BookingEntry = {
      id: Date.now().toString(),
      bookingRef: ref,
      type: 'day-trip',
      partnerId: 'bonoriya-own',
      partnerEmail: 'info@bonoriya.com',
      propertyId: propId,
      propertyName: propName,
      guestName: formData.name,
      guestEmail: formData.email,
      guestPhone: formData.contactNo,
      guestAddress: '',
      adults: formData.adults,
      children: formData.children + formData.childrenUnder5,
      checkIn: formData.preferredDate,
      checkOut: formData.preferredDate,
      tripDate: formData.preferredDate,
      mealOption: mealOptions.find(m => m.value === formData.mealOption)?.label || formData.mealOption,
      vegCount: formData.vegGuests,
      nonVegCount: formData.nonVegGuests,
      totalAmount: finalTotal,
      advanceAmount: finalAdvance,
      paymentStatus: 'Advance Pending',
      bookingStatus: 'Confirmed',
      bookingDate: new Date().toISOString().split('T')[0],
      ...calcDayTripCommission(finalTotal, propPropertyType),
      ...(appliedCoupon ? { couponCode: appliedCoupon.couponCode, couponDiscount: appliedCoupon.discountAmount, originalAmount: totals.totalAmount } as any : {}),
    };
    saveBooking(booking);
    if (appliedCoupon) redeemCoupon(appliedCoupon.couponId, formData.email);
    sendBookingConfirmationEmail(booking);
    sendBookingNotificationEmail(booking);
    WA.newDayTrip({ bookingRef: ref, guestName: formData.name, tripDate: formData.preferredDate, adults: formData.adults, children: formData.children + formData.childrenUnder5, mealOption: mealOptions.find(m => m.value === formData.mealOption)?.label, totalAmount: finalTotal });
    setBookingRef(ref);
    setStep('success');
  };

  const selectedMeal = mealOptions.find(m => m.value === formData.mealOption);
  const totals = calculateTotal();

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4">
        <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <Check className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl mb-4">Booking Confirmed!</h1>
          <div className="mb-6 p-6 bg-primary/10 rounded-lg">
            <h2 className="text-2xl mb-4">Welcome to Jimbrigaon!</h2>
            <p className="text-muted-foreground mb-4">
              Get ready to experience the untouched beauty of Jimbrigaon, Halher. Your day trip has been confirmed and our team will contact you shortly with payment details.
            </p>
            <div className="text-left space-y-2 text-sm">
              <p><strong>Booking Details:</strong></p>
              <p>Name: {formData.name}</p>
              <p>Email: {formData.email}</p>
              <p>Date: {new Date(formData.preferredDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p>Total Persons: {totals.totalPersons} ({formData.adults} Adults, {formData.children} Children 5-10 yrs{formData.childrenUnder5 > 0 ? `, ${formData.childrenUnder5} Under 5 yrs` : ''})</p>
              <p>Meal Option: {selectedMeal?.label}</p>
              {formData.children > 0 && (
                <p className="text-xs text-muted-foreground">*Children (5-10 years) charged at 50% rate</p>
              )}
              {formData.childrenUnder5 > 0 && (
                <p className="text-xs text-muted-foreground">*Children under 5 years - Free</p>
              )}
              {(() => {
                const commission = calcDayTripCommission(totals.totalAmount, propPropertyType);
                return (
                  <>
                    <p className="text-lg font-medium mt-3">Total Amount: ₹{totals.totalAmount.toLocaleString()}</p>
                    {propPropertyType === 'associated' && (
                      <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1">
                        <p className="font-medium text-amber-800">Commission on Booking — Associated Property</p>
                        <p className="text-amber-700">Commission on Booking (10%): ₹{commission.commissionAmount.toLocaleString()}</p>
                        <p className="text-amber-700">GST on Commission (18%): ₹{commission.gstOnCommission.toLocaleString()}</p>
                        <p className="text-amber-700 font-semibold">Total Deduction: ₹{commission.totalDeduction.toLocaleString()}</p>
                        <p className="text-green-700 font-semibold">Net Payable to Property: ₹{commission.netPayable.toLocaleString()}</p>
                      </div>
                    )}
                    <p className="text-primary">Advance to Pay (40%): ₹{totals.advanceAmount.toLocaleString()}</p>
                  </>
                );
              })()}
            </div>
          </div>
          {(highlights.length > 0 || propShortDescription) && (
            <div className="space-y-3 mb-6">
              <p className="text-sm text-muted-foreground">
                <strong>What to Expect:</strong>
              </p>
              {highlights.length > 0 ? (
                <ul className="text-sm text-muted-foreground text-left list-disc list-inside space-y-1">
                  {highlights.map((h, i) => <li key={i}>{h}</li>)}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground text-left whitespace-pre-line">{propShortDescription}</p>
              )}
            </div>
          )}
          {bookingRef && (
            <div className="mb-4 p-3 bg-gray-50 border border-border rounded-lg">
              <p className="text-xs text-muted-foreground">Booking Reference</p>
              <p className="text-lg font-medium tracking-wide text-primary">{bookingRef}</p>
            </div>
          )}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-6 text-sm space-y-2">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
              <p>Booking confirmation email sent to <strong>{formData.email}</strong></p>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
              <p>Booking notification sent to BONORIYA team at <strong>info@bonoriya.com</strong></p>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
              <p>Our team will contact you within 24 hours with payment instructions.</p>
            </div>
          </div>
          <button
            onClick={onBack}
            className="px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
          >
            Back to Properties
          </button>
        </div>
      </div>
    );
  }

  if (step === 'confirm') {
    return (
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <button
            onClick={() => setStep('form')}
            className="flex items-center gap-2 text-primary hover:underline mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Form
          </button>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <h1 className="text-3xl mb-6">Confirm Your Booking</h1>

            <div className="space-y-4 mb-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Name</p>
                  <p className="font-medium">{formData.name}</p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Email</p>
                  <p className="font-medium">{formData.email}</p>
                </div>
              </div>

              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Contact Number</p>
                <p className="font-medium">{formData.contactNo}</p>
              </div>

              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Preferred Date</p>
                <p className="font-medium">
                  {new Date(formData.preferredDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Number of Persons</p>
                  <p className="font-medium">
                    {totals.totalPersons} Total
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formData.adults} Adults, {formData.children} Children (5-10 yrs){formData.childrenUnder5 > 0 ? `, ${formData.childrenUnder5} Under 5 yrs` : ''}
                  </p>
                </div>
                <div className="p-4 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-1">Food Preference</p>
                  <p className="font-medium">
                    Veg: {formData.vegGuests}, Non-Veg: {formData.nonVegGuests}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Meal Option</p>
                <p className="font-medium">{selectedMeal?.label} - ₹{selectedMeal?.price}/person</p>
              </div>
            </div>

            <div className="border-t border-border pt-6 mb-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>{formData.adults} Adults × ₹{totals.mealPrice.toLocaleString()}</span>
                  <span className="font-medium">₹{totals.adultAmount.toLocaleString()}</span>
                </div>
                {formData.children > 0 && (
                  <div className="flex justify-between">
                    <span>{formData.children} Children (5-10 yrs) × ₹{(totals.mealPrice * 0.5).toLocaleString()} (50%)</span>
                    <span className="font-medium">₹{totals.childAmount.toLocaleString()}</span>
                  </div>
                )}
                {formData.childrenUnder5 > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>{formData.childrenUnder5} Children (Under 5 yrs)</span>
                    <span className="font-medium">Free</span>
                  </div>
                )}
                <div className="flex justify-between text-2xl font-bold border-t border-border pt-3">
                  <span>Total Amount:</span>
                  <span className={appliedCoupon ? 'line-through text-muted-foreground text-xl' : 'text-primary'}>
                    ₹{totals.totalAmount.toLocaleString()}
                  </span>
                </div>
                {appliedCoupon && (
                  <>
                    <div className="flex justify-between text-green-700 font-medium">
                      <span>Discount ({appliedCoupon.couponCode})</span>
                      <span>− ₹{appliedCoupon.discountAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-2xl font-bold text-primary">
                      <span>Discounted Total:</span>
                      <span>₹{appliedCoupon.finalAmount.toLocaleString()}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between text-lg text-green-600">
                  <span>Advance Payment (40%):</span>
                  <span className="font-medium">
                    ₹{appliedCoupon ? Math.round(appliedCoupon.finalAmount * 0.4).toLocaleString() : totals.advanceAmount.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Coupon / Promo Code ── */}
            <div className="mb-6">
              <CouponApply
                bookingType="day-trips"
                propertyType={propPropertyType}
                totalAmount={totals.totalAmount}
                guestId={formData.email}
                priorBookings={0}
                isNewUser={false}
                isLoggedIn={true}
                applied={appliedCoupon}
                onApply={setAppliedCoupon}
              />
            </div>

            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-6">
              <p className="text-sm font-medium mb-2">Payment & Cancellation Policy:</p>
              <ul className="text-sm space-y-1">
                <li>• 40% of the total trip amount must be paid in advance to confirm your booking</li>
                <li>• Cancellation and refund will be applicable 48 hours prior to the trip date</li>
                <li>• Full refund for cancellations made 48+ hours before the trip</li>
                <li>• No refund for cancellations within 48 hours of the trip</li>
              </ul>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setStep('form')}
                className="flex-1 py-3 border border-border rounded-lg hover:bg-muted"
              >
                Edit Details
              </button>
              <button
                onClick={handleConfirmBooking}
                className="flex-1 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
              >
                {appliedCoupon ? `Confirm — ₹${appliedCoupon.finalAmount.toLocaleString()} total` : 'Confirm Booking'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Banner */}
      <div className="relative h-[300px] overflow-hidden">
        <ImageWithFallback
          src={propHero || heroImage}
          alt="Bonoriya Agro Eco Tourism"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 to-black/50"></div>
        <div className="relative h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center">
          <div className="text-white">
            <button
              onClick={onBack}
              className="flex items-center gap-2 mb-4 hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Properties
            </button>
            {/* Property type badge */}
            <div className="mb-3">
              <span className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold bg-white/20 text-white border border-white/30 backdrop-blur-sm">
                BONORIYA DAY TRIP PROPERTY
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl mb-2">{propName}</h1>
            <p className="text-xl text-white/90 flex items-center gap-2">
              <MapPin className="h-5 w-5 flex-shrink-0" />
              {propLoc}
            </p>
            {/* Google Maps link — shown when coordinates are set */}
            {propLat && propLng && (propLat !== 25.5788 || propLng !== 91.8933 || propMapAddress) && (
              <div className="mt-3 flex items-center gap-3 flex-wrap">
                <a
                  href={`https://www.google.com/maps?q=${propLat},${propLng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-full text-sm transition-colors backdrop-blur-sm"
                >
                  <MapPin className="h-4 w-4" />
                  View on Google Maps
                </a>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${propLat},${propLng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white/80 rounded-full text-sm transition-colors"
                >
                  🗺 Get Directions
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Photo Gallery — images from Admin → Bonoriya Property */}
      {propGallery && propGallery.length > 0 && (
        <PropertyGallery images={propGallery} />
      )}

      {/* Booking Form */}
      <section className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl mb-6">Book Your Day Trip</h2>

            {/* Location Map — shown when GPS coordinates are set */}
            {propLat && propLng && (propLat !== 25.5788 || propLng !== 91.8933 || propMapAddress) && (
              <div className="mb-6 rounded-xl overflow-hidden border border-border">
                <div className="bg-muted/30 px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>{propMapAddress || propLoc}</span>
                  </div>
                  <div className="flex gap-2">
                    <a href={`https://www.google.com/maps?q=${propLat},${propLng}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1">
                      Open in Maps ↗
                    </a>
                    <span className="text-muted-foreground text-xs">|</span>
                    <a href={`https://www.google.com/maps/dir/?api=1&destination=${propLat},${propLng}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline">
                      Get Directions ↗
                    </a>
                  </div>
                </div>
                {/* Google Maps embed — no API key required */}
                <iframe
                  title={`${propName} location`}
                  width="100%"
                  height="220"
                  style={{ border: 0, display: 'block' }}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps?q=${propLat},${propLng}&z=14&output=embed`}
                />
              </div>
            )}

            {/* Experience Highlights — managed from Admin Panel.
                Falls back to Short Description when property has no explicit highlights.
                Hides entirely when neither is available. */}
            {highlights.length > 0 ? (
              <div className="mb-8 p-6 bg-primary/10 rounded-lg">
                <h3 className="mb-4">Your Day Trip Experience Includes:</h3>
                <ul className="grid md:grid-cols-2 gap-3 text-sm">
                  {highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : propShortDescription ? (
              <div className="mb-8 p-6 bg-primary/10 rounded-lg">
                <h3 className="mb-4">About This Day Trip:</h3>
                <p className="text-sm whitespace-pre-line">{propShortDescription}</p>
              </div>
            ) : null}

            {showFullError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-700 font-medium">
                  Sorry! We are full for the selected date. Kindly select a different date. Thank you!
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block mb-2 text-sm font-medium">Name *</label>
                <input
                  type="text"
                  className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block mb-2 text-sm font-medium">Email Address *</label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium">Contact Number *</label>
                  <input
                    type="tel"
                    className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="Enter 10-digit mobile number"
                    value={formData.contactNo}
                    onChange={(e) => setFormData({ ...formData, contactNo: e.target.value })}
                    pattern="[0-9]{10}"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">Select Preferred Date for Tour *</label>
                <input
                  type="date"
                  className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  value={formData.preferredDate}
                  onChange={(e) => {
                    const d = e.target.value;
                    if (d && isDateClosed(d)) {
                      alert('This date is not available for booking. Please select another date.');
                      return;
                    }
                    setFormData({ ...formData, preferredDate: d });
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
                {formData.preferredDate && isDateClosed(formData.preferredDate) && (
                  <p className="text-xs text-red-600 mt-1">This date is closed. Please choose a different date.</p>
                )}
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div>
                  <label className="block mb-2 text-sm font-medium">Adults (Above 10 years) *</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                    value={formData.adults}
                    onChange={(e) => setFormData({ ...formData, adults: parseInt(e.target.value) || 0 })}
                    min="1"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">Full price</p>
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium">Children (5-10 years)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                    value={formData.children}
                    onChange={(e) => setFormData({ ...formData, children: parseInt(e.target.value) || 0 })}
                    min="0"
                  />
                  <p className="text-xs text-muted-foreground mt-1">50% price</p>
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium">Children (Below 5 years)</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                    value={formData.childrenUnder5}
                    onChange={(e) => setFormData({ ...formData, childrenUnder5: parseInt(e.target.value) || 0 })}
                    min="0"
                  />
                  <p className="text-xs text-green-600 mt-1">Free</p>
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm font-medium">Meal Option *</label>
                <select
                  className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                  value={formData.mealOption}
                  onChange={(e) => setFormData({ ...formData, mealOption: e.target.value })}
                  required
                >
                  <option value="">Select meal option</option>
                  {mealOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} - ₹{option.price} per person
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block mb-2 text-sm font-medium">Number of Vegetarian Guests *</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                    value={formData.vegGuests}
                    onChange={(e) => setFormData({ ...formData, vegGuests: parseInt(e.target.value) || 0 })}
                    min="0"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">For adults & children 5-10 years only</p>
                </div>

                <div>
                  <label className="block mb-2 text-sm font-medium">Number of Non-Vegetarian Guests *</label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                    value={formData.nonVegGuests}
                    onChange={(e) => setFormData({ ...formData, nonVegGuests: parseInt(e.target.value) || 0 })}
                    min="0"
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">For adults & children 5-10 years only</p>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium mb-2">Note:</p>
                <ul className="text-sm space-y-1">
                  <li>• 40% of the total trip amount must be paid in advance to confirm your booking</li>
                  <li>• Cancellation and refund will be applicable 48 hours prior to the trip date</li>
                  <li>• Maximum capacity: {maxPerDay} persons per day</li>
                </ul>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-primary text-primary-foreground rounded-lg hover:opacity-90 text-lg font-medium"
              >
                Submit Booking
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* FAQ Section — Day Trip SEO.
          Priority: property's own FAQs (from Admin) → Agro Eco default set → hide */}
      {(() => {
        const AGRO_ECO_DEFAULT_FAQS: [string, string][] = [
          ['What is included in the BONORIYA day trip to Jimbrigaon?', 'The BONORIYA day trip includes an organic orange farm trek, scenic waterfall hike, traditional Assamese cuisine, and live Khasi folk music. All guided by BONORIYA hosts.'],
          ['How far is Jimbrigaon from Guwahati?', 'Jimbrigaon, Halher, Meghalaya is approximately 50 km from Guwahati. Travel time is around 1.5–2 hours.'],
          ['What is the best day trip near Guwahati?', 'BONORIYA Agro Eco Tourism at Jimbrigaon, Meghalaya is widely considered one of the best day trips near Guwahati for its natural beauty, cultural experiences and authentic food.'],
          ['Is advance booking required for the day trip?', 'Yes — 40% of the total trip amount must be paid in advance to confirm your slot. Free cancellation with full refund is available 48 hours before the trip date.'],
          ['What is the maximum capacity per day?', `BONORIYA day trips have a maximum capacity of ${maxPerDay} persons per day to ensure quality experience and minimal environmental impact.`],
          ['Are children allowed on the day trip?', 'Yes. Children aged 5–10 years are charged 50% of the adult rate. Children under 5 are free. All age groups are welcome.'],
        ];
        const isAgroEcoProp = (propName || '').trim().toLowerCase() === (legacyData.name || 'Bonoriya Agro Eco Tourism').trim().toLowerCase();
        const faqPairs: [string, string][] = propFaqs.length > 0
          ? propFaqs.map(f => [f.question, f.answer] as [string, string])
          : (isAgroEcoProp ? AGRO_ECO_DEFAULT_FAQS : []);
        if (faqPairs.length === 0) return null;
        return (
          <section className="py-14 bg-muted/20">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl mb-2">Day Trip FAQs</h2>
                <p className="text-muted-foreground text-sm">Common questions about {propName} day trips</p>
              </div>
              <div className="space-y-2">
                {faqPairs.map(([q, a], i) => (
                  <details key={i} className="group bg-white border border-border rounded-xl overflow-hidden">
                    <summary className="flex items-center justify-between px-4 py-3.5 cursor-pointer list-none hover:bg-muted/30 transition-colors gap-3">
                      <span className="font-medium text-sm">{q}</span>
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center group-open:rotate-45 transition-transform duration-200">+</span>
                    </summary>
                    <div className="px-4 pb-3.5 pt-1">
                      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{a}</p>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </section>
        );
      })()}
    </div>
  );
}
