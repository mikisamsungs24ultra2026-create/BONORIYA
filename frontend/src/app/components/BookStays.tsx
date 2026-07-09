/**
 * BookStays — full 5-step booking workflow
 * Step 1: Search (location + property name)
 * Step 2: Property overview
 * Step 3: Room listing (occupancy-filtered)
 * Step 4: Booking form (visitor details)
 * Step 5: Confirmation
 */
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  MapPin, Calendar, Users, Search, Mail, Lock, User, Phone,
  Plus, Minus, AlertCircle, CheckCircle, X, Save, LogOut,
  BookOpen, Clock, XCircle, Edit3, Home, Star, ChevronRight,
  ChevronLeft, ArrowLeft, Wifi, Bed, Bath, Wind, Tv, Eye
} from 'lucide-react';
import heroImage from '../../imports/Book-Stays.png';
import LocationAutocomplete from './LocationAutocomplete';
import { ImageWithFallback } from './figma/ImageWithFallback';
import Footer from './Footer';
import ForgotPassword from './ForgotPassword';
import { PixelEvents } from '../utils/seo';
import { WA } from '../utils/whatsapp';
import CouponApply, { type CouponResult } from './CouponApply';
import { redeemCoupon, refreshCouponStatuses } from '../utils/coupons';
import {
  registerGuest, validateGuestLoginAsync, isValidEmail, isValidPassword,
  getPasswordStrength, sendWelcomeEmail, getGuestByEmail, updateGuest,
  saveBooking, sendBookingConfirmationEmail, sendBookingNotificationEmail,
  sendBookingCancellationEmail, getAllBookings, updateBookingStatus,
  getApprovedPartnerProperties, loadPartnerPropertyData, getInventory,
  type GuestRecord, type BookingEntry, type PartnerRoomData,
  type PartnerProperty, type PartnerPropertyData, type VisitorDetail
} from '../utils/auth';

// ─── Types ─────────────────────────────────────────────────────────────────────

type View = 'search' | 'property' | 'rooms' | 'room-detail' | 'booking' | 'success' | 'profile';
type BookingTab = 'active' | 'past' | 'cancelled';

interface BookStaysProps {
  isSignedIn: boolean;
  setIsSignedIn: (v: boolean) => void;
  setCurrentPage: (p: string, s?: string) => void;
  currentGuest?: GuestRecord | null;
  setCurrentGuest?: (g: GuestRecord | null) => void;
  initialSearchParams?: {
    location: string; checkIn: string; checkOut: string;
    adults: number; children: number;
    coordinates?: { lat: number; lng: number };
  };
}

// ─── Utilities ─────────────────────────────────────────────────────────────────

function shuffled<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5); }

function getMainImage(prop: PartnerProperty): string {
  // prop.image is always the Supabase-synced main image from partner_properties table.
  // It's updated by savePartnerPropertyData → updatePartnerProperty({image: mainImageUrl}).
  // Do NOT read from localStorage here — that causes device-sync failures.
  if (prop.image) return prop.image;
  return 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80';
}

function calcNights(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 1;
  return Math.max(1, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000));
}

// ─── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ msg, type, onClose }: { msg: string; type: 'success'|'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl text-white text-sm font-medium ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {type === 'success' ? <CheckCircle className="h-5 w-5 flex-shrink-0" /> : <AlertCircle className="h-5 w-5 flex-shrink-0" />}
      <span>{msg}</span>
      <button onClick={onClose} className="ml-1 hover:opacity-70"><X className="h-4 w-4" /></button>
    </div>
  );
}

// ─── Booking Card ──────────────────────────────────────────────────────────────

function BookingCard({ booking, onCancel }: { booking: BookingEntry; onCancel?: () => void }) {
  const today = new Date().toISOString().split('T')[0];
  const isPast = booking.bookingStatus === 'Confirmed' && (booking.checkOut || booking.tripDate || '') < today;
  const isCancelled = booking.bookingStatus === 'Cancelled';
  const isNoShow = booking.bookingStatus === 'No Show';
  const cls = (isCancelled || isNoShow) ? 'bg-red-100 text-red-700' : isPast ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-700';
  const label = isCancelled ? 'Cancelled' : isNoShow ? 'No Show' : isPast ? 'Completed' : 'Confirmed';
  return (
    <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-medium">{booking.propertyName}</p>
          {booking.propertyLocation && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{booking.propertyLocation}</p>}
          <p className="text-xs text-muted-foreground mt-0.5">Ref: {booking.bookingRef}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${cls}`}>
          {label}
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm mb-3">
        <div><p className="text-xs text-muted-foreground">Check-in</p><p className="font-medium">{booking.checkIn || booking.tripDate || '—'}</p></div>
        {booking.type !== 'day-trip' && <div><p className="text-xs text-muted-foreground">Check-out</p><p className="font-medium">{booking.checkOut || '—'}</p></div>}
        {booking.roomType && <div><p className="text-xs text-muted-foreground">Room</p><p className="font-medium">{booking.roomType}</p></div>}
        <div><p className="text-xs text-muted-foreground">Guests</p><p className="font-medium">{booking.adults + booking.children}</p></div>
        <div><p className="text-xs text-muted-foreground">Amount</p><p className="font-medium text-green-600">₹{booking.advanceAmount.toLocaleString()} / ₹{booking.totalAmount.toLocaleString()}</p></div>
        {isCancelled && <div><p className="text-xs text-muted-foreground">Refund</p><p className="font-medium text-orange-500">Processing 5–7 days</p></div>}
      </div>
      {onCancel && !isCancelled && !isNoShow && !isPast && (
        <button onClick={onCancel} className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm">
          <XCircle className="h-4 w-4" /> Cancel Booking
        </button>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────────

export default function BookStays({
  isSignedIn, setIsSignedIn, setCurrentPage,
  currentGuest: extGuest, setCurrentGuest: setExtGuest,
  initialSearchParams
}: BookStaysProps) {
  // ── Auth states ───────────────────────────────────────────────────────────────
  const [showSignIn, setShowSignIn] = useState(true);
  const [showForgotPwd, setShowForgotPwd] = useState(false);
  const [signInData, setSignInData] = useState({ email: '', password: '' });
  const [signUpData, setSignUpData] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [authError, setAuthError] = useState('');
  const [authSuccess, setAuthSuccess] = useState('');

  // ── Guest ─────────────────────────────────────────────────────────────────────
  const [guest, setGuest] = useState<GuestRecord | null>(extGuest || null);
  const [profileForm, setProfileForm] = useState({ name: '', phone: '', address: '', city: '', state: '', pinCode: '' });
  const [editingProfile, setEditingProfile] = useState(false);

  // ── View & navigation ─────────────────────────────────────────────────────────
  const [view, setView] = useState<View>('search');
  const [bookingTab, setBookingTab] = useState<BookingTab>('active');
  const [myBookings, setMyBookings] = useState<BookingEntry[]>([]);

  // ── Search ────────────────────────────────────────────────────────────────────
  const [searchParams, setSearchParams] = useState(initialSearchParams || {
    location: '', checkIn: '', checkOut: '', adults: 2, children: 0, coordinates: { lat: 0, lng: 0 }
  });
  const [nameQuery, setNameQuery] = useState('');

  // ── Property selection ────────────────────────────────────────────────────────
  const [selectedProp, setSelectedProp] = useState<PartnerProperty | null>(null);
  const [propData, setPropData] = useState<PartnerPropertyData | null>(null);
  const [propImages, setPropImages] = useState<string[]>([]);
  const [propImgIdx, setPropImgIdx] = useState(0);

  // ── Room selection & detail ───────────────────────────────────────────────────
  const [selectedRoom, setSelectedRoom] = useState<PartnerRoomData | null>(null);
  const [viewingRoom, setViewingRoom] = useState<PartnerRoomData | null>(null);
  const [roomImgIdx, setRoomImgIdx] = useState(0);

  // ── Booking form ──────────────────────────────────────────────────────────────
  const [visitors, setVisitors] = useState<VisitorDetail[]>([]);
  const [confirmedBooking, setConfirmedBooking] = useState<BookingEntry | null>(null);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponResult | null>(null);

  // ── Toast ─────────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState<{ msg: string; type: 'success'|'error' } | null>(null);
  const showToast = (msg: string, type: 'success'|'error' = 'success') => setToast({ msg, type });

  // ── Live partner properties ───────────────────────────────────────────────────
  const [allProps, setAllProps] = useState<PartnerProperty[]>([]);
  useEffect(() => {
    // Load approved partner properties directly from Supabase
    async function loadProps() {
      try {
        const { supabase } = await import('../utils/db');
        const { data: approvedPartners } = await supabase
          .from('partners').select('id').eq('approved', true);
        const ids = (approvedPartners || []).map((p: any) => p.id);
        if (ids.length === 0) { setAllProps([]); return; }
        const { data: props } = await supabase
          .from('partner_properties').select('*').eq('active', true).in('partner_id', ids);
        if (props) {
          setAllProps(props.map((p: any) => ({
            id: p.id, partnerId: p.partner_id, partnerName: p.partner_name,
            partnerEmail: p.partner_email, name: p.name, location: p.location,
            description: p.description, price: p.price, pricePerNight: p.price_per_night,
            type: p.type, image: p.image, rating: p.rating, rooms: p.rooms,
            maxGuests: p.max_guests, amenities: p.amenities || [], active: p.active,
            createdAt: p.created_at,
          })));
        }
      } catch {
        setAllProps(getApprovedPartnerProperties()); // fallback
      }
    }
    loadProps();
  }, []);

  // ── Sync guest ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (extGuest) {
      setGuest(extGuest);
      setProfileForm({ name: extGuest.name, phone: extGuest.phone, address: extGuest.address || '', city: extGuest.city || '', state: extGuest.state || '', pinCode: extGuest.pinCode || '' });
    }
  }, [extGuest]);

  const refreshBookings = useCallback(async () => {
    if (!guest) return;
    try {
      const { supabase } = await import('../utils/db');
      const { mapDbBooking } = await import('../utils/auth');
      const { data } = await supabase
        .from('bookings')
        .select('*')
        .eq('guest_email', guest.email)
        .in('booking_status', ['Confirmed', 'Cancelled', 'No Show'])
        .order('created_at', { ascending: false });
      if (data) setMyBookings(data.map(mapDbBooking));
    } catch {
      setMyBookings(getAllBookings().filter(b => b.guestEmail === guest.email && (b.bookingStatus === 'Confirmed' || b.bookingStatus === 'Cancelled' || b.bookingStatus === 'No Show')));
    }
  }, [guest]);

  // Load bookings on sign-in + real-time subscription
  useEffect(() => {
    refreshBookings();
    if (!guest) return;
    let channel: any;
    import('../utils/db').then(({ supabase }) => {
      channel = supabase
        .channel(`guest_bookings_${guest.email}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'bookings',
          filter: `guest_email=eq.${guest.email}`,
        }, () => { refreshBookings(); })
        .subscribe();
    });
    return () => {
      if (channel) import('../utils/db').then(({ supabase }) => supabase.removeChannel(channel));
    };
  }, [guest, refreshBookings]);

  const today = new Date().toISOString().split('T')[0];
  const isClosed = (b: BookingEntry) => b.bookingStatus === 'Cancelled' || b.bookingStatus === 'No Show';
  const activeBookings = myBookings.filter(b => !isClosed(b) && (b.checkOut || b.tripDate || '') >= today);
  const pastBookings = myBookings.filter(b => !isClosed(b) && (b.checkOut || b.tripDate || '') < today);
  const cancelledBookings = myBookings.filter(b => isClosed(b));

  // ── Filter properties ─────────────────────────────────────────────────────────
  const filteredProps = useMemo(() => {
    let list = allProps;
    const loc = searchParams.location.trim().toLowerCase();
    const name = nameQuery.trim().toLowerCase();
    if (loc) {
      const { lat, lng } = searchParams.coordinates || { lat: 0, lng: 0 };
      if (lat !== 0 && lng !== 0) {
        list = list.filter(p => {
          const dlat = (p.location.split(',')[0] as any - lat) * Math.PI / 180;
          const dlng = (0 - lng) * Math.PI / 180;
          const a = Math.sin(dlat/2)**2 + Math.cos(lat*Math.PI/180)*Math.cos(0)*Math.sin(dlng/2)**2;
          return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)) <= 300;
        });
        if (list.length === 0) list = allProps.filter(p => p.location.toLowerCase().includes(loc));
      } else {
        list = list.filter(p => p.location.toLowerCase().includes(loc) || p.name.toLowerCase().includes(loc));
      }
    }
    if (name) list = list.filter(p => p.name.toLowerCase().includes(name) || p.location.toLowerCase().includes(name));
    return list;
  }, [allProps, searchParams.location, searchParams.coordinates, nameQuery]);

  const [displayProps, setDisplayProps] = useState<PartnerProperty[]>([]);
  useEffect(() => {
    if (nameQuery || searchParams.location) { setDisplayProps(filteredProps); }
    else { setDisplayProps(shuffled(allProps)); }
  }, [filteredProps, allProps, nameQuery, searchParams.location]);

  // ── Property name suggestions ─────────────────────────────────────────────────
  const nameSuggestions = useMemo(() => {
    if (!nameQuery.trim() || nameQuery.length < 2) return [];
    return allProps.filter(p => p.name.toLowerCase().includes(nameQuery.toLowerCase())).slice(0, 6);
  }, [allProps, nameQuery]);

  // ── Auth handlers ─────────────────────────────────────────────────────────────
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault(); setAuthError('');
    if (!isValidEmail(signInData.email)) { setAuthError('Enter a valid email'); return; }
    if (!await validateGuestLoginAsync(signInData.email, signInData.password)) { setAuthError('Invalid email or password.'); return; }
    const g = getGuestByEmail(signInData.email);
    if (g) { setGuest(g); setExtGuest?.(g); setProfileForm({ name: g.name, phone: g.phone, address: g.address||'', city: g.city||'', state: g.state||'', pinCode: g.pinCode||'' }); }
    setIsSignedIn(true); setSignInData({ email: '', password: '' });
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault(); setAuthError(''); setAuthSuccess('');
    if (!signUpData.name.trim()) { setAuthError('Enter your full name'); return; }
    if (!isValidEmail(signUpData.email)) { setAuthError('Enter a valid email'); return; }
    if (signUpData.phone.replace(/\D/g,'').length < 10) { setAuthError('Enter a valid mobile number'); return; }
    if (!isValidPassword(signUpData.password)) { setAuthError('Password needs 8+ chars with upper, lower and number'); return; }
    if (signUpData.password !== signUpData.confirmPassword) { setAuthError('Passwords do not match'); return; }
    if (!registerGuest(signUpData.email, signUpData.password, signUpData.name, signUpData.phone)) { setAuthError('Email already registered. Please sign in.'); return; }
    sendWelcomeEmail('guest', signUpData.email, signUpData.name);
    PixelEvents.guestSignup();
    setAuthSuccess(`Account created! Welcome email sent to ${signUpData.email}`);
    setTimeout(() => { setShowSignIn(true); setSignUpData({ name:'', email:'', phone:'', password:'', confirmPassword:'' }); setAuthSuccess(''); }, 3500);
  };

  const handleSignOut = () => { setIsSignedIn(false); setGuest(null); setExtGuest?.(null); setView('search'); setMyBookings([]); };

  // ── Profile update ────────────────────────────────────────────────────────────
  const saveProfile = () => {
    if (!guest) return;
    updateGuest(guest.email, profileForm);
    const updated = getGuestByEmail(guest.email);
    if (updated) { setGuest(updated); setExtGuest?.(updated); }
    setEditingProfile(false); showToast('Profile updated successfully!');
  };

  // ── Property selection — load from Supabase directly ─────────────────────────
  const selectProperty = async (prop: PartnerProperty) => {
    setSelectedProp(prop);
    setPropData(null);
    setPropImages([getMainImage(prop)]);  // show main image immediately
    setPropImgIdx(0);
    setView('property');
    PixelEvents.viewProperty(prop.name);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Load full property data from Supabase (rooms, full gallery, descriptions)
    try {
      const { supabase } = await import('../utils/db');
      const { data } = await supabase
        .from('partner_property_data')
        .select('*')
        .eq('partner_id', prop.partnerId)
        .single();
      if (data) {
        const mapped = {
          partnerId: data.partner_id,
          propertyName: data.property_name ?? '',
          propertyType: data.property_type ?? '',
          addressLine1: data.address_line1 ?? '',
          addressLine2: data.address_line2 ?? '',
          city: data.city ?? '', state: data.state ?? '',
          pinCode: data.pin_code ?? '', country: data.country ?? 'India',
          lat: data.lat ?? 0, lng: data.lng ?? 0,
          mapAddress: data.map_address ?? '',
          description: data.description ?? '',
          amenities: data.amenities ?? [],
          checkInTime: data.check_in_time ?? '14:00',
          checkOutTime: data.check_out_time ?? '11:00',
          cancellationPolicy: data.cancellation_policy ?? 'free-24h',
          petsAllowed: data.pets_allowed ?? false,
          smokingAllowed: data.smoking_allowed ?? false,
          partiesAllowed: data.parties_allowed ?? false,
          rooms: data.rooms ?? [],
          images: data.images ?? [],
          updatedAt: data.updated_at ?? '',
        };
        setPropData(mapped as any);
        // Build gallery from property images (main first, then rest)
        const imgs: string[] = [];
        if ((data.images || []).length > 0) {
          const sorted = [...(data.images || [])].sort((a: any, b: any) => (b.isMainImage ? 1 : 0) - (a.isMainImage ? 1 : 0));
          sorted.forEach((img: any) => { if (img.url) imgs.push(img.url); });
        }
        if (imgs.length === 0) imgs.push(getMainImage(prop));
        setPropImages(imgs);
      }
    } catch (e) {
      console.warn('[BookStays] Failed to load property data from Supabase:', e);
    }
  };

  // ── Room occupancy filter ─────────────────────────────────────────────────────
  const totalGuests = searchParams.adults + searchParams.children;
  const availableRooms = useMemo(() => {
    if (!propData?.rooms) return [];
    const inv = selectedProp ? getInventory(selectedProp.partnerId) : [];
    return propData.rooms.filter(room => {
      if (room.maxOccupancy < totalGuests) return false;
      const slot = inv.find(s => s.roomId === room.id);
      const available = slot ? slot.available : room.available;
      return available > 0 && (!slot || slot.status === 'available');
    });
  }, [propData, selectedProp, totalGuests]);

  const soldOutRooms = useMemo(() => {
    if (!propData?.rooms) return [];
    const inv = selectedProp ? getInventory(selectedProp.partnerId) : [];
    return propData.rooms.filter(room => {
      const slot = inv.find(s => s.roomId === room.id);
      return slot ? (slot.available === 0 || slot.status !== 'available') : false;
    });
  }, [propData, selectedProp]);

  // ── Room detail view ──────────────────────────────────────────────────────────
  const viewRoomDetails = (room: PartnerRoomData) => {
    setViewingRoom(room); setRoomImgIdx(0);
    setView('room-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const proceedToBooking = (room: PartnerRoomData) => {
    setSelectedRoom(room); setRoomImgIdx(0);
    const total = searchParams.adults + searchParams.children;
    setVisitors(Array.from({ length: total }, () => ({ name: '', age: '', sex: 'Male' as const })));
    setAppliedCoupon(null);
    setView('booking');
    PixelEvents.startBooking(selectedProp?.name || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Confirm booking ───────────────────────────────────────────────────────────
  const confirmBooking = () => {
    if (!selectedProp || !selectedRoom || !guest) return;
    const nights = calcNights(searchParams.checkIn, searchParams.checkOut);
    const baseTotal = selectedRoom.basePrice * nights;
    const finalTotal = appliedCoupon ? appliedCoupon.finalAmount : baseTotal;
    const ref = `BKG-${Date.now().toString().slice(-8)}`;
    const booking: BookingEntry = {
      id: Date.now().toString(), bookingRef: ref, type: 'hotel',
      partnerId: selectedProp.partnerId, partnerEmail: selectedProp.partnerEmail,
      propertyId: selectedProp.id, propertyName: selectedProp.name, propertyLocation: selectedProp.location,
      guestName: guest.name, guestEmail: guest.email, guestPhone: guest.phone, guestAddress: guest.address || '',
      adults: searchParams.adults, children: searchParams.children,
      checkIn: searchParams.checkIn, checkOut: searchParams.checkOut, nights,
      roomType: selectedRoom.type, roomId: selectedRoom.id,
      totalAmount: finalTotal, advanceAmount: 0,
      paymentStatus: 'Pending — Pay at Check-in', bookingStatus: 'Confirmed',
      bookingDate: new Date().toISOString().split('T')[0],
      visitors: visitors.filter(v => v.name.trim()),
      ...(appliedCoupon ? { couponCode: appliedCoupon.couponCode, couponDiscount: appliedCoupon.discountAmount, originalAmount: baseTotal } as any : {}),
    };
    saveBooking(booking);
    if (appliedCoupon) { redeemCoupon(appliedCoupon.couponId, guest.id); refreshCouponStatuses(); }
    sendBookingConfirmationEmail(booking);
    sendBookingNotificationEmail(booking);
    PixelEvents.completeBooking(ref, finalTotal);
    WA.newBooking({ bookingRef: ref, guestName: guest.name, propertyName: selectedProp.name, roomType: selectedRoom?.type, adults: searchParams.adults, children: searchParams.children, checkIn: searchParams.checkIn, checkOut: searchParams.checkOut, totalAmount: finalTotal });
    setConfirmedBooking(booking);
    refreshBookings();
    setView('success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelBooking = (id: string) => {
    if (!confirm('Cancel this booking?')) return;
    updateBookingStatus(id, 'Cancelled');
    const bk = getAllBookings().find(b => b.id === id);
    if (bk && guest) {
      sendBookingCancellationEmail(bk, guest.name);
      WA.bookingCancelled({ bookingRef: bk.bookingRef, guestName: bk.guestName, propertyName: bk.propertyName, totalAmount: bk.totalAmount });
    }
    refreshBookings();
    showToast('Booking cancelled. Refund will be processed in 5–7 business days.');
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // AUTH SCREEN (not signed in)
  // ─────────────────────────────────────────────────────────────────────────────
  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-background">
        <div className="w-full bg-black"><ImageWithFallback src={heroImage} alt="Book Stays" className="w-full h-auto object-contain" /></div>
        <div className="flex items-center justify-center py-12 px-4 bg-gradient-to-br from-background to-muted/30">
          <div className="max-w-md w-full">
            <div className="text-center mb-8">
              <h1 className="text-4xl mb-3">Your Next Adventure Starts Here!</h1>
              <p className="text-muted-foreground">Discover and book unique stays across Northeast India.</p>
            </div>
            <div className="bg-card rounded-xl shadow-xl p-8">
              {showForgotPwd ? (
                <ForgotPassword accountType="guest" onBack={() => setShowForgotPwd(false)} onSuccess={() => { setShowForgotPwd(false); setShowSignIn(true); }} />
              ) : (<>
                <div className="flex gap-2 mb-6 bg-muted/50 p-1 rounded-lg">
                  <button onClick={() => { setShowSignIn(true); setAuthError(''); setAuthSuccess(''); }} className={`flex-1 py-2 rounded-md text-sm transition-colors ${showSignIn ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted/30'}`}>Sign In</button>
                  <button onClick={() => { setShowSignIn(false); setAuthError(''); setAuthSuccess(''); }} className={`flex-1 py-2 rounded-md text-sm transition-colors ${!showSignIn ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted/30'}`}>Create Account</button>
                </div>
                {authError && <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm"><AlertCircle className="h-4 w-4 flex-shrink-0" />{authError}</div>}
                {authSuccess && <div className="mb-4 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm"><CheckCircle className="h-4 w-4 flex-shrink-0" />{authSuccess}</div>}
                {showSignIn ? (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div><label className="block mb-2 text-sm">Email</label>
                      <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <input type="email" className="w-full pl-10 pr-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring" placeholder="your@email.com" autoComplete="email" name="email" value={signInData.email} onChange={e => setSignInData({...signInData, email: e.target.value})} required /></div></div>
                    <div><label className="block mb-2 text-sm">Password</label>
                      <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <input type="password" className="w-full pl-10 pr-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Enter password" autoComplete="current-password" name="password" value={signInData.password} onChange={e => setSignInData({...signInData, password: e.target.value})} required /></div></div>
                    <div className="flex justify-end"><button type="button" onClick={() => setShowForgotPwd(true)} className="text-sm text-primary hover:underline">Forgot Password?</button></div>
                    <button type="submit" className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">Sign In</button>
                    <p className="text-center text-sm text-muted-foreground">No account? <button type="button" onClick={() => setShowSignIn(false)} className="text-primary hover:underline">Create one →</button></p>
                  </form>
                ) : (
                  <form onSubmit={handleSignUp} className="space-y-4">
                    {([['Full Name *','text','name','John Smith',User,'name'],['Email *','email','email','your@email.com',Mail,'email'],['Mobile *','tel','phone','10-digit mobile',Phone,'tel']] as [string,string,string,string,any,string][]).map(([label,type,key,ph,Icon,ac])=>(
                      <div key={key}><label className="block mb-2 text-sm">{label}</label>
                        <div className="relative"><Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                          <input type={type} className="w-full pl-10 pr-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring" placeholder={ph} autoComplete={ac} name={key} value={(signUpData as any)[key]} onChange={e=>setSignUpData({...signUpData,[key]:e.target.value})} required /></div></div>
                    ))}
                    <div><label className="block mb-2 text-sm">Password *</label>
                      <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <input type="password" className="w-full pl-10 pr-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Min 8 chars" autoComplete="new-password" name="password" value={signUpData.password} onChange={e=>setSignUpData({...signUpData,password:e.target.value})} required /></div>
                      {signUpData.password && (() => { const s = getPasswordStrength(signUpData.password); return <p className="text-xs mt-1">Strength: <span className={s.strength>=5?'text-green-600 font-medium':s.strength>=3?'text-orange-500 font-medium':'text-red-600 font-medium'}>{s.message}</span></p>; })()}
                    </div>
                    <div><label className="block mb-2 text-sm">Confirm Password *</label>
                      <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <input type="password" className="w-full pl-10 pr-4 py-3 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Confirm" autoComplete="new-password" name="confirmPassword" value={signUpData.confirmPassword} onChange={e=>setSignUpData({...signUpData,confirmPassword:e.target.value})} required /></div></div>
                    <label className="flex items-start gap-2 text-sm text-muted-foreground cursor-pointer"><input type="checkbox" className="mt-0.5 rounded" required /><span>I agree to Terms &amp; Conditions</span></label>
                    <button type="submit" className="w-full py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">Create Account</button>
                  </form>
                )}
              </>)}
            </div>
          </div>
        </div>
        <Footer setCurrentPage={setCurrentPage} />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // LOGGED-IN LAYOUT
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Welcome header */}
      <div className="bg-primary text-primary-foreground shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center font-bold text-base">
              {(guest?.name || 'G').charAt(0).toUpperCase()}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs text-primary-foreground/70">Welcome back</p>
              <p className="font-semibold leading-tight">Hi, {guest?.name?.split(' ')[0] || 'Guest'} 👋</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {([['search','Search',Home],['profile','My Account',User],['bookings-nav','Bookings',BookOpen]] as [string,string,any][]).map(([id,label,Icon]) => (
              <button key={id} onClick={() => { if(id==='bookings-nav'){setBookingTab('active');setView('profile');refreshBookings();} else if(id==='search'){setView('search');} else setView('profile'); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${(view===id||(id==='search'&&view==='search')||(id==='profile'&&view==='profile')) ? 'bg-white/20 font-medium' : 'hover:bg-white/10'}`}>
                <Icon className="h-4 w-4" /><span className="hidden md:inline">{label}</span>
                {id==='bookings-nav'&&activeBookings.length>0&&<span className="bg-white text-primary text-xs rounded-full px-1.5 py-0.5 font-bold">{activeBookings.length}</span>}
              </button>
            ))}
            <button onClick={handleSignOut} className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm ml-1">
              <LogOut className="h-4 w-4" /><span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* ══ STEP 1 – SEARCH ══ */}
      {view === 'search' && (
        <>
          <div className="w-full bg-black"><ImageWithFallback src={heroImage} alt="Book Stays" className="w-full h-auto object-contain" /></div>

          {/* Search bar */}
          <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-8 shadow-lg">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-5 shadow-2xl">
                <div className="grid md:grid-cols-12 gap-4">
                  {/* Location */}
                  <div className="md:col-span-3">
                    <label className="block mb-2 text-sm">Location</label>
                    <LocationAutocomplete value={searchParams.location} onChange={(v, place) => setSearchParams(p => ({ ...p, location: v, coordinates: place ? { lat: place.lat, lng: place.lng } : { lat:0,lng:0 } }))} placeholder="Guwahati, Shillong…" className="bg-white text-foreground" />
                  </div>
                  {/* Property name search */}
                  <div className="md:col-span-3 relative">
                    <label className="block mb-2 text-sm">Property Name</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <input type="text" className="w-full pl-10 pr-4 py-3 bg-white rounded-lg border-0 text-foreground focus:outline-none focus:ring-2 focus:ring-white" placeholder="Search property name…" value={nameQuery} onChange={e => setNameQuery(e.target.value)} />
                    </div>
                    {nameSuggestions.length > 0 && nameQuery.length >= 2 && (
                      <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-border rounded-lg shadow-xl overflow-hidden">
                        {nameSuggestions.map(p => (
                          <button key={p.id} onClick={() => { setNameQuery(p.name); selectProperty(p); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 text-left text-sm">
                            <img src={getMainImage(p)} alt="" className="w-10 h-8 object-cover rounded flex-shrink-0" />
                            <div><p className="font-medium text-foreground">{p.name}</p><p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{p.location}</p></div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Dates */}
                  <div className="md:col-span-2">
                    <label className="block mb-2 text-sm">Check-in</label>
                    <div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <input type="date" min={today} className="w-full pl-10 pr-3 py-3 bg-white rounded-lg border-0 text-foreground focus:outline-none focus:ring-2 focus:ring-white" value={searchParams.checkIn} onChange={e => setSearchParams(p => ({...p, checkIn: e.target.value}))} /></div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block mb-2 text-sm">Check-out</label>
                    <div className="relative"><Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <input type="date" min={searchParams.checkIn || today} className="w-full pl-10 pr-3 py-3 bg-white rounded-lg border-0 text-foreground focus:outline-none focus:ring-2 focus:ring-white" value={searchParams.checkOut} onChange={e => setSearchParams(p => ({...p, checkOut: e.target.value}))} /></div>
                  </div>
                  {/* Guests */}
                  <div className="md:col-span-2">
                    <label className="block mb-2 text-sm">Guests</label>
                    <div className="flex items-center bg-white rounded-lg">
                      <button type="button" onClick={() => setSearchParams(p => ({...p, adults: Math.max(1, p.adults-1)}))} className="p-3 hover:bg-muted/20 rounded-l-lg"><Minus className="h-5 w-5 text-foreground" /></button>
                      <span className="flex-1 text-center py-3 font-medium text-foreground">{searchParams.adults + searchParams.children}</span>
                      <button type="button" onClick={() => setSearchParams(p => ({...p, adults: p.adults+1}))} className="p-3 hover:bg-muted/20 rounded-r-lg"><Plus className="h-5 w-5 text-foreground" /></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Property grid */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl mb-1">{searchParams.location || nameQuery ? 'Search Results' : 'Available Stays'}</h2>
                {(searchParams.location || nameQuery) && <p className="text-sm text-muted-foreground">{displayProps.length} propert{displayProps.length!==1?'ies':'y'} found</p>}
              </div>
            </div>

            {displayProps.length === 0 ? (
              <div className="text-center py-16">
                <Search className="h-14 w-14 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl mb-2">No properties found</h3>
                <p className="text-muted-foreground mb-4">Try a different location or property name.</p>
                <button onClick={() => { setSearchParams(p=>({...p,location:'',coordinates:{lat:0,lng:0}})); setNameQuery(''); }} className="px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90">Clear Search</button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayProps.map(prop => (
                  <div key={prop.id} onClick={() => selectProperty(prop)} className="bg-card rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer group">
                    <div className="relative h-52 overflow-hidden">
                      <img src={getMainImage(prop)} alt={prop.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      {prop.type === 'Bonoriya Own' && (
                        <div className="absolute top-3 left-3 bg-primary text-primary-foreground px-2.5 py-1 rounded-full text-xs font-medium">
                          BONORIYA Own
                        </div>
                      )}
                      <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2.5 py-1.5 rounded-full text-sm font-semibold flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        {parseFloat(prop.rating) > 0 ? prop.rating : 'New'}
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="text-lg font-medium mb-1">{prop.name}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mb-3"><MapPin className="h-4 w-4 flex-shrink-0" />{prop.location}</p>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{prop.description}</p>
                      <div className="flex items-center justify-between">
                        <div><span className="text-xl font-semibold">{prop.price}</span><span className="text-sm text-muted-foreground">/night</span></div>
                        <button className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 text-sm">View <ChevronRight className="h-4 w-4" /></button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ══ STEP 2 – PROPERTY OVERVIEW ══ */}
      {view === 'property' && selectedProp && (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button onClick={() => setView('search')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Search
          </button>

          {/* Image gallery */}
          {propImages.length > 0 && (
            <div className="relative h-72 md:h-96 rounded-2xl overflow-hidden mb-6 bg-muted">
              <img src={propImages[propImgIdx]} alt={selectedProp.name} className="w-full h-full object-cover" />
              {propImages.length > 1 && (
                <>
                  <button onClick={() => setPropImgIdx(i => (i-1+propImages.length)%propImages.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-forest-900/50 hover:bg-forest-900/80 text-white rounded-full flex items-center justify-center"><ChevronLeft className="h-6 w-6" /></button>
                  <button onClick={() => setPropImgIdx(i => (i+1)%propImages.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-forest-900/50 hover:bg-forest-900/80 text-white rounded-full flex items-center justify-center"><ChevronRight className="h-6 w-6" /></button>
                  <div className="absolute bottom-3 right-4 bg-forest-900/60 text-white text-xs px-2.5 py-1 rounded-full">{propImgIdx+1}/{propImages.length}</div>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {propImages.map((_,i) => <button key={i} onClick={() => setPropImgIdx(i)} className={`w-2 h-2 rounded-full transition-all ${i===propImgIdx?'bg-white scale-125':'bg-white/50'}`} />)}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Thumbnail strip */}
          {propImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto mb-6 pb-1">
              {propImages.map((url,i) => <button key={i} onClick={() => setPropImgIdx(i)} className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${i===propImgIdx?'border-primary shadow-md':'border-border opacity-70 hover:opacity-100'}`}><img src={url} alt="" className="w-full h-full object-cover" /></button>)}
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Header */}
              <div>
                <div className="flex items-start justify-between mb-2">
                  <h1 className="text-3xl font-medium">{selectedProp.name}</h1>
                  <div className="flex items-center gap-1 bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-sm font-medium flex-shrink-0">
                    <Star className="h-4 w-4 fill-current" />{parseFloat(selectedProp.rating)>0?selectedProp.rating:'New'}
                  </div>
                </div>
                <p className="text-muted-foreground flex items-center gap-1.5"><MapPin className="h-4 w-4" />{selectedProp.location}</p>
              </div>

              {/* Description */}
              {(propData?.description || selectedProp.description) && (
                <div>
                  <h2 className="text-lg font-medium mb-2">About this property</h2>
                  <p className="text-muted-foreground leading-relaxed">{propData?.description || selectedProp.description}</p>
                </div>
              )}

              {/* Amenities */}
              {(propData?.amenities || selectedProp.amenities)?.length > 0 && (
                <div>
                  <h2 className="text-lg font-medium mb-3">Amenities</h2>
                  <div className="flex flex-wrap gap-2">
                    {(propData?.amenities || selectedProp.amenities).map(a => <span key={a} className="px-3 py-1.5 bg-muted rounded-full text-sm">{a}</span>)}
                  </div>
                </div>
              )}

              {/* Check-in/out policies */}
              {propData && (
                <div>
                  <h2 className="text-lg font-medium mb-3">Policies</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-muted/30 rounded-lg"><p className="text-xs text-muted-foreground mb-1">Check-in</p><p className="font-medium">{propData.checkInTime || '14:00'}</p></div>
                    <div className="p-3 bg-muted/30 rounded-lg"><p className="text-xs text-muted-foreground mb-1">Check-out</p><p className="font-medium">{propData.checkOutTime || '11:00'}</p></div>
                    <div className="p-3 bg-muted/30 rounded-lg col-span-2"><p className="text-xs text-muted-foreground mb-1">Cancellation</p><p className="font-medium text-sm">{propData.cancellationPolicy==='free-24h'?'Free up to 24h before':propData.cancellationPolicy==='free-48h'?'Free up to 48h before':propData.cancellationPolicy==='free-7d'?'Free up to 7 days before':'Non-refundable'}</p></div>
                  </div>
                </div>
              )}
            </div>

            {/* Booking sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white border border-border rounded-2xl p-5 sticky top-24 shadow-sm">
                <p className="text-2xl font-semibold mb-1">{selectedProp.price}<span className="text-sm text-muted-foreground font-normal">/night</span></p>
                <div className="space-y-3 mb-5">
                  <div><label className="block text-xs text-muted-foreground mb-1">Check-in</label>
                    <input type="date" min={today} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-input-background" value={searchParams.checkIn} onChange={e => setSearchParams(p => ({...p, checkIn: e.target.value}))} /></div>
                  <div><label className="block text-xs text-muted-foreground mb-1">Check-out</label>
                    <input type="date" min={searchParams.checkIn||today} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-input-background" value={searchParams.checkOut} onChange={e => setSearchParams(p => ({...p, checkOut: e.target.value}))} /></div>
                  <div><label className="block text-xs text-muted-foreground mb-1">Guests (Adults + Children)</label>
                    <div className="flex items-center border border-border rounded-lg overflow-hidden">
                      <button onClick={() => setSearchParams(p=>({...p,adults:Math.max(1,p.adults-1)}))} className="px-3 py-2 hover:bg-muted"><Minus className="h-4 w-4" /></button>
                      <span className="flex-1 text-center text-sm py-2">{searchParams.adults} Adult{searchParams.adults!==1?'s':''}</span>
                      <button onClick={() => setSearchParams(p=>({...p,adults:p.adults+1}))} className="px-3 py-2 hover:bg-muted"><Plus className="h-4 w-4" /></button>
                    </div>
                  </div>
                </div>
                {searchParams.checkIn && searchParams.checkOut && (() => {
                  const n = calcNights(searchParams.checkIn, searchParams.checkOut);
                  return <p className="text-sm text-muted-foreground mb-4">{n} night{n>1?'s':''} · {searchParams.adults+searchParams.children} guest{searchParams.adults+searchParams.children>1?'s':''}</p>;
                })()}
                <button onClick={() => { setView('rooms'); window.scrollTo({top:0,behavior:'smooth'}); }}
                  className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl hover:opacity-90 font-semibold text-base transition-opacity">
                  SELECT ROOMS
                </button>
                <p className="text-xs text-muted-foreground text-center mt-2">You won't be charged yet</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ STEP 3 – ROOM LISTING ══ */}
      {view === 'rooms' && selectedProp && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button onClick={() => setView('property')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to {selectedProp.name}
          </button>
          <h2 className="text-2xl font-medium mb-2">Choose Your Room</h2>
          <p className="text-muted-foreground mb-6">
            Showing rooms for {searchParams.adults + searchParams.children} guest{searchParams.adults+searchParams.children>1?'s':''}
            {searchParams.checkIn && searchParams.checkOut && ` · ${calcNights(searchParams.checkIn, searchParams.checkOut)} night${calcNights(searchParams.checkIn,searchParams.checkOut)>1?'s':''}`}
          </p>

          {availableRooms.length === 0 && soldOutRooms.length === 0 && (
            <div className="text-center py-16 border-2 border-dashed border-border rounded-xl">
              <Bed className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
              <h3 className="text-lg mb-2">No rooms configured yet</h3>
              <p className="text-muted-foreground text-sm">The partner hasn't added room types for this property.</p>
            </div>
          )}

          <div className="space-y-5">
            {/* Available rooms */}
            {availableRooms.map(room => {
              const nights = calcNights(searchParams.checkIn, searchParams.checkOut);
              const total = room.basePrice * nights;
              const primaryPhoto = room.photos?.find(p => p.isPrimary) || room.photos?.[0];
              return (
                <div key={room.id} className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col md:flex-row">
                    {primaryPhoto && (
                      <div className="md:w-52 h-40 md:h-auto flex-shrink-0">
                        <img src={primaryPhoto.url} alt={room.type} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1 p-5">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-lg font-medium">{room.type}</h3>
                          <p className="text-sm text-muted-foreground">Up to {room.maxOccupancy} guests · {room.available} room{room.available!==1?'s':''} left</p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <p className="text-2xl font-semibold">₹{room.basePrice.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">per night</p>
                          {nights > 1 && <p className="text-sm text-primary font-medium">₹{total.toLocaleString()} total</p>}
                        </div>
                      </div>
                      {room.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{room.description}</p>}
                      <button onClick={() => viewRoomDetails(room)}
                        className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 text-sm font-medium transition-opacity">
                        View Room Details →
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Sold out rooms */}
            {soldOutRooms.map(room => (
              <div key={room.id} className="bg-gray-50 border border-border rounded-2xl overflow-hidden opacity-70">
                <div className="flex flex-col md:flex-row">
                  {(room.photos?.find(p=>p.isPrimary)||room.photos?.[0]) && (
                    <div className="md:w-52 h-40 md:h-auto flex-shrink-0">
                      <img src={(room.photos?.find(p=>p.isPrimary)||room.photos?.[0])?.url} alt={room.type} className="w-full h-full object-cover grayscale" />
                    </div>
                  )}
                  <div className="flex-1 p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-lg font-medium">{room.type}</h3>
                        <p className="text-sm text-red-600 font-medium">Sorry, you missed it!</p>
                      </div>
                      <p className="text-xl font-semibold text-muted-foreground ml-4">₹{room.basePrice.toLocaleString()}</p>
                    </div>
                    {room.description && <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{room.description}</p>}
                    <span className="inline-block px-4 py-2 bg-gray-200 text-gray-600 rounded-lg text-sm">Not Available</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ STEP 3b – ROOM DETAILS ══ */}
      {view === 'room-detail' && viewingRoom && selectedProp && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button onClick={() => setView('rooms')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Room List
          </button>

          <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-sm">
            {/* Room photo gallery */}
            {viewingRoom.photos && viewingRoom.photos.length > 0 ? (
              <div className="space-y-0">
                {/* Main photo */}
                <div className="relative h-72 md:h-96 bg-muted overflow-hidden">
                  {(() => {
                    const sorted = [...viewingRoom.photos].sort((a,b) => (b.isPrimary?1:0)-(a.isPrimary?1:0));
                    const photo = sorted[roomImgIdx] || sorted[0];
                    return (
                      <>
                        <img src={photo.url} alt={photo.label || viewingRoom.type} className="w-full h-full object-cover" />
                        {photo.label && <span className="absolute bottom-3 left-3 bg-forest-900/65 text-white text-xs px-3 py-1 rounded-full">{photo.label}</span>}
                        <span className="absolute top-3 right-3 bg-forest-900/60 text-white text-xs px-2.5 py-1 rounded-full">{roomImgIdx+1}/{sorted.length}</span>
                        {sorted.length > 1 && <>
                          <button onClick={() => setRoomImgIdx(i => (i-1+sorted.length)%sorted.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-forest-900/50 hover:bg-forest-900/80 text-white rounded-full flex items-center justify-center"><ChevronLeft className="h-6 w-6" /></button>
                          <button onClick={() => setRoomImgIdx(i => (i+1)%sorted.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-forest-900/50 hover:bg-forest-900/80 text-white rounded-full flex items-center justify-center"><ChevronRight className="h-6 w-6" /></button>
                          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                            {sorted.map((_,i) => <button key={i} onClick={() => setRoomImgIdx(i)} className={`w-2 h-2 rounded-full transition-all ${i===roomImgIdx?'bg-white scale-125':'bg-white/50'}`} />)}
                          </div>
                        </>}
                      </>
                    );
                  })()}
                </div>
                {/* Thumbnail strip */}
                {viewingRoom.photos.length > 1 && (
                  <div className="flex gap-2 p-3 overflow-x-auto bg-black/5 border-b border-border">
                    {[...viewingRoom.photos].sort((a,b)=>(b.isPrimary?1:0)-(a.isPrimary?1:0)).map((p,i) => (
                      <button key={p.id} onClick={() => setRoomImgIdx(i)} className={`flex-shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all ${i===roomImgIdx?'border-primary shadow-md scale-105':'border-transparent opacity-60 hover:opacity-90'}`}>
                        <img src={p.url} alt={p.label||''} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-48 bg-muted flex items-center justify-center">
                <Bed className="h-12 w-12 text-muted-foreground" />
              </div>
            )}

            {/* Room info */}
            <div className="p-6 md:p-8">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-semibold">{viewingRoom.type}</h1>
                  <p className="text-muted-foreground text-sm mt-1">{selectedProp.name} · {selectedProp.location}</p>
                </div>
                <div className="text-right flex-shrink-0 ml-6">
                  <p className="text-3xl font-semibold">₹{viewingRoom.basePrice.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">per night</p>
                  {searchParams.checkIn && searchParams.checkOut && (
                    <p className="text-sm text-primary font-medium mt-0.5">
                      ₹{(viewingRoom.basePrice * calcNights(searchParams.checkIn, searchParams.checkOut)).toLocaleString()} total
                    </p>
                  )}
                </div>
              </div>

              {/* Key facts */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                {[
                  { icon: Users, label: 'Max Guests', value: `${viewingRoom.maxOccupancy} persons` },
                  { icon: Bed, label: 'Occupancy', value: `${viewingRoom.baseOccupancy}–${viewingRoom.maxOccupancy}` },
                  { icon: Eye, label: 'Available', value: `${viewingRoom.available} room${viewingRoom.available!==1?'s':''}` },
                  { icon: Wifi, label: 'WiFi', value: 'Ask property' },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="p-3 bg-muted/20 rounded-xl border border-border">
                    <Icon className="h-4 w-4 text-primary mb-1" />
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-sm font-medium">{value}</p>
                  </div>
                ))}
              </div>

              {/* Description */}
              {viewingRoom.description && (
                <div className="mb-5">
                  <h3 className="font-semibold mb-2">Room Description</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{viewingRoom.description}</p>
                </div>
              )}

              {/* Photo labels as feature tags */}
              {viewingRoom.photos && viewingRoom.photos.length > 0 && (
                <div className="mb-5">
                  <h3 className="font-semibold mb-2">Room Features (from photos)</h3>
                  <div className="flex flex-wrap gap-2">
                    {[...new Set(viewingRoom.photos.map(p => p.label).filter(Boolean))].map(label => (
                      <span key={label} className="px-3 py-1.5 bg-muted rounded-full text-sm">{label}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Pricing info */}
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl mb-5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Price per night</span>
                  <span className="font-semibold">₹{viewingRoom.basePrice.toLocaleString()}</span>
                </div>
                {searchParams.checkIn && searchParams.checkOut && (
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-muted-foreground">{calcNights(searchParams.checkIn,searchParams.checkOut)} night(s) total</span>
                    <span className="font-semibold text-primary">₹{(viewingRoom.basePrice * calcNights(searchParams.checkIn,searchParams.checkOut)).toLocaleString()}</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">Full payment is due at check-in. No advance payment required for hotel bookings.</p>
              </div>

              {/* CTA */}
              <button
                onClick={() => proceedToBooking(viewingRoom)}
                className="w-full py-4 bg-primary text-primary-foreground rounded-xl hover:opacity-90 font-semibold text-base transition-opacity"
              >
                Select This Room — Proceed to Booking
              </button>
              <button onClick={() => setView('rooms')} className="w-full mt-3 py-3 border border-border rounded-xl hover:bg-muted text-sm transition-colors">
                Back to All Rooms
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ STEP 4 – BOOKING FORM ══ */}
      {view === 'booking' && selectedProp && selectedRoom && guest && (
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button onClick={() => setView('rooms')} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Rooms
          </button>

          <h2 className="text-2xl font-medium mb-6">Complete Your Booking</h2>

          {/* Booking summary */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 mb-6">
            <h3 className="font-medium mb-3">Booking Summary</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-muted-foreground text-xs">Property</p><p className="font-medium">{selectedProp.name}</p></div>
              <div><p className="text-muted-foreground text-xs">Room</p><p className="font-medium">{selectedRoom.type}</p></div>
              <div><p className="text-muted-foreground text-xs">Check-in</p><p className="font-medium">{searchParams.checkIn || 'Not set'}</p></div>
              <div><p className="text-muted-foreground text-xs">Check-out</p><p className="font-medium">{searchParams.checkOut || 'Not set'}</p></div>
              <div><p className="text-muted-foreground text-xs">Nights</p><p className="font-medium">{calcNights(searchParams.checkIn, searchParams.checkOut)}</p></div>
              <div><p className="text-muted-foreground text-xs">Guests</p><p className="font-medium">{searchParams.adults} Adults{searchParams.children > 0 ? ` + ${searchParams.children} Children` : ''}</p></div>
            </div>
            <div className="mt-3 pt-3 border-t border-primary/20 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total ({calcNights(searchParams.checkIn,searchParams.checkOut)} nights)</p>
                <p className="text-2xl font-semibold text-primary">₹{(selectedRoom.basePrice * calcNights(searchParams.checkIn,searchParams.checkOut)).toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Payment due</p>
                <p className="text-sm font-medium text-muted-foreground">At check-in</p>
              </div>
            </div>
          </div>

          {/* Guest account details (pre-filled) */}
          <div className="bg-white border border-border rounded-xl p-5 mb-6">
            <h3 className="font-medium mb-3">Primary Guest (from your account)</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[['Name', guest.name], ['Email', guest.email], ['Phone', guest.phone], ['Address', [guest.address, guest.city, guest.state].filter(Boolean).join(', ') || '—']].map(([l, v]) => (
                <div key={l}><p className="text-xs text-muted-foreground">{l}</p><p className="font-medium">{v || '—'}</p></div>
              ))}
            </div>
          </div>

          {/* Visitor details for each guest */}
          <div className="bg-white border border-border rounded-xl p-5 mb-6">
            <h3 className="font-medium mb-4">Guest Details</h3>
            <p className="text-sm text-muted-foreground mb-4">Please provide details for all guests staying.</p>
            <div className="space-y-4">
              {visitors.map((v, idx) => (
                <div key={idx} className="p-4 bg-muted/20 rounded-lg border border-border">
                  <p className="text-sm font-medium mb-3">Guest {idx + 1} {idx === 0 ? '(Primary)' : ''}</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-3 sm:col-span-1">
                      <label className="block text-xs text-muted-foreground mb-1">Full Name *</label>
                      <input className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder={idx===0?guest.name:'Guest name'} value={v.name} onChange={e => { const upd = [...visitors]; upd[idx] = {...v, name: e.target.value}; setVisitors(upd); }} />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Age *</label>
                      <input type="number" min="1" max="120" className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Age" value={v.age} onChange={e => { const upd = [...visitors]; upd[idx] = {...v, age: e.target.value}; setVisitors(upd); }} />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Sex *</label>
                      <select className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" value={v.sex} onChange={e => { const upd = [...visitors]; upd[idx] = {...v, sex: e.target.value as any}; setVisitors(upd); }}>
                        <option>Male</option><option>Female</option><option>Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Coupon / Promo Code ── */}
          {(() => {
            const nights = calcNights(searchParams.checkIn, searchParams.checkOut);
            const base = selectedRoom.basePrice * nights;
            const propType = selectedProp.type === 'Associated' ? 'associated' : 'bonoriya_own';
            const confirmedCount = getAllBookings().filter(b => b.guestEmail === guest.email && b.bookingStatus === 'Confirmed').length;
            return (
              <div className="mb-5">
                <CouponApply
                  bookingType="book-stays"
                  propertyType={propType as any}
                  totalAmount={base}
                  guestId={guest.id}
                  priorBookings={confirmedCount}
                  isNewUser={confirmedCount < 3}
                  isLoggedIn={isSignedIn}
                  applied={appliedCoupon}
                  onApply={setAppliedCoupon}
                />
              </div>
            );
          })()}

          {(!searchParams.checkIn || !searchParams.checkOut) && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" /> Please go back and set check-in and check-out dates.
            </div>
          )}

          <button
            onClick={confirmBooking}
            disabled={!searchParams.checkIn || !searchParams.checkOut}
            className="w-full py-4 bg-primary text-primary-foreground rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-base transition-opacity"
          >
            {appliedCoupon
              ? `Confirm Booking — ₹${appliedCoupon.finalAmount.toLocaleString()} payable at check-in`
              : `Confirm Booking — ₹${(selectedRoom.basePrice * calcNights(searchParams.checkIn,searchParams.checkOut)).toLocaleString()} payable at check-in`}
          </button>
          <p className="text-xs text-muted-foreground text-center mt-2">Full payment is due at check-in · All confirmation emails are sent from admin@bonoriya.com</p>
        </div>
      )}

      {/* ══ STEP 5 – SUCCESS ══ */}
      {view === 'success' && confirmedBooking && selectedProp && (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-5">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h2 className="text-3xl font-medium mb-2">Booking Confirmed!</h2>
            <p className="text-muted-foreground mb-6">Your stay at <strong>{selectedProp.name}</strong> is confirmed.</p>

            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-5 space-y-1.5 text-sm text-left">
              <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" /><span>Confirmation email sent to <strong>{guest?.email}</strong></span></div>
              <div className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" /><span>Booking notification sent to property and BONORIYA team</span></div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 text-left mb-5 space-y-2 text-sm">
              <p><strong>Ref:</strong> {confirmedBooking.bookingRef}</p>
              <p><strong>Property:</strong> {selectedProp.name}</p>
              <p><strong>Room:</strong> {selectedRoom?.type}</p>
              <p><strong>Check-in:</strong> {confirmedBooking.checkIn}</p>
              <p><strong>Check-out:</strong> {confirmedBooking.checkOut}</p>
              <p><strong>Total Amount:</strong> ₹{confirmedBooking.totalAmount.toLocaleString()} <span className="text-muted-foreground">(payable at check-in)</span></p>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setView('profile'); setBookingTab('active'); refreshBookings(); }} className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl hover:opacity-90">View My Bookings</button>
              <button onClick={() => { setView('search'); setSelectedProp(null); setSelectedRoom(null); }} className="flex-1 py-3 border border-border rounded-xl hover:bg-muted">Search More</button>
            </div>
          </div>
        </div>
      )}

      {/* ══ PROFILE + BOOKINGS ══ */}
      {view === 'profile' && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
          {/* Profile card */}
          <div className="bg-white rounded-xl border border-border p-6">
            <div className="flex items-center gap-4 mb-5">
              <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xl font-bold flex-shrink-0">
                {(guest?.name||'G').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-medium">{guest?.name}</h2>
                <p className="text-muted-foreground text-sm">{guest?.email}</p>
              </div>
              {!editingProfile && <button onClick={() => setEditingProfile(true)} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg hover:bg-muted text-sm flex-shrink-0"><Edit3 className="h-4 w-4" /> Edit</button>}
            </div>
            {editingProfile ? (
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div><label className="block text-sm mb-1">Full Name</label><input className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-sm" value={profileForm.name} onChange={e=>setProfileForm(f=>({...f,name:e.target.value}))} /></div>
                  <div><label className="block text-sm mb-1">Mobile</label><input className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-sm" value={profileForm.phone} onChange={e=>setProfileForm(f=>({...f,phone:e.target.value}))} /></div>
                  <div><label className="block text-sm mb-1">Address</label><input className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-sm" value={profileForm.address} onChange={e=>setProfileForm(f=>({...f,address:e.target.value}))} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="block text-sm mb-1">City</label><input className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-sm" value={profileForm.city} onChange={e=>setProfileForm(f=>({...f,city:e.target.value}))} /></div>
                    <div><label className="block text-sm mb-1">PIN</label><input maxLength={6} className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-sm" value={profileForm.pinCode} onChange={e=>setProfileForm(f=>({...f,pinCode:e.target.value.replace(/\D/g,'')}))} /></div>
                  </div>
                </div>
                <div className="flex gap-3 pt-1">
                  <button onClick={saveProfile} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 text-sm"><Save className="h-4 w-4" /> Save Changes</button>
                  <button onClick={() => setEditingProfile(false)} className="px-5 py-2.5 border border-border rounded-lg hover:bg-muted text-sm">Cancel</button>
                </div>
              </div>
            ) : (
              <div className="space-y-0">
                {[['Full Name', guest?.name], ['Email', guest?.email], ['Mobile', guest?.phone||'—'], ['Address', [guest?.address, guest?.city, guest?.state, guest?.pinCode].filter(Boolean).join(', ')||'—']].map(([l,v])=>(
                  <div key={l} className="flex py-2.5 border-b border-border last:border-0">
                    <span className="w-32 text-sm text-muted-foreground flex-shrink-0">{l}</span>
                    <span className="text-sm font-medium">{v||'—'}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bookings */}
          <div>
            <h2 className="text-2xl font-medium mb-4">My Bookings</h2>
            <div className="flex gap-1 mb-5 bg-muted/40 p-1 rounded-lg w-fit">
              {([['active','Active',activeBookings.length,Clock],['past','Past',pastBookings.length,CheckCircle],['cancelled','Cancelled',cancelledBookings.length,XCircle]] as const).map(([key,label,count,Icon])=>(
                <button key={key} onClick={() => setBookingTab(key)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm transition-colors ${bookingTab===key?'bg-primary text-primary-foreground shadow-sm':'hover:bg-muted/60'}`}>
                  <Icon className="h-4 w-4" />{label}{count>0&&<span className={`text-xs rounded-full px-1.5 ${bookingTab===key?'bg-white/20':'bg-muted text-muted-foreground'}`}>{count}</span>}
                </button>
              ))}
            </div>

            {bookingTab==='active' && (
              <div className="space-y-4">
                {activeBookings.length===0?(<div className="text-center py-12 border-2 border-dashed border-border rounded-xl"><Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground" /><p className="text-muted-foreground mb-3">No active bookings.</p><button onClick={()=>setView('search')} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90">Search Stays</button></div>)
                :activeBookings.map(b=><BookingCard key={b.id} booking={b} onCancel={()=>cancelBooking(b.id)} />)}
              </div>
            )}
            {bookingTab==='past' && (
              <div className="space-y-4">
                {pastBookings.length===0?(<div className="text-center py-12 border-2 border-dashed border-border rounded-xl"><CheckCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground" /><p className="text-muted-foreground">No completed stays yet.</p></div>)
                :pastBookings.map(b=><BookingCard key={b.id} booking={b} />)}
              </div>
            )}
            {bookingTab==='cancelled' && (
              <div className="space-y-4">
                {cancelledBookings.length===0?(<div className="text-center py-12 border-2 border-dashed border-border rounded-xl"><XCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground" /><p className="text-muted-foreground">No cancelled bookings.</p></div>)
                :cancelledBookings.map(b=><BookingCard key={b.id} booking={b} />)}
              </div>
            )}
          </div>
        </div>
      )}

      <Footer setCurrentPage={setCurrentPage} />
    </div>
  );
}
