// Authentication utilities for BONORIYA application

// ── Admin credentials stored securely in Supabase admin_settings ────────────
// No passwords are hardcoded in frontend code.
const DEFAULT_ADMIN_EMAIL = 'admin@bonoriya.com';

// ── Browser-native SHA-256 (no external deps) ─────────────────────────────
export async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Login rate limiter (resets on page reload) ────────────────────────────
const _loginAttempts: Record<string, { count: number; lockedUntil: number }> = {};
const LOGIN_MAX_ATTEMPTS = 5;
const LOGIN_LOCKOUT_MS   = 15 * 60 * 1000; // 15 minutes

export function checkLoginRateLimit(key: string): { allowed: boolean; remaining: number; lockedUntil?: number } {
  const now = Date.now();
  if (!_loginAttempts[key]) _loginAttempts[key] = { count: 0, lockedUntil: 0 };
  const e = _loginAttempts[key];
  if (e.lockedUntil > now) return { allowed: false, remaining: 0, lockedUntil: e.lockedUntil };
  if (e.lockedUntil <= now && e.lockedUntil > 0) { e.count = 0; e.lockedUntil = 0; }
  return { allowed: true, remaining: LOGIN_MAX_ATTEMPTS - e.count };
}

export function recordFailedLogin(key: string): { allowed: boolean; remaining: number; lockedUntil?: number } {
  if (!_loginAttempts[key]) _loginAttempts[key] = { count: 0, lockedUntil: 0 };
  _loginAttempts[key].count++;
  if (_loginAttempts[key].count >= LOGIN_MAX_ATTEMPTS)
    _loginAttempts[key].lockedUntil = Date.now() + LOGIN_LOCKOUT_MS;
  return checkLoginRateLimit(key);
}

export function clearLoginAttempts(key: string): void { delete _loginAttempts[key]; }

export const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const isValidPassword = (password: string): boolean =>
  password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /[0-9]/.test(password);

export const getPasswordStrength = (password: string): { strength: number; message: string } => {
  let s = 0;
  if (password.length >= 8) s++;
  if (password.length >= 12) s++;
  if (/[A-Z]/.test(password)) s++;
  if (/[a-z]/.test(password)) s++;
  if (/[0-9]/.test(password)) s++;
  if (/[^A-Za-z0-9]/.test(password)) s++;
  if (s <= 2) return { strength: s, message: 'Weak' };
  if (s <= 4) return { strength: s, message: 'Medium' };
  return { strength: s, message: 'Strong' };
};

// ─── Constants ───────────────────────────────────────────────────────────────

export interface EmailConfig { serviceId: string; templateId: string; publicKey: string; enabled: boolean; }
const _ECFG_KEY = 'bonoriya_email_config';
const BONORIYA_EMAIL_DEFAULTS: EmailConfig = {
  serviceId:  'service_pnx639a',
  templateId: 'template_2t46jg3',
  publicKey:  'RwQbvq5MeKDZYwBj',
  enabled:    true,
};
const BONORIYA_PROPERTY_KEY = 'bonoriya_own_property';
const _invKey = (pid: string) => `bonoriya_inventory_${pid}`;
const _DT_KEY = 'bonoriya_daytrip_availability';

// ─── In-memory caches — declared BEFORE initSupabase to avoid temporal dead zone ──

// These are populated from localStorage on module load, then refreshed from Supabase by initSupabase()
// eslint-disable-next-line prefer-const
let _partnersCache: any[] = JSON.parse(localStorage.getItem('bonoriya_partners') || '[]');
// eslint-disable-next-line prefer-const
let _allPropsCache: any[] = JSON.parse(localStorage.getItem('bonoriya_partner_properties') || '[]');
// eslint-disable-next-line prefer-const
let _approvedPropsCache: any[] = (() => {
  const stored = localStorage.getItem('bonoriya_partner_properties_approved');
  if (stored) return JSON.parse(stored);
  const approvedIds = new Set(
    JSON.parse(localStorage.getItem('bonoriya_partners') || '[]')
      .filter((p: any) => p.approved).map((p: any) => p.id)
  );
  return JSON.parse(localStorage.getItem('bonoriya_partner_properties') || '[]')
    .filter((p: any) => approvedIds.has(p.partnerId) && p.active);
})();
// eslint-disable-next-line prefer-const
let _bookingsCache: any[] = JSON.parse(localStorage.getItem('bonoriya_bookings') || '[]');
// eslint-disable-next-line prefer-const
let _dayTripAvailCache: any[] = JSON.parse(localStorage.getItem(_DT_KEY) || '[]');

// ─── Supabase Hydration ──────────────────────────────────────────────────────

/**
 * Hydrate localStorage caches from Supabase on app load.
 * Call this once early in the app (e.g. in _app.tsx or layout.tsx).
 * This ensures sync-compatible functions return fresh data on first render.
 */
export async function initSupabase(): Promise<void> {
  try {
    const { supabase } = await import('./db');

    // 1. Approved partner properties
    const approvedPartners = await supabase.from('partners').select('id').eq('approved', true);
    const approvedIds = (approvedPartners.data || []).map((p: any) => p.id);
    if (approvedIds.length > 0) {
      const { data: props } = await supabase.from('partner_properties')
        .select('*').eq('active', true).in('partner_id', approvedIds);
      if (props) {
        _approvedPropsCache = props.map(mapDbProperty);
        localStorage.setItem('bonoriya_partner_properties_approved', JSON.stringify(_approvedPropsCache));
      }
    } else {
      _approvedPropsCache = [];
      localStorage.setItem('bonoriya_partner_properties_approved', JSON.stringify([]));
    }

    // 2. All partners cache
    const { data: allPartners } = await supabase.from('partners').select('*').order('created_at');
    if (allPartners) {
      _partnersCache = allPartners.map(mapDbPartner);
      localStorage.setItem('bonoriya_partners', JSON.stringify(_partnersCache));
    }

    // 3. All partner properties cache
    const { data: allProps } = await supabase.from('partner_properties').select('*').order('created_at');
    if (allProps) {
      _allPropsCache = allProps.map(mapDbProperty);
      localStorage.setItem('bonoriya_partner_properties', JSON.stringify(_allPropsCache));
    }

    // 4. Bonoriya property data
    const { data: bonoriya } = await supabase.from('bonoriya_property').select('*').eq('id', 1).single();
    if (bonoriya) {
      const mapped = mapDbBonoriyaProperty(bonoriya);
      localStorage.setItem('bonoriya_own_property', JSON.stringify(mapped));
    }

    // 5. Email config
    const { data: emailCfg } = await supabase.from('email_config').select('*').eq('id', 1).single();
    if (emailCfg) {
      const cfg: EmailConfig = {
        serviceId: emailCfg.service_id ?? BONORIYA_EMAIL_DEFAULTS.serviceId,
        templateId: emailCfg.template_id ?? BONORIYA_EMAIL_DEFAULTS.templateId,
        publicKey: emailCfg.public_key ?? BONORIYA_EMAIL_DEFAULTS.publicKey,
        enabled: emailCfg.enabled ?? BONORIYA_EMAIL_DEFAULTS.enabled,
      };
      localStorage.setItem(_ECFG_KEY, JSON.stringify(cfg));
    }

    // 6. Day trip availability
    const { data: dtSlots } = await supabase.from('day_trip_availability').select('*');
    if (dtSlots) {
      const slots: DayTripDateStatus[] = dtSlots.map((s: any) => ({ date: s.date, status: s.status }));
      _dayTripAvailCache = slots;
      localStorage.setItem(_DT_KEY, JSON.stringify(slots));
    }

    // 7. All bookings cache
    const { data: allBookings } = await supabase.from('bookings').select('*').order('created_at');
    if (allBookings) {
      _bookingsCache = allBookings.map(mapDbBooking);
      localStorage.setItem('bonoriya_bookings', JSON.stringify(_bookingsCache));
    }

  } catch (err) {
    console.warn('[initSupabase] Hydration failed, using localStorage fallback:', err);
  }
}

// ─── DB → App shape mappers ──────────────────────────────────────────────────

function mapDbPartner(row: any): PartnerRecord {
  return {
    id: String(row.id),
    email: row.email,
    password: row.password_hash ?? row.password ?? '',
    name: row.name,
    phone: row.phone ?? '',
    businessName: row.business_name ?? '',
    gstNumber: row.gst_number ?? '',
    address: row.address ?? '',
    createdAt: row.created_at ?? new Date().toISOString(),
    approved: row.approved ?? false,
    rejected: row.rejected ?? false,
    approvedAt: row.approved_at,
    rejectedAt: row.rejected_at,
  };
}

function mapDbGuest(row: any): GuestRecord {
  return {
    id: String(row.id),
    email: row.email,
    password: row.password_hash ?? row.password ?? '',
    name: row.name,
    phone: row.phone ?? '',
    address: row.address ?? '',
    city: row.city ?? '',
    state: row.state ?? '',
    pinCode: row.pin_code ?? '',
    country: row.country ?? 'India',
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at,
  };
}

export function mapDbProperty(row: any): PartnerProperty {
  return {
    id: String(row.id),
    partnerId: String(row.partner_id),
    partnerName: row.partner_name ?? '',
    partnerEmail: row.partner_email ?? '',
    name: row.name,
    location: row.location ?? '',
    description: row.description ?? '',
    price: row.price ?? '',
    pricePerNight: row.price_per_night ?? 0,
    type: row.type ?? 'Associated',
    image: row.image ?? '',
    rating: row.rating ?? '0',
    rooms: row.rooms ?? 1,
    maxGuests: row.max_guests ?? 2,
    amenities: row.amenities ?? [],
    createdAt: row.created_at ?? new Date().toISOString(),
    active: row.active ?? true,
  };
}

export function mapDbBooking(row: any): BookingEntry {
  return {
    id: String(row.id),
    bookingRef: row.booking_ref,
    type: row.type,
    partnerId: String(row.partner_id ?? ''),
    partnerEmail: row.partner_email ?? '',
    propertyId: String(row.property_id ?? ''),
    propertyName: row.property_name ?? '',
    propertyLocation: row.property_location,
    guestName: row.guest_name,
    guestEmail: row.guest_email,
    guestPhone: row.guest_phone ?? '',
    guestAddress: row.guest_address ?? '',
    adults: row.adults ?? 1,
    children: row.children ?? 0,
    checkIn: row.check_in ?? '',
    checkOut: row.check_out ?? '',
    nights: row.nights,
    tripDate: row.trip_date,
    roomType: row.room_type,
    roomId: row.room_id,
    mealOption: row.meal_option,
    vegCount: row.veg_count,
    nonVegCount: row.non_veg_count,
    totalAmount: row.total_amount ?? 0,
    advanceAmount: row.advance_amount ?? 0,
    paymentStatus: row.payment_status ?? '',
    bookingStatus: row.booking_status ?? '',
    bookingDate: row.booking_date ?? row.created_at ?? '',
    visitors: row.visitors ?? [],
    noShow: row.no_show ?? false,
    propertyType: (row.property_type ?? 'bonoriya_own') as 'bonoriya_own' | 'associated',
    commissionRate: row.commission_rate ?? 0,
    commissionAmount: row.commission_amount ?? 0,
    gstOnCommission: row.gst_on_commission ?? 0,
    totalDeduction: row.total_deduction ?? 0,
    netPayable: row.net_payable ?? row.total_amount ?? 0,
  };
}

function mapDbBonoriyaProperty(row: any): BonoriyaPropertyData {
  return {
    name: row.name ?? DEFAULT_BONORIYA_PROPERTY.name,
    tagline: row.tagline ?? DEFAULT_BONORIYA_PROPERTY.tagline,
    location: row.location ?? DEFAULT_BONORIYA_PROPERTY.location,
    aboutUs: row.about_us ?? DEFAULT_BONORIYA_PROPERTY.aboutUs,
    shortDescription: row.short_description ?? DEFAULT_BONORIYA_PROPERTY.shortDescription,
    heroImage: row.hero_image ?? DEFAULT_BONORIYA_PROPERTY.heroImage,
    gallery: row.gallery ?? DEFAULT_BONORIYA_PROPERTY.gallery,
    highlights: row.highlights ?? DEFAULT_BONORIYA_PROPERTY.highlights,
    mealOptions: row.meal_options ?? DEFAULT_BONORIYA_PROPERTY.mealOptions,
    maxCapacityPerDay: row.max_capacity_per_day ?? DEFAULT_BONORIYA_PROPERTY.maxCapacityPerDay,
    priceRange: row.price_range ?? DEFAULT_BONORIYA_PROPERTY.priceRange,
    rating: row.rating ?? DEFAULT_BONORIYA_PROPERTY.rating,
    contactPhone: row.contact_phone ?? DEFAULT_BONORIYA_PROPERTY.contactPhone,
    contactEmail: row.contact_email ?? DEFAULT_BONORIYA_PROPERTY.contactEmail,
    howToReach: row.how_to_reach ?? DEFAULT_BONORIYA_PROPERTY.howToReach,
    updatedAt: row.updated_at ?? '',
  };
}

// ─── Admin ──────────────────────────────────────────────────────────────────

export const validateAdminLogin = async (userId: string, password: string): Promise<boolean> => {
  try {
    const { supabase } = await import('./db');
    const { data } = await supabase.from('admin_settings').select('value').eq('key', 'admin_account').single();
    if (data?.value) {
      const admin = data.value as { userId: string; passwordHash: string };
      const inputHash = await sha256(password);
      return admin.userId === userId && admin.passwordHash === inputHash;
    }
    // Legacy localStorage fallback — migrate on successful match
    const stored = localStorage.getItem('bonoriya_admin');
    if (stored) {
      const a = JSON.parse(stored);
      if (a.userId === userId && a.password === password) {
        const h = await sha256(password);
        await supabase.from('admin_settings').upsert({ key: 'admin_account', value: { userId, passwordHash: h, email: userId, name: 'BONORIYA Admin' }, updated_at: new Date().toISOString() }, { onConflict: 'key' });
        localStorage.removeItem('bonoriya_admin');
        return true;
      }
    }
    return false;
  } catch (e) { console.warn('[validateAdminLogin]', e); return false; }
};

export const initializeAdminAccount = (): void => {
  // Strip plaintext password from localStorage if present
  const stored = localStorage.getItem('bonoriya_admin');
  if (stored) {
    try { const a = JSON.parse(stored); if (a.password) { delete a.password; localStorage.setItem('bonoriya_admin', JSON.stringify(a)); } }
    catch { localStorage.removeItem('bonoriya_admin'); }
  }
};

export const resetAdminPassword = async (email: string, newPassword: string): Promise<boolean> => {
  try {
    if (!email.includes('@')) return false;
    const { supabase } = await import('./db');
    const h = await sha256(newPassword);
    await supabase.from('admin_settings').upsert({ key: 'admin_account', value: { userId: email, passwordHash: h, email, name: 'BONORIYA Admin' }, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    localStorage.removeItem('bonoriya_admin');
    return true;
  } catch (e) { console.warn('[resetAdminPassword]', e); return false; }
};

// ─── Guest ──────────────────────────────────────────────────────────────────

export interface GuestRecord {
  id: string;
  email: string;
  password: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
  createdAt: string;
  updatedAt?: string;
}

export const registerGuest = (
  email: string, password: string, name: string, phone: string,
  address = '', city = '', state = '', pinCode = '', country = 'India'
): boolean => {
  if (!isValidEmail(email) || !isValidPassword(password)) return false;
  const guests: GuestRecord[] = JSON.parse(localStorage.getItem('bonoriya_guests') || '[]');
  if (guests.some(g => g.email === email)) return false;
  const newGuest: GuestRecord = {
    id: Date.now().toString(), email, password, name, phone,
    address, city, state, pinCode, country,
    createdAt: new Date().toISOString()
  };
  guests.push(newGuest);
  // Strip passwords from localStorage — never cache credentials client-side
  localStorage.setItem('bonoriya_guests', JSON.stringify(guests.map(({ password: _p, ...g }) => g)));
  // Async write to Supabase in background
  _syncGuestToSupabase(newGuest);
  return true;
};

async function _syncGuestToSupabase(guest: GuestRecord): Promise<void> {
  try {
    const { supabase } = await import('./db');
    await supabase.from('guests').upsert({
      id: guest.id,
      email: guest.email,
      password_hash: guest.password,
      name: guest.name,
      phone: guest.phone,
      address: guest.address,
      city: guest.city,
      state: guest.state,
      pin_code: guest.pinCode,
      country: guest.country,
      created_at: guest.createdAt,
    }, { onConflict: 'email' });
  } catch (e) { console.warn('[syncGuestToSupabase]', e); }
}

export const validateGuestLogin = (_e: string, _p: string): boolean => false; // deprecated — use validateGuestLoginAsync

export const validateGuestLoginAsync = async (email: string, password: string): Promise<boolean> => {
  try {
    const { supabase } = await import('./db');
    const { data } = await supabase.from('guests').select('id,email,password_hash,name,phone,address,city,state,pin_code,pin_code,country,created_at').eq('email', email).single();
    if (!data) return false;
    const inputHash = await sha256(password);
    const match = data.password_hash === inputHash || data.password_hash === password;
    if (match) {
      // Cache profile without password
      const cached: any[] = JSON.parse(localStorage.getItem('bonoriya_guests') || '[]');
      const mapped = { id: data.id, email: data.email, password: '', name: data.name, phone: data.phone || '', address: data.address || '', city: data.city || '', state: data.state || '', pinCode: data.pin_code || '', country: data.country || 'India', createdAt: data.created_at };
      const idx = cached.findIndex(g => g.email === email);
      if (idx === -1) cached.push(mapped); else cached[idx] = mapped;
      localStorage.setItem('bonoriya_guests', JSON.stringify(cached));
    }
    return match;
  } catch (e) { console.warn('[validateGuestLoginAsync]', e); return false; }
};

async function _refreshGuestCache(email: string): Promise<void> {
  try {
    const { supabase } = await import('./db');
    const { data } = await supabase.from('guests').select('*').eq('email', email).single();
    if (!data) return;
    const mapped = mapDbGuest(data);
    const guests: GuestRecord[] = JSON.parse(localStorage.getItem('bonoriya_guests') || '[]');
    const idx = guests.findIndex(g => g.email === email);
    if (idx === -1) guests.push(mapped); else guests[idx] = mapped;
    localStorage.setItem('bonoriya_guests', JSON.stringify(guests));
  } catch (e) { console.warn('[refreshGuestCache]', e); }
}

export const getGuestByEmail = (email: string): GuestRecord | undefined => {
  const guests: GuestRecord[] = JSON.parse(localStorage.getItem('bonoriya_guests') || '[]');
  const found = guests.find(g => g.email === email);
  // Refresh from Supabase in background
  _refreshGuestCache(email);
  return found;
};

export const updateGuest = (email: string, updates: Partial<Omit<GuestRecord, 'id' | 'email' | 'createdAt'>>): boolean => {
  const guests: GuestRecord[] = JSON.parse(localStorage.getItem('bonoriya_guests') || '[]');
  const idx = guests.findIndex(g => g.email === email);
  if (idx === -1) return false;
  guests[idx] = { ...guests[idx], ...updates, updatedAt: new Date().toISOString() };
  localStorage.setItem('bonoriya_guests', JSON.stringify(guests));
  // Async write to Supabase
  _syncGuestUpdateToSupabase(email, updates);
  return true;
};

async function _syncGuestUpdateToSupabase(email: string, updates: Partial<Omit<GuestRecord, 'id' | 'email' | 'createdAt'>>): Promise<void> {
  try {
    const { supabase } = await import('./db');
    const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (updates.password !== undefined) dbUpdates.password_hash = updates.password;
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.city !== undefined) dbUpdates.city = updates.city;
    if (updates.state !== undefined) dbUpdates.state = updates.state;
    if (updates.pinCode !== undefined) dbUpdates.pin_code = updates.pinCode;
    if (updates.country !== undefined) dbUpdates.country = updates.country;
    await supabase.from('guests').update(dbUpdates).eq('email', email);
  } catch (e) { console.warn('[syncGuestUpdateToSupabase]', e); }
}

// ─── OTP / Password Reset ───────────────────────────────────────────────────

interface OtpRecord {
  email: string;
  otp: string;
  expiresAt: number;
  used: boolean;
  attempts: number;
}

const OTP_KEY = 'bonoriya_otps';
const OTP_TTL = 10 * 60 * 1000; // 10 min
const MAX_ATTEMPTS = 5;

function getOtps(): OtpRecord[] { return JSON.parse(localStorage.getItem(OTP_KEY) || '[]'); }
function saveOtps(r: OtpRecord[]) { localStorage.setItem(OTP_KEY, JSON.stringify(r)); }

export const generateOtp = (email: string): string => {
  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const records = getOtps().filter(r => r.email !== email);
  records.push({ email, otp, expiresAt: Date.now() + OTP_TTL, used: false, attempts: 0 });
  saveOtps(records);
  return otp;
};

export const validateOtp = (email: string, otp: string): 'valid' | 'expired' | 'invalid' | 'used' | 'too_many_attempts' => {
  const records = getOtps();
  const idx = records.findIndex(r => r.email === email);
  if (idx === -1) return 'invalid';
  const r = records[idx];
  if (r.used) return 'used';
  if (Date.now() > r.expiresAt) return 'expired';
  if (r.attempts >= MAX_ATTEMPTS) return 'too_many_attempts';
  if (r.otp !== otp) { records[idx].attempts += 1; saveOtps(records); return 'invalid'; }
  records[idx].used = true;
  saveOtps(records);
  return 'valid';
};

export const resetGuestPassword = (email: string, newPassword: string): boolean => {
  const guests: GuestRecord[] = JSON.parse(localStorage.getItem('bonoriya_guests') || '[]');
  const idx = guests.findIndex(g => g.email === email);
  if (idx === -1) return false;
  guests[idx].password = newPassword;
  guests[idx].updatedAt = new Date().toISOString();
  localStorage.setItem('bonoriya_guests', JSON.stringify(guests));
  _syncGuestUpdateToSupabase(email, { password: newPassword });
  return true;
};

export const resetPartnerPassword = (email: string, newPassword: string): boolean => {
  // Update localStorage cache
  const partners: PartnerRecord[] = JSON.parse(localStorage.getItem('bonoriya_partners') || '[]');
  const idx = partners.findIndex(p => p.email === email);
  if (idx !== -1) {
    partners[idx].password = newPassword;
    localStorage.setItem('bonoriya_partners', JSON.stringify(partners));
  }
  // Async write to Supabase
  _syncPartnerPasswordToSupabase(email, newPassword);
  return idx !== -1;
};

async function _syncPartnerPasswordToSupabase(email: string, newPassword: string): Promise<void> {
  try {
    const { supabase } = await import('./db');
    await supabase.from('partners').update({ password_hash: newPassword }).eq('email', email);
  } catch (e) { console.warn('[syncPartnerPasswordToSupabase]', e); }
}

// ─── Partner Types ──────────────────────────────────────────────────────────

export interface PartnerRecord {
  id: string;
  email: string;
  password: string;
  name: string;
  phone: string;
  businessName: string;
  gstNumber: string;
  address: string;
  createdAt: string;
  approved: boolean;
  rejected: boolean;
  approvedAt?: string;
  rejectedAt?: string;
}

export interface PartnerProperty {
  id: string;
  partnerId: string;
  partnerName: string;
  partnerEmail: string;
  name: string;
  location: string;
  description: string;
  price: string;
  pricePerNight: number;
  type: 'Associated' | 'Bonoriya Own';
  image: string;
  rating: string;
  rooms: number;
  maxGuests: number;
  amenities: string[];
  createdAt: string;
  active: boolean;
}

/** Extended property data stored per partner — full details for their dashboard */
export interface PartnerPropertyData {
  partnerId: string;
  propertyName: string;
  propertyType: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
  lat: number;
  lng: number;
  mapAddress: string;
  description: string;
  amenities: string[];
  checkInTime: string;
  checkOutTime: string;
  cancellationPolicy: string;
  petsAllowed: boolean;
  smokingAllowed: boolean;
  partiesAllowed: boolean;
  rooms: PartnerRoomData[];
  images: PartnerImageData[];
  updatedAt: string;
}

export interface RoomPhoto {
  id: string;
  url: string;
  fileName: string;
  isPrimary: boolean;
  label: string;
}

export interface PartnerRoomData {
  id: number;
  type: string;
  basePrice: number;
  available: number;
  baseOccupancy: number;
  maxOccupancy: number;
  description: string;   // room description for guests
  photos: RoomPhoto[];
}

export interface PartnerImageData {
  id: string;
  url: string;
  category: string;
  isMainImage: boolean;
  fileName: string;
}

// ─── (caches declared above at module top-level, before initSupabase) ────────

// ─── Partner Auth ───────────────────────────────────────────────────────────

export const registerPartner = (
  email: string, password: string, name: string, phone: string,
  businessName: string, gstNumber: string, address?: string
): boolean => {
  if (!isValidEmail(email) || !isValidPassword(password)) return false;
  const partners: PartnerRecord[] = JSON.parse(localStorage.getItem('bonoriya_partners') || '[]');
  if (partners.some(p => p.email === email)) return false;
  const newPartner: PartnerRecord = {
    id: Date.now().toString(), email, password, name, phone, businessName, gstNumber,
    address: address || '', createdAt: new Date().toISOString(), approved: false, rejected: false
  };
  partners.push(newPartner);
  localStorage.setItem('bonoriya_partners', JSON.stringify(partners.map(({ password: _p, ...p }) => p)));
  _partnersCache = partners;
  // Async write to Supabase
  _syncPartnerToSupabase(newPartner);
  return true;
};

async function _syncPartnerToSupabase(partner: PartnerRecord): Promise<void> {
  try {
    const { supabase } = await import('./db');
    await supabase.from('partners').upsert({
      id: partner.id,
      email: partner.email,
      password_hash: partner.password,
      name: partner.name,
      phone: partner.phone,
      business_name: partner.businessName,
      gst_number: partner.gstNumber,
      address: partner.address,
      created_at: partner.createdAt,
      approved: partner.approved,
      rejected: partner.rejected,
    }, { onConflict: 'email' });
  } catch (e) { console.warn('[syncPartnerToSupabase]', e); }
}

export const validatePartnerLogin = (_e: string, _p: string): { success: boolean; partner?: PartnerRecord } => ({ success: false }); // deprecated

export const validatePartnerLoginAsync = async (email: string, password: string): Promise<{ success: boolean; partner?: PartnerRecord }> => {
  try {
    const { supabase } = await import('./db');
    const { data } = await supabase.from('partners').select('*').eq('email', email).single();
    if (!data) return { success: false };
    const inputHash = await sha256(password);
    const match = data.password_hash === inputHash || data.password_hash === password;
    if (!match) return { success: false };
    const partner = mapDbPartner(data);
    // Cache without password
    const cached: any[] = JSON.parse(localStorage.getItem('bonoriya_partners') || '[]');
    const safe = { ...partner, password: '' };
    const idx = cached.findIndex(p => p.email === email);
    if (idx === -1) cached.push(safe); else cached[idx] = safe;
    localStorage.setItem('bonoriya_partners', JSON.stringify(cached));
    _partnersCache = _partnersCache.map(p => p.email === email ? { ...p, password: '' } : p);
    return { success: true, partner };
  } catch (e) { console.warn('[validatePartnerLoginAsync]', e); return { success: false }; }
};

async function _refreshPartnerCacheByEmail(email: string): Promise<void> {
  try {
    const { supabase } = await import('./db');
    const { data } = await supabase.from('partners').select('*').eq('email', email).single();
    if (!data) return;
    const mapped = mapDbPartner(data);
    const partners: PartnerRecord[] = JSON.parse(localStorage.getItem('bonoriya_partners') || '[]');
    const idx = partners.findIndex(p => p.email === email);
    if (idx === -1) partners.push(mapped); else partners[idx] = mapped;
    localStorage.setItem('bonoriya_partners', JSON.stringify(partners));
    _partnersCache = partners;
  } catch (e) { console.warn('[refreshPartnerCacheByEmail]', e); }
}

export const getPartnerByEmail = (email: string): PartnerRecord | undefined => {
  const partners: PartnerRecord[] = JSON.parse(localStorage.getItem('bonoriya_partners') || '[]');
  const found = partners.find(p => p.email === email);
  _refreshPartnerCacheByEmail(email);
  return found;
};

export const getPendingPartners = (): PartnerRecord[] => {
  const partners: PartnerRecord[] = JSON.parse(localStorage.getItem('bonoriya_partners') || '[]');
  _refreshAllPartnersCache();
  return partners.filter(p => !p.approved && !p.rejected);
};

export const getApprovedPartners = (): PartnerRecord[] => {
  const partners: PartnerRecord[] = JSON.parse(localStorage.getItem('bonoriya_partners') || '[]');
  _refreshAllPartnersCache();
  return partners.filter(p => p.approved);
};

export const getAllPartners = (): PartnerRecord[] => {
  _refreshAllPartnersCache();
  return JSON.parse(localStorage.getItem('bonoriya_partners') || '[]');
};

async function _refreshAllPartnersCache(): Promise<void> {
  try {
    const { supabase } = await import('./db');
    const { data } = await supabase.from('partners').select('*').order('created_at');
    if (!data) return;
    const mapped = data.map(mapDbPartner);
    _partnersCache = mapped;
    localStorage.setItem('bonoriya_partners', JSON.stringify(mapped));
  } catch (e) { console.warn('[refreshAllPartnersCache]', e); }
}

export const approvePartner = (partnerId: string): boolean => {
  const partners: PartnerRecord[] = JSON.parse(localStorage.getItem('bonoriya_partners') || '[]');
  const idx = partners.findIndex(p => p.id === partnerId);
  if (idx === -1) return false;
  partners[idx].approved = true;
  partners[idx].rejected = false;
  partners[idx].approvedAt = new Date().toISOString();
  localStorage.setItem('bonoriya_partners', JSON.stringify(partners));
  _partnersCache = partners;
  setTimeout(() => sendPartnerApprovalEmail(partners[idx].email, partners[idx].name), 0);
  if (getPartnerProperties(partnerId).length === 0) {
    const p = partners[idx];
    savePartnerProperty({
      id: `prop-${partnerId}`, partnerId, partnerName: p.name, partnerEmail: p.email,
      name: p.businessName, location: p.address || 'Northeast India',
      description: `${p.businessName} — a welcoming property in Northeast India.`,
      price: '₹1,500', pricePerNight: 1500, type: 'Associated', image: '',
      rating: '0', rooms: 1, maxGuests: 2, amenities: [], createdAt: new Date().toISOString(), active: true
    });
  }
  // Async write to Supabase
  _syncApprovePartnerToSupabase(partnerId, partners[idx].approvedAt!);
  return true;
};

async function _syncApprovePartnerToSupabase(partnerId: string, approvedAt: string): Promise<void> {
  try {
    const { supabase } = await import('./db');
    await supabase.from('partners').update({ approved: true, rejected: false, approved_at: approvedAt }).eq('id', partnerId);
    // Create default property in partner_properties if none exist
    const { data: existingProps } = await supabase.from('partner_properties').select('id').eq('partner_id', partnerId).limit(1);
    if (!existingProps || existingProps.length === 0) {
      const { data: partnerRow } = await supabase.from('partners').select('*').eq('id', partnerId).single();
      if (partnerRow) {
        await supabase.from('partner_properties').upsert({
          id: `prop-${partnerId}`,
          partner_id: partnerId,
          partner_name: partnerRow.name,
          partner_email: partnerRow.email,
          name: partnerRow.business_name,
          location: partnerRow.address || 'Northeast India',
          description: `${partnerRow.business_name} — a welcoming property in Northeast India.`,
          price: '₹1,500',
          price_per_night: 1500,
          type: 'Associated',
          image: '',
          rating: '0',
          rooms: 1,
          max_guests: 2,
          amenities: [],
          created_at: new Date().toISOString(),
          active: true,
        }, { onConflict: 'id' });
      }
    }
  } catch (e) { console.warn('[syncApprovePartnerToSupabase]', e); }
}

export const rejectPartner = (partnerId: string): boolean => {
  const partners: PartnerRecord[] = JSON.parse(localStorage.getItem('bonoriya_partners') || '[]');
  const idx = partners.findIndex(p => p.id === partnerId);
  if (idx === -1) return false;
  partners[idx].rejected = true;
  partners[idx].approved = false;
  partners[idx].rejectedAt = new Date().toISOString();
  localStorage.setItem('bonoriya_partners', JSON.stringify(partners));
  _partnersCache = partners;
  // Async write to Supabase
  _syncRejectPartnerToSupabase(partnerId, partners[idx].rejectedAt!);
  return true;
};

async function _syncRejectPartnerToSupabase(partnerId: string, rejectedAt: string): Promise<void> {
  try {
    const { supabase } = await import('./db');
    await supabase.from('partners').update({ rejected: true, approved: false, rejected_at: rejectedAt }).eq('id', partnerId);
  } catch (e) { console.warn('[syncRejectPartnerToSupabase]', e); }
}

export const deletePartner = (partnerId: string): boolean => {
  const partners: PartnerRecord[] = JSON.parse(localStorage.getItem('bonoriya_partners') || '[]');
  localStorage.setItem('bonoriya_partners', JSON.stringify(partners.filter(p => p.id !== partnerId)));
  _partnersCache = JSON.parse(localStorage.getItem('bonoriya_partners') || '[]');
  const props: PartnerProperty[] = JSON.parse(localStorage.getItem('bonoriya_partner_properties') || '[]');
  localStorage.setItem('bonoriya_partner_properties', JSON.stringify(props.filter(p => p.partnerId !== partnerId)));
  _allPropsCache = JSON.parse(localStorage.getItem('bonoriya_partner_properties') || '[]');
  _approvedPropsCache = _approvedPropsCache.filter(p => p.partnerId !== partnerId);
  localStorage.setItem('bonoriya_partner_properties_approved', JSON.stringify(_approvedPropsCache));
  localStorage.removeItem(`bonoriya_partner_data_${partnerId}`);
  // Async full delete from Supabase including Storage files
  deletePartnerDataFromSupabase(partnerId);
  return true;
};

// ─── Partner Property Listings (for OurProperties page) ────────────────────

export const savePartnerProperty = (property: PartnerProperty): void => {
  const props: PartnerProperty[] = JSON.parse(localStorage.getItem('bonoriya_partner_properties') || '[]');
  const idx = props.findIndex(p => p.id === property.id);
  if (idx === -1) props.push(property); else props[idx] = property;
  localStorage.setItem('bonoriya_partner_properties', JSON.stringify(props));
  _allPropsCache = props;
  // Refresh approved cache
  const approvedIds = new Set(
    JSON.parse(localStorage.getItem('bonoriya_partners') || '[]')
      .filter((p: PartnerRecord) => p.approved)
      .map((p: PartnerRecord) => p.id)
  );
  _approvedPropsCache = props.filter(p => approvedIds.has(p.partnerId) && p.active);
  localStorage.setItem('bonoriya_partner_properties_approved', JSON.stringify(_approvedPropsCache));
  // Async upsert to Supabase
  _syncPropertyToSupabase(property);
};

async function _syncPropertyToSupabase(property: PartnerProperty): Promise<void> {
  try {
    const { supabase } = await import('./db');
    await supabase.from('partner_properties').upsert({
      id: property.id,
      partner_id: property.partnerId,
      partner_name: property.partnerName,
      partner_email: property.partnerEmail,
      name: property.name,
      location: property.location,
      description: property.description,
      price: property.price,
      price_per_night: property.pricePerNight,
      type: property.type,
      image: property.image,
      rating: property.rating,
      rooms: property.rooms,
      max_guests: property.maxGuests,
      amenities: property.amenities,
      created_at: property.createdAt,
      active: property.active,
    }, { onConflict: 'id' });
    const { triggerSitemapRegen } = await import('./sitemapTrigger');
    triggerSitemapRegen();
  } catch (e) { console.warn('[syncPropertyToSupabase]', e); }
}

export const getPartnerProperties = (partnerId: string): PartnerProperty[] => {
  const props: PartnerProperty[] = JSON.parse(localStorage.getItem('bonoriya_partner_properties') || '[]');
  _refreshPartnerPropertiesCache(partnerId);
  return props.filter(p => p.partnerId === partnerId);
};

async function _refreshPartnerPropertiesCache(partnerId: string): Promise<void> {
  try {
    const { supabase } = await import('./db');
    const { data } = await supabase.from('partner_properties').select('*').eq('partner_id', partnerId);
    if (!data) return;
    const mapped = data.map(mapDbProperty);
    const props: PartnerProperty[] = JSON.parse(localStorage.getItem('bonoriya_partner_properties') || '[]');
    // Replace entries for this partner, keep others
    const others = props.filter(p => p.partnerId !== partnerId);
    const merged = [...others, ...mapped];
    localStorage.setItem('bonoriya_partner_properties', JSON.stringify(merged));
    _allPropsCache = merged;
  } catch (e) { console.warn('[refreshPartnerPropertiesCache]', e); }
}

export const getApprovedPartnerProperties = (): PartnerProperty[] => {
  // Return cache immediately (sync compat)
  _refreshApprovedPropsCache();
  return _approvedPropsCache;
};

async function _refreshApprovedPropsCache(): Promise<void> {
  try {
    const { supabase } = await import('./db');
    const { data: approvedPartners } = await supabase.from('partners').select('id').eq('approved', true);
    const approvedIds = (approvedPartners || []).map((p: any) => p.id);
    if (approvedIds.length === 0) {
      _approvedPropsCache = [];
      localStorage.setItem('bonoriya_partner_properties_approved', JSON.stringify([]));
      return;
    }
    const { data: props } = await supabase.from('partner_properties')
      .select('*').eq('active', true).in('partner_id', approvedIds);
    if (!props) return;
    _approvedPropsCache = props.map(mapDbProperty);
    localStorage.setItem('bonoriya_partner_properties_approved', JSON.stringify(_approvedPropsCache));
  } catch (e) { console.warn('[refreshApprovedPropsCache]', e); }
}

export const getAllPartnerProperties = (): PartnerProperty[] => {
  _refreshAllPartnerPropertiesCache();
  return JSON.parse(localStorage.getItem('bonoriya_partner_properties') || '[]');
};

async function _refreshAllPartnerPropertiesCache(): Promise<void> {
  try {
    const { supabase } = await import('./db');
    const { data } = await supabase.from('partner_properties').select('*').order('created_at');
    if (!data) return;
    const mapped = data.map(mapDbProperty);
    _allPropsCache = mapped;
    localStorage.setItem('bonoriya_partner_properties', JSON.stringify(mapped));
  } catch (e) { console.warn('[refreshAllPartnerPropertiesCache]', e); }
}

export const updatePartnerProperty = (propertyId: string, updates: Partial<PartnerProperty>): boolean => {
  const props: PartnerProperty[] = JSON.parse(localStorage.getItem('bonoriya_partner_properties') || '[]');
  const idx = props.findIndex(p => p.id === propertyId);
  if (idx === -1) return false;
  props[idx] = { ...props[idx], ...updates };
  localStorage.setItem('bonoriya_partner_properties', JSON.stringify(props));
  _allPropsCache = props;
  // Refresh approved cache
  const approvedIds = new Set(
    JSON.parse(localStorage.getItem('bonoriya_partners') || '[]')
      .filter((p: PartnerRecord) => p.approved)
      .map((p: PartnerRecord) => p.id)
  );
  _approvedPropsCache = props.filter(p => approvedIds.has(p.partnerId) && p.active);
  localStorage.setItem('bonoriya_partner_properties_approved', JSON.stringify(_approvedPropsCache));
  // Async update Supabase
  _syncPropertyUpdateToSupabase(propertyId, updates);
  return true;
};

async function _syncPropertyUpdateToSupabase(propertyId: string, updates: Partial<PartnerProperty>): Promise<void> {
  try {
    const { supabase } = await import('./db');
    const dbUpdates: Record<string, unknown> = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.location !== undefined) dbUpdates.location = updates.location;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.price !== undefined) dbUpdates.price = updates.price;
    if (updates.pricePerNight !== undefined) dbUpdates.price_per_night = updates.pricePerNight;
    if (updates.type !== undefined) dbUpdates.type = updates.type;
    if (updates.image !== undefined) dbUpdates.image = updates.image;
    if (updates.rating !== undefined) dbUpdates.rating = updates.rating;
    if (updates.rooms !== undefined) dbUpdates.rooms = updates.rooms;
    if (updates.maxGuests !== undefined) dbUpdates.max_guests = updates.maxGuests;
    if (updates.amenities !== undefined) dbUpdates.amenities = updates.amenities;
    if (updates.active !== undefined) dbUpdates.active = updates.active;
    await supabase.from('partner_properties').update(dbUpdates).eq('id', propertyId);
    const { triggerSitemapRegen } = await import('./sitemapTrigger');
    triggerSitemapRegen();
  } catch (e) { console.warn('[syncPropertyUpdateToSupabase]', e); }
}

export const deletePartnerProperty = (propertyId: string): boolean => {
  const props: PartnerProperty[] = JSON.parse(localStorage.getItem('bonoriya_partner_properties') || '[]');
  const filtered = props.filter(p => p.id !== propertyId);
  localStorage.setItem('bonoriya_partner_properties', JSON.stringify(filtered));
  _allPropsCache = filtered;
  _approvedPropsCache = _approvedPropsCache.filter(p => p.id !== propertyId);
  localStorage.setItem('bonoriya_partner_properties_approved', JSON.stringify(_approvedPropsCache));
  // Async delete from Supabase
  _syncDeletePropertyFromSupabase(propertyId);
  return filtered.length < props.length;
};

async function _syncDeletePropertyFromSupabase(propertyId: string): Promise<void> {
  try {
    const { supabase } = await import('./db');
    await supabase.from('partner_properties').delete().eq('id', propertyId);
    const { triggerSitemapRegen } = await import('./sitemapTrigger');
    triggerSitemapRegen();
  } catch (e) { console.warn('[syncDeletePropertyFromSupabase]', e); }
}

// ─── Partner Property Data (full dashboard data) ────────────────────────────

export const savePartnerPropertyData = (data: PartnerPropertyData): void => {
  data.updatedAt = new Date().toISOString();
  localStorage.setItem(`bonoriya_partner_data_${data.partnerId}`, JSON.stringify(data));
  // Also sync the listing entry so OurProperties page stays updated
  const existing = getPartnerProperties(data.partnerId);
  if (existing.length > 0) {
    const listing = existing[0];
    const fullAddress = [data.addressLine1, data.city, data.state, data.pinCode].filter(Boolean).join(', ');
    const mainImage = data.images.find(i => i.isMainImage)?.url || listing.image;
    const lowestPrice = data.rooms.length > 0 ? Math.min(...data.rooms.map(r => r.basePrice)) : listing.pricePerNight;
    updatePartnerProperty(listing.id, {
      name: data.propertyName,
      location: `${data.city || data.state}, ${data.state}`.replace(/^,\s*/, ''),
      description: data.description,
      price: `₹${lowestPrice.toLocaleString()}`,
      pricePerNight: lowestPrice,
      image: mainImage,
      amenities: data.amenities,
      rooms: data.rooms.length,
      maxGuests: data.rooms.reduce((s, r) => s + r.maxOccupancy, 0),
    });
  }
  // Async upsert to Supabase
  _syncPartnerPropertyDataToSupabase(data);
};

async function _syncPartnerPropertyDataToSupabase(data: PartnerPropertyData): Promise<void> {
  try {
    const { supabase } = await import('./db');
    await supabase.from('partner_property_data').upsert({
      partner_id: data.partnerId,
      property_name: data.propertyName,
      property_type: data.propertyType,
      address_line1: data.addressLine1,
      address_line2: data.addressLine2,
      city: data.city,
      state: data.state,
      pin_code: data.pinCode,
      country: data.country,
      lat: data.lat,
      lng: data.lng,
      map_address: data.mapAddress,
      description: data.description,
      amenities: data.amenities,
      check_in_time: data.checkInTime,
      check_out_time: data.checkOutTime,
      cancellation_policy: data.cancellationPolicy,
      pets_allowed: data.petsAllowed,
      smoking_allowed: data.smokingAllowed,
      parties_allowed: data.partiesAllowed,
      rooms: data.rooms,
      images: data.images,
      updated_at: data.updatedAt,
    }, { onConflict: 'partner_id' });
  } catch (e) { console.warn('[syncPartnerPropertyDataToSupabase]', e); }
}

export const loadPartnerPropertyData = (partnerId: string): PartnerPropertyData | null => {
  const stored = localStorage.getItem(`bonoriya_partner_data_${partnerId}`);
  // Fire async refresh from Supabase in background
  _refreshPartnerPropertyData(partnerId);
  return stored ? JSON.parse(stored) : null;
};

async function _refreshPartnerPropertyData(partnerId: string): Promise<void> {
  try {
    const { supabase } = await import('./db');
    const { data } = await supabase.from('partner_property_data').select('*').eq('partner_id', partnerId).single();
    if (!data) return;
    const mapped: PartnerPropertyData = {
      partnerId: data.partner_id,
      propertyName: data.property_name ?? '',
      propertyType: data.property_type ?? 'Homestay',
      addressLine1: data.address_line1 ?? '',
      addressLine2: data.address_line2 ?? '',
      city: data.city ?? '',
      state: data.state ?? 'Assam',
      pinCode: data.pin_code ?? '',
      country: data.country ?? 'India',
      lat: data.lat ?? 26.1445,
      lng: data.lng ?? 91.7362,
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
    localStorage.setItem(`bonoriya_partner_data_${partnerId}`, JSON.stringify(mapped));
  } catch (e) { console.warn('[refreshPartnerPropertyData]', e); }
}

// ─── Supabase-synced delete helpers ──────────────────────────────────────────

/** Delete a room and all its photos from Supabase (called from PartnerDashboard) */
export async function deleteRoomFromSupabase(roomId: number): Promise<void> {
  try {
    const { supabase } = await import('./db');
    // FK cascade deletes room_photos and room_inventory rows automatically
    await supabase.from('rooms').delete().eq('id', roomId);
  } catch (e) { console.warn('[deleteRoomFromSupabase]', e); }
}

/** Delete a single room photo from Supabase DB + Storage */
export async function deleteRoomPhotoFromSupabase(photoId: string, photoUrl: string): Promise<void> {
  try {
    const { supabase } = await import('./db');
    await supabase.from('room_photos').delete().eq('id', photoId);
    // Also remove from Storage if it's a Supabase Storage URL
    if (photoUrl.includes('supabase.co/storage')) {
      const path = photoUrl.split('/room-photos/')[1];
      if (path) await supabase.storage.from('room-photos').remove([path]);
    }
  } catch (e) { console.warn('[deleteRoomPhotoFromSupabase]', e); }
}

/** Delete a property photo from Supabase DB + Storage */
export async function deletePropertyPhotoFromSupabase(photoId: string, photoUrl: string): Promise<void> {
  try {
    const { supabase } = await import('./db');
    await supabase.from('property_photos').delete().eq('id', photoId);
    if (photoUrl.includes('supabase.co/storage')) {
      const path = photoUrl.split('/property-photos/')[1];
      if (path) await supabase.storage.from('property-photos').remove([path]);
    }
  } catch (e) { console.warn('[deletePropertyPhotoFromSupabase]', e); }
}

/** Delete a Bonoriya-property gallery image from Supabase Storage */
export async function deleteBonoriyaGalleryImageFromSupabase(imageUrl: string): Promise<void> {
  try {
    if (!imageUrl.includes('supabase.co/storage')) return;
    const { supabase } = await import('./db');
    const path = imageUrl.split('/bonoriya-assets/')[1];
    if (path) await supabase.storage.from('bonoriya-assets').remove([path]);
  } catch (e) { console.warn('[deleteBonoriyaGalleryImageFromSupabase]', e); }
}

/** Delete all rooms & related data for a partner from Supabase (called on partner delete) */
export async function deletePartnerDataFromSupabase(partnerId: string): Promise<void> {
  try {
    const { supabase } = await import('./db');
    // Get all property photos and room photos to delete from Storage
    const { data: propPhotos } = await supabase.from('property_photos').select('url').eq('partner_id', partnerId);
    const { data: rooms } = await supabase.from('rooms').select('id').eq('partner_id', partnerId);
    const roomIds = (rooms || []).map((r: any) => r.id);
    if (roomIds.length > 0) {
      const { data: roomPhotos } = await supabase.from('room_photos').select('url').in('room_id', roomIds);
      const roomPhotoUrls = (roomPhotos || []).map((p: any) => p.url).filter((u: string) => u.includes('supabase.co/storage'));
      const roomStoragePaths = roomPhotoUrls.map((u: string) => u.split('/room-photos/')[1]).filter(Boolean);
      if (roomStoragePaths.length) await supabase.storage.from('room-photos').remove(roomStoragePaths);
    }
    const propPhotoUrls = (propPhotos || []).map((p: any) => p.url).filter((u: string) => u.includes('supabase.co/storage'));
    const propStoragePaths = propPhotoUrls.map((u: string) => u.split('/property-photos/')[1]).filter(Boolean);
    if (propStoragePaths.length) await supabase.storage.from('property-photos').remove(propStoragePaths);
    // Delete partner record (FK cascades: partner_properties, rooms, room_photos, property_photos, room_inventory)
    await supabase.from('partner_property_data').delete().eq('partner_id', partnerId);
    await supabase.from('partners').delete().eq('id', partnerId);
  } catch (e) { console.warn('[deletePartnerDataFromSupabase]', e); }
}

export const getDefaultPartnerPropertyData = (partnerId: string, businessName: string): PartnerPropertyData => ({
  partnerId,
  propertyName: businessName,
  propertyType: 'Homestay',
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: 'Assam',
  pinCode: '',
  country: 'India',
  lat: 26.1445,
  lng: 91.7362,
  mapAddress: '',
  description: '',
  amenities: [],
  checkInTime: '14:00',
  checkOutTime: '11:00',
  cancellationPolicy: 'free-24h',
  petsAllowed: false,
  smokingAllowed: false,
  partiesAllowed: false,
  rooms: [],
  images: [],
  updatedAt: '',
});

// ─── Booking Storage ─────────────────────────────────────────────────────────

export interface VisitorDetail {
  name: string;
  age: string;
  sex: 'Male' | 'Female' | 'Other';
}

export interface BookingEntry {
  id: string;
  bookingRef: string;
  type: 'hotel' | 'day-trip';
  partnerId: string;
  partnerEmail: string;
  propertyId: string;
  propertyName: string;
  propertyLocation?: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestAddress: string;
  adults: number;
  children: number;
  checkIn: string;
  checkOut: string;
  nights?: number;
  tripDate?: string;
  roomType?: string;
  roomId?: number;
  mealOption?: string;
  vegCount?: number;
  nonVegCount?: number;
  totalAmount: number;
  advanceAmount: number;
  paymentStatus: string;
  bookingStatus: string;
  bookingDate: string;
  visitors?: VisitorDetail[];
  noShow?: boolean;
  // Commission & GST fields (day-trip bookings with Associated property type)
  propertyType?: 'bonoriya_own' | 'associated';
  commissionRate?: number;   // 0 for bonoriya_own, 10 for associated
  commissionAmount?: number; // booking total × commissionRate%
  gstOnCommission?: number;  // commissionAmount × 18%
  totalDeduction?: number;   // commissionAmount + gstOnCommission
  netPayable?: number;       // totalAmount − totalDeduction
}

// ── Commission / GST calculator for Day Trip bookings ─────────────────────────
// Rules:
//   bonoriya_own → 0 commission, 0 GST
//   associated   → 10% commission + 18% GST on commission

export function calcDayTripCommission(
  totalAmount: number,
  propertyType: 'bonoriya_own' | 'associated' = 'bonoriya_own'
): {
  propertyType: 'bonoriya_own' | 'associated';
  commissionRate: number;
  commissionAmount: number;
  gstOnCommission: number;
  totalDeduction: number;
  netPayable: number;
} {
  if (propertyType === 'associated') {
    const commissionRate  = 10;
    const commissionAmount = Math.round(totalAmount * 0.10 * 100) / 100;
    const gstOnCommission  = Math.round(commissionAmount * 0.18 * 100) / 100;
    const totalDeduction   = Math.round((commissionAmount + gstOnCommission) * 100) / 100;
    const netPayable       = Math.round((totalAmount - totalDeduction) * 100) / 100;
    return { propertyType, commissionRate, commissionAmount, gstOnCommission, totalDeduction, netPayable };
  }
  // bonoriya_own — zero charges
  return {
    propertyType: 'bonoriya_own',
    commissionRate: 0,
    commissionAmount: 0,
    gstOnCommission: 0,
    totalDeduction: 0,
    netPayable: totalAmount,
  };
}

export const saveBooking = (booking: BookingEntry): void => {
  const bookings: BookingEntry[] = JSON.parse(localStorage.getItem('bonoriya_bookings') || '[]');
  const idx = bookings.findIndex(b => b.id === booking.id);
  if (idx === -1) bookings.push(booking); else bookings[idx] = booking;
  localStorage.setItem('bonoriya_bookings', JSON.stringify(bookings));
  _bookingsCache = bookings;
  // Async upsert to Supabase + auto-deduct inventory for confirmed hotel bookings
  _syncBookingToSupabase(booking);
  if (booking.type === 'hotel' && booking.bookingStatus === 'Confirmed' && booking.roomId && booking.partnerId) {
    _adjustRoomInventory(booking.partnerId, booking.roomId, booking.checkIn || '', booking.checkOut || '', -1);
  }
};

async function _syncBookingToSupabase(booking: BookingEntry): Promise<void> {
  try {
    const { supabase } = await import('./db');
    await supabase.from('bookings').upsert({
      id: booking.id,
      booking_ref: booking.bookingRef,
      type: booking.type,
      partner_id: booking.partnerId,
      partner_email: booking.partnerEmail,
      property_id: booking.propertyId,
      property_name: booking.propertyName,
      property_location: booking.propertyLocation,
      guest_name: booking.guestName,
      guest_email: booking.guestEmail,
      guest_phone: booking.guestPhone,
      guest_address: booking.guestAddress,
      adults: booking.adults,
      children: booking.children,
      check_in: booking.checkIn,
      check_out: booking.checkOut,
      nights: booking.nights,
      trip_date: booking.tripDate,
      room_type: booking.roomType,
      room_id: booking.roomId,
      meal_option: booking.mealOption,
      veg_count: booking.vegCount,
      non_veg_count: booking.nonVegCount,
      total_amount: booking.totalAmount,
      advance_amount: booking.advanceAmount,
      payment_status: booking.paymentStatus,
      booking_status: booking.bookingStatus,
      property_type: booking.propertyType ?? 'bonoriya_own',
      commission_rate: booking.commissionRate ?? 0,
      commission_amount: booking.commissionAmount ?? 0,
      gst_on_commission: booking.gstOnCommission ?? 0,
      total_deduction: booking.totalDeduction ?? 0,
      net_payable: booking.netPayable ?? booking.totalAmount,
      booking_date: booking.bookingDate,
      visitors: booking.visitors ?? [],
      no_show: booking.noShow ?? false,
    }, { onConflict: 'id' });
  } catch (e) { console.warn('[syncBookingToSupabase]', e); }
}

export const getAllBookings = (): BookingEntry[] => {
  _refreshAllBookingsCache();
  return JSON.parse(localStorage.getItem('bonoriya_bookings') || '[]');
};

async function _refreshAllBookingsCache(): Promise<void> {
  try {
    const { supabase } = await import('./db');
    const { data } = await supabase.from('bookings').select('*').order('created_at');
    if (!data) return;
    const mapped = data.map(mapDbBooking);
    _bookingsCache = mapped;
    localStorage.setItem('bonoriya_bookings', JSON.stringify(mapped));
  } catch (e) { console.warn('[refreshAllBookingsCache]', e); }
}

export const getBookingsByPartnerId = (partnerId: string): BookingEntry[] => {
  _refreshBookingsByPartner(partnerId);
  return (JSON.parse(localStorage.getItem('bonoriya_bookings') || '[]') as BookingEntry[])
    .filter(b => b.partnerId === partnerId);
};

async function _refreshBookingsByPartner(partnerId: string): Promise<void> {
  try {
    const { supabase } = await import('./db');
    const { data } = await supabase.from('bookings').select('*').eq('partner_id', partnerId).order('created_at', { ascending: false });
    if (!data) return;
    const mapped = data.map(mapDbBooking);
    const allBookings: BookingEntry[] = JSON.parse(localStorage.getItem('bonoriya_bookings') || '[]');
    const others = allBookings.filter(b => b.partnerId !== partnerId);
    const merged = [...others, ...mapped];
    _bookingsCache = merged;
    localStorage.setItem('bonoriya_bookings', JSON.stringify(merged));
  } catch (e) { console.warn('[refreshBookingsByPartner]', e); }
}

export const getDayTripBookings = (): BookingEntry[] => {
  _refreshDayTripBookings();
  return (JSON.parse(localStorage.getItem('bonoriya_bookings') || '[]') as BookingEntry[])
    .filter(b => b.type === 'day-trip');
};

async function _refreshDayTripBookings(): Promise<void> {
  try {
    const { supabase } = await import('./db');
    const { data } = await supabase.from('bookings').select('*').eq('type', 'day-trip').order('created_at', { ascending: false });
    if (!data) return;
    const mapped = data.map(mapDbBooking);
    const allBookings: BookingEntry[] = JSON.parse(localStorage.getItem('bonoriya_bookings') || '[]');
    const others = allBookings.filter(b => b.type !== 'day-trip');
    const merged = [...others, ...mapped];
    _bookingsCache = merged;
    localStorage.setItem('bonoriya_bookings', JSON.stringify(merged));
  } catch (e) { console.warn('[refreshDayTripBookings]', e); }
}

export const updateBookingStatus = (bookingId: string, status: string): void => {
  const bookings: BookingEntry[] = JSON.parse(localStorage.getItem('bonoriya_bookings') || '[]');
  const idx = bookings.findIndex(b => b.id === bookingId);
  if (idx !== -1) {
    const booking = bookings[idx];
    bookings[idx].bookingStatus = status;
    localStorage.setItem('bonoriya_bookings', JSON.stringify(bookings));
    _bookingsCache = bookings;
    // Auto-restore inventory when hotel booking is cancelled, rejected, or marked as No Show
    if (booking.type === 'hotel' && (status === 'Cancelled' || status === 'Rejected' || status === 'No Show')
        && booking.roomId && booking.partnerId) {
      _adjustRoomInventory(booking.partnerId, booking.roomId, booking.checkIn || '', booking.checkOut || '', +1);
    }
  }
  // Async update Supabase
  _syncBookingStatusToSupabase(bookingId, status);
};

/** Adjust room inventory by delta (+1 restore, -1 deduct) for all dates in the booking range */
async function _adjustRoomInventory(
  partnerId: string, roomId: number,
  checkIn: string, checkOut: string, delta: number
): Promise<void> {
  if (!checkIn || !checkOut) return;
  try {
    const { supabase } = await import('./db');
    // Get all dates in the booking range
    const dates: string[] = [];
    const d = new Date(checkIn);
    const end = new Date(checkOut);
    while (d < end) { dates.push(d.toISOString().split('T')[0]); d.setDate(d.getDate() + 1); }
    if (!dates.length) return;

    // Fetch current inventory slots for these dates
    const { data: slots } = await supabase.from('room_inventory')
      .select('*').eq('partner_id', partnerId).eq('room_id', roomId).in('date', dates);

    // Get the default available count from the room definition
    const { data: roomData } = await supabase.from('partner_property_data')
      .select('rooms').eq('partner_id', partnerId).single();
    const room = (roomData?.rooms || []).find((r: any) => r.id === roomId);
    const defaultAvailable = room?.available ?? 1;

    const upserts = dates.map(date => {
      const existing = (slots || []).find((s: any) => s.date === date);
      const current = existing ? existing.available : defaultAvailable;
      const newAvailable = Math.max(0, Math.min(defaultAvailable, current + delta));
      return {
        partner_id: partnerId, room_id: roomId, date,
        available: newAvailable,
        status: newAvailable === 0 ? 'sold-out' : 'available',
      };
    });
    if (upserts.length) {
      await supabase.from('room_inventory').upsert(upserts, { onConflict: 'partner_id,room_id,date' });
    }
  } catch (e) { console.warn('[adjustRoomInventory]', e); }
}

async function _syncBookingStatusToSupabase(bookingId: string, status: string): Promise<void> {
  try {
    const { supabase } = await import('./db');
    await supabase.from('bookings').update({
      booking_status: status,
      no_show: status === 'No Show',
    }).eq('id', bookingId);
  } catch (e) { console.warn('[syncBookingStatusToSupabase]', e); }
}

// ─── Email System ───────────────────────────────────────────────────────────

// ── EmailJS runtime config — interface and constants declared at top of file ──

export const getEmailConfig = (): EmailConfig => {
  const r = localStorage.getItem(_ECFG_KEY);
  if (r) return JSON.parse(r);
  // Auto-save the pre-configured defaults on first access
  localStorage.setItem(_ECFG_KEY, JSON.stringify(BONORIYA_EMAIL_DEFAULTS));
  // Async sync from Supabase in background
  _refreshEmailConfigFromSupabase();
  return BONORIYA_EMAIL_DEFAULTS;
};

async function _refreshEmailConfigFromSupabase(): Promise<void> {
  try {
    const { supabase } = await import('./db');
    const { data } = await supabase.from('email_config').select('*').eq('id', 1).single();
    if (!data) return;
    const cfg: EmailConfig = {
      serviceId: data.service_id ?? BONORIYA_EMAIL_DEFAULTS.serviceId,
      templateId: data.template_id ?? BONORIYA_EMAIL_DEFAULTS.templateId,
      publicKey: data.public_key ?? BONORIYA_EMAIL_DEFAULTS.publicKey,
      enabled: data.enabled ?? BONORIYA_EMAIL_DEFAULTS.enabled,
    };
    localStorage.setItem(_ECFG_KEY, JSON.stringify(cfg));
  } catch (e) { console.warn('[refreshEmailConfigFromSupabase]', e); }
}

export const saveEmailConfig = (c: EmailConfig): void => {
  localStorage.setItem(_ECFG_KEY, JSON.stringify(c));
  // Async upsert to Supabase
  _syncEmailConfigToSupabase(c);
};

async function _syncEmailConfigToSupabase(c: EmailConfig): Promise<void> {
  try {
    const { supabase } = await import('./db');
    await supabase.from('email_config').upsert({
      id: 1,
      service_id: c.serviceId,
      template_id: c.templateId,
      public_key: c.publicKey,
      enabled: c.enabled,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });
  } catch (e) { console.warn('[syncEmailConfigToSupabase]', e); }
}

async function _dispatch(to: string, subject: string, html: string): Promise<void> {
  // ── Log locally first ──────────────────────────────────────────────────────
  const logs: any[] = JSON.parse(localStorage.getItem('bonoriya_email_logs') || '[]');
  logs.push({ to, from: 'noreply@bonoriya.com', subject, sentAt: new Date().toISOString(), delivered: false });
  const idx = logs.length - 1;
  localStorage.setItem('bonoriya_email_logs', JSON.stringify(logs.slice(-50)));

  const markDelivered = () => {
    const upd: any[] = JSON.parse(localStorage.getItem('bonoriya_email_logs') || '[]');
    if (upd[idx]) { upd[idx].delivered = true; localStorage.setItem('bonoriya_email_logs', JSON.stringify(upd)); }
  };

  // ── PRIMARY: Supabase Edge Function → Resend ──────────────────────────────
  // Sends From: noreply@bonoriya.com with bonoriya.com's own DKIM signature.
  // SPF + DKIM + DMARC all PASS → reaches Gmail/Outlook inbox.
  try {
    const { supabase } = await import('./db');
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { to, subject, html, replyTo: 'info@bonoriya.com' },
    });
    if (!error && data?.success) {
      markDelivered();
      console.log(`[EMAIL ✓ Resend→${to}] ${subject}`);
      return;
    }
    console.warn('[EMAIL] Resend edge fn failed, falling back to EmailJS:', error);
  } catch (e) {
    console.warn('[EMAIL] Resend unavailable, falling back to EmailJS:', e);
  }

  // ── FALLBACK: EmailJS (download-link delivery, no DKIM for bonoriya.com) ──
  // Works for basic delivery but may hit spam for Gmail/Outlook.
  // Configure Resend to eliminate this fallback.
  const cfg = getEmailConfig();
  if (!cfg.serviceId || !cfg.publicKey) {
    console.log(`[EMAIL logged→${to}] ${subject} (no delivery service configured)`);
    return;
  }
  try {
    const ejs = await import('@emailjs/browser');
    await ejs.send(cfg.serviceId, cfg.templateId,
      { to_email: to, from_name: 'BONORIYA', reply_to: 'info@bonoriya.com', subject, html_message: html, plain_message: subject },
      { publicKey: cfg.publicKey });
    markDelivered();
    console.log(`[EMAIL ✓ EmailJS→${to}] ${subject}`);
  } catch (e: any) {
    console.error(`[EMAIL FAILED→${to}]`, e?.text || e);
  }
}
// ─────────────────────────────────────────────────────────────────────────────

const FROM_EMAIL    = 'info@bonoriya.com';
const SUPPORT_PHONE = '+91-9864282966';
const WEBSITE_URL   = 'https://bonoriya.com';

/**
 * Official BONORIYA favicon/logo — black background with yellow "B".
 * Upload file to: Supabase → Storage → bonoriya-assets → bonoriya-b-logo.png
 * (This is the 1000276893.png file from the project imports.)
 */
const LOGO_URL = 'https://mltpbbbauvluhhddteoy.supabase.co/storage/v1/object/public/bonoriya-assets/bonoriya-b-logo.png';
const BRAND_BLACK  = '#000000';
const BRAND_YELLOW = '#F0A010';

/**
 * Reusable email header — official BONORIYA branding.
 * Black background with yellow "B" logo + gold tagline.
 * Compatible with Gmail, Outlook, Apple Mail, Yahoo, Android.
 */
function emailHeader(): string {
  return `
      <!-- ══════════════ BONORIYA Official Header ══════════════ -->
      <tr>
        <td align="center" style="background-color:${BRAND_BLACK};padding:28px 24px 20px;">
          <!--[if mso]>
          <table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td align="center">
          <![endif]-->
          <a href="${WEBSITE_URL}" target="_blank" style="text-decoration:none;border:0;display:block;">
            <img
              src="${LOGO_URL}"
              alt="BONORIYA"
              width="80"
              border="0"
              style="display:block;width:80px;max-width:80px;height:auto;margin:0 auto;border:0;outline:none;text-decoration:none;border-radius:12px;"
            />
          </a>
          <!--[if mso]></td></tr></table><![endif]-->
          <p style="margin:12px 0 4px;color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:3px;font-family:Arial,Helvetica,sans-serif;text-align:center;text-transform:uppercase;">
            BONORIYA
          </p>
          <p style="margin:0;color:${BRAND_YELLOW};font-size:11px;letter-spacing:0.8px;font-family:Arial,Helvetica,sans-serif;text-align:center;">
            Off-beat Tourism &nbsp;&bull;&nbsp; Prefab Cottages &nbsp;&bull;&nbsp; Northeast India
          </p>
        </td>
      </tr>
      <!-- ══════════════════════════════════════════════════════ -->`;
}

/**
 * Deliverability-optimised BONORIYA email shell.
 * Key improvements for Gmail/Outlook/Live.com inbox delivery:
 *  - Table-based layout (not div-based) — required by major clients
 *  - Inline styles only — CSS class blocks are often stripped by Gmail
 *  - Plain-text preheader to improve preview text
 *  - Proper unsubscribe/contact footer (reduces spam score)
 *  - No spam-trigger language ("FREE", "CLICK NOW", excessive caps, etc.)
 *  - DOCTYPE + charset declared correctly
 *  - Role="presentation" on layout tables (accessibility + deliverability)
 */
function buildEmail(title: string, bodyHtml: string, preheader = ''): string {
  const pre = preheader || title;
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${title}</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f5f7f5;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<!-- Preheader (hidden preview text) -->
<div style="display:none;font-size:1px;color:#f5f7f5;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${pre}</div>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f5f7f5;">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background-color:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
      ${emailHeader()}
      <!-- Body -->
      <tr><td style="padding:32px 36px 24px;font-family:Arial,Helvetica,sans-serif;">
        ${bodyHtml}
      </td></tr>
      <!-- Divider -->
      <tr><td style="padding:0 36px;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0;" /></td></tr>
      <!-- ── Branded Footer ── -->
      <tr>
        <td style="background-color:${BRAND_BLACK};padding:20px 32px;text-align:center;font-family:Arial,Helvetica,sans-serif;">
          <p style="color:#ffffff;font-size:13px;font-weight:bold;letter-spacing:2px;margin:0 0 4px;text-transform:uppercase;">BONORIYA</p>
          <p style="color:${BRAND_YELLOW};font-size:10px;margin:0 0 12px;letter-spacing:0.5px;">Off-beat Tourism &bull; Prefab Cottages &bull; Northeast India</p>
          <p style="color:#9ca3af;font-size:11px;margin:3px 0;">
            <a href="mailto:${FROM_EMAIL}" style="color:${BRAND_YELLOW};text-decoration:none;">${FROM_EMAIL}</a>
            &nbsp;&bull;&nbsp;
            <a href="tel:${SUPPORT_PHONE}" style="color:#9ca3af;text-decoration:none;">${SUPPORT_PHONE}</a>
            &nbsp;&bull;&nbsp;
            <a href="${WEBSITE_URL}" style="color:#9ca3af;text-decoration:none;">bonoriya.com</a>
          </p>
          <p style="color:#6b7280;font-size:10px;margin:8px 0 0;">
            Guwahati, Assam, India &nbsp;&bull;&nbsp;
            &copy; 2026 BONORIYA. All rights reserved.
          </p>
          <p style="margin:6px 0 0;">
            <a href="mailto:${FROM_EMAIL}?subject=Unsubscribe" style="color:#6b7280;font-size:10px;text-decoration:underline;">Unsubscribe</a>
            &nbsp;&bull;&nbsp;
            <a href="mailto:${FROM_EMAIL}" style="color:#6b7280;font-size:10px;text-decoration:underline;">Contact Support</a>
          </p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

/** Inline-styles version of info box (required for Gmail compatibility) */
function infoBox(html: string): string {
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;">
    <tr><td style="background-color:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:14px 18px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#166534;line-height:1.6;">
      ${html}
    </td></tr>
  </table>`;
}

/** CTA button — BONORIYA brand: yellow background, black bold text */
function ctaButton(text: string, href = '#'): string {
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:20px auto;">
    <tr><td align="center" style="border-radius:8px;background-color:${BRAND_YELLOW};">
      <a href="${href}" target="_blank" style="display:inline-block;padding:13px 36px;color:${BRAND_BLACK};font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;text-decoration:none;border-radius:8px;letter-spacing:0.5px;">${text}</a>
    </td></tr>
  </table>`;
}

function logEmail(to: string, subject: string, html: string, _t: string) {
  _dispatch(to, subject, html).catch(() => {});
}

// ── All email functions use full inline styles (no CSS classes) for Gmail/Outlook compatibility ──

export const sendWelcomeEmail = (type: 'guest' | 'partner', email: string, name: string): void => {
  if (type === 'guest') {
    const subject = `[BONORIYA] Welcome — Your account is ready`;
    const html = buildEmail('Welcome to BONORIYA', `
      <h2 style="color:#1b3d2f;font-size:22px;font-family:Arial,Helvetica,sans-serif;margin:0 0 12px;">Hello ${name},</h2>
      <p style="color:#444;font-size:14px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;margin:0 0 12px;">Your BONORIYA account has been created successfully. We're glad to have you join us.</p>
      ${infoBox(`
        <p style="margin:0 0 6px;"><strong>Account Email:</strong> ${email}</p>
        <p style="margin:0;"><strong>Status:</strong> Active and ready to book</p>
      `)}
      <p style="color:#444;font-size:14px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;margin:0 0 8px;"><strong>With your account you can:</strong></p>
      <ul style="color:#444;font-size:14px;line-height:1.9;padding-left:20px;margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;">
        <li>Search and book stays across Northeast India</li>
        <li>Book day trips to Bonoriya Agro Eco Tourism, Jimbrigaon</li>
        <li>Manage all your bookings in one place</li>
        <li>Update your profile and travel preferences</li>
      </ul>
      ${ctaButton('Explore Stays Now')}
      <p style="font-size:13px;color:#888;font-family:Arial,Helvetica,sans-serif;margin:16px 0 0;">Need help? Email <strong>info@bonoriya.com</strong> or call <strong>${SUPPORT_PHONE}</strong></p>
    `, `Welcome to BONORIYA, ${name}! Your account is active and ready to book stays across Northeast India.`);
    logEmail(email, subject, html, 'guest_welcome');
  } else {
    const subject = '[BONORIYA] Partner Registration Received';
    const html = buildEmail('Partner Registration Received', `
      <h2 style="color:#1b3d2f;font-size:22px;font-family:Arial,Helvetica,sans-serif;margin:0 0 12px;">Hello ${name},</h2>
      <p style="color:#444;font-size:14px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;margin:0 0 12px;">Thank you for registering as a BONORIYA partner. Your application is being reviewed by our team.</p>
      ${infoBox(`
        <p style="margin:0 0 6px;"><strong>Status:</strong> Under review — pending BONORIYA approval</p>
        <p style="margin:0;"><strong>Email:</strong> ${email}</p>
      `)}
      <p style="color:#444;font-size:14px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;margin:0 0 12px;">Once approved you can list your property, manage bookings, set pricing, and track earnings.</p>
      <p style="font-size:13px;color:#888;font-family:Arial,Helvetica,sans-serif;margin:0;">Questions? Contact <strong>info@bonoriya.com</strong> or call <strong>${SUPPORT_PHONE}</strong></p>
    `, `BONORIYA partner registration received — we will review and notify you soon.`);
    logEmail(email, subject, html, 'partner_welcome');
  }
};

export const sendPartnerApprovalEmail = (partnerEmail: string, partnerName: string): void => {
  const subject = '[BONORIYA] Partner Account Approved';
  const html = buildEmail('Partner Account Approved', `
    <h2 style="color:#1b3d2f;font-size:22px;font-family:Arial,Helvetica,sans-serif;margin:0 0 12px;">Congratulations, ${partnerName}!</h2>
    <p style="color:#444;font-size:14px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;margin:0 0 12px;">Your BONORIYA partner account has been approved. You can now log in and start listing your property.</p>
    ${infoBox(`<p style="margin:0;"><strong>Status:</strong> Approved and Active</p>`)}
    <ul style="color:#444;font-size:14px;line-height:1.9;padding-left:20px;margin:0 0 16px;font-family:Arial,Helvetica,sans-serif;">
      <li>Complete your property listing setup</li>
      <li>Upload photos and set room pricing</li>
      <li>Manage bookings and availability</li>
      <li>Track earnings and invoices</li>
    </ul>
    ${ctaButton('Login to Partner Dashboard')}
    <p style="font-size:13px;color:#888;font-family:Arial,Helvetica,sans-serif;margin:16px 0 0;">Contact: <strong>info@bonoriya.com</strong> | ${SUPPORT_PHONE}</p>
  `, `Your BONORIYA partner account is approved — start listing your property today.`);
  logEmail(partnerEmail, subject, html, 'partner_approval');
};

export const sendBookingConfirmationEmail = (booking: BookingEntry): void => {
  const subject = `[BONORIYA] Booking Confirmed — ${booking.bookingRef}`;
  const dateRows = booking.type === 'day-trip'
    ? `<p style="margin:0 0 5px;"><strong>Trip Date:</strong> ${booking.tripDate || booking.checkIn}</p>`
    : `<p style="margin:0 0 5px;"><strong>Check-in:</strong> ${booking.checkIn}</p><p style="margin:0 0 5px;"><strong>Check-out:</strong> ${booking.checkOut}</p>`;
  const paymentInfo = booking.type === 'day-trip'
    ? `<p style="margin:0 0 5px;"><strong>Total:</strong> Rs ${booking.totalAmount.toLocaleString()}</p>
       <p style="margin:0;"><strong>Advance (40%):</strong> Rs ${booking.advanceAmount.toLocaleString()} — to be paid to confirm</p>`
    : `<p style="margin:0;"><strong>Total Amount:</strong> Rs ${booking.totalAmount.toLocaleString()}</p>`;
  const html = buildEmail('Booking Confirmed', `
    <h2 style="color:#1b3d2f;font-size:22px;font-family:Arial,Helvetica,sans-serif;margin:0 0 12px;">Booking confirmed, ${booking.guestName}!</h2>
    <p style="color:#444;font-size:14px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;margin:0 0 12px;">Thank you for booking with BONORIYA. Here are your booking details:</p>
    ${infoBox(`
      <p style="margin:0 0 5px;"><strong>Booking Reference:</strong> ${booking.bookingRef}</p>
      <p style="margin:0 0 5px;"><strong>Property:</strong> ${booking.propertyName}</p>
      ${booking.roomType ? `<p style="margin:0 0 5px;"><strong>Room:</strong> ${booking.roomType}</p>` : ''}
      ${dateRows}
      <p style="margin:0 0 5px;"><strong>Guests:</strong> ${booking.adults} Adult(s)${booking.children > 0 ? ` + ${booking.children} Child(ren)` : ''}</p>
      ${paymentInfo}
    `)}
    <p style="color:#444;font-size:14px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;margin:12px 0;">Our team will contact you to confirm payment arrangements and share arrival details.</p>
    ${ctaButton('View My Booking')}
    <p style="font-size:13px;color:#888;font-family:Arial,Helvetica,sans-serif;margin:16px 0 0;">Questions? <strong>info@bonoriya.com</strong> | ${SUPPORT_PHONE}</p>
  `, `Booking confirmed — Reference ${booking.bookingRef} for ${booking.propertyName}.`);
  logEmail(booking.guestEmail, subject, html, 'booking_confirmation');
};

export const sendBookingNotificationEmail = (booking: BookingEntry): void => {
  const subject = `[BONORIYA] New Booking — ${booking.bookingRef} | ${booking.propertyName}`;
  const html = buildEmail('New Booking Alert', `
    <h2 style="color:#1b3d2f;font-size:22px;font-family:Arial,Helvetica,sans-serif;margin:0 0 12px;">New Booking</h2>
    ${infoBox(`
      <p style="margin:0 0 5px;"><strong>Reference:</strong> ${booking.bookingRef}</p>
      <p style="margin:0 0 5px;"><strong>Guest:</strong> ${booking.guestName}</p>
      <p style="margin:0 0 5px;"><strong>Email:</strong> ${booking.guestEmail}</p>
      <p style="margin:0 0 5px;"><strong>Phone:</strong> ${booking.guestPhone}</p>
      <p style="margin:0 0 5px;"><strong>Property:</strong> ${booking.propertyName}</p>
      <p style="margin:0 0 5px;"><strong>Date:</strong> ${booking.checkIn || booking.tripDate}</p>
      <p style="margin:0;"><strong>Total:</strong> Rs ${booking.totalAmount.toLocaleString()}</p>
    `)}
    ${ctaButton('View in Admin Panel')}
  `, `New booking received — ${booking.bookingRef} for ${booking.propertyName}.`);
  logEmail(FROM_EMAIL, subject, html, 'booking_notification');
  if (booking.partnerEmail && booking.partnerEmail !== FROM_EMAIL) {
    logEmail(booking.partnerEmail, subject, html, 'booking_notification');
  }
};

export const sendBookingCancellationEmail = (booking: BookingEntry, guestName: string): void => {
  const subject = `[BONORIYA] Booking Cancelled — ${booking.bookingRef}`;
  const html = buildEmail('Booking Cancellation', `
    <h2 style="color:#1b3d2f;font-size:22px;font-family:Arial,Helvetica,sans-serif;margin:0 0 12px;">Booking Cancellation Confirmed</h2>
    <p style="color:#444;font-size:14px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;margin:0 0 12px;">Dear ${guestName}, your booking has been cancelled as requested.</p>
    ${infoBox(`
      <p style="margin:0 0 5px;"><strong>Booking Reference:</strong> ${booking.bookingRef}</p>
      <p style="margin:0 0 5px;"><strong>Property:</strong> ${booking.propertyName}</p>
      <p style="margin:0 0 5px;"><strong>Amount Paid:</strong> Rs ${booking.advanceAmount.toLocaleString()}</p>
      <p style="margin:0;"><strong>Refund:</strong> Will be processed within 5 to 7 business days</p>
    `)}
    <p style="font-size:13px;color:#888;font-family:Arial,Helvetica,sans-serif;margin:12px 0 0;">Questions? <strong>info@bonoriya.com</strong> | ${SUPPORT_PHONE}</p>
  `, `Your BONORIYA booking ${booking.bookingRef} has been cancelled.`);
  logEmail(booking.guestEmail, subject, html, 'booking_cancellation');
};

export const sendOtpEmail = (email: string, otp: string, name = ''): void => {
  const subject = '[BONORIYA] Password Reset — Verification Code';
  const html = buildEmail('Password Reset Code', `
    <h2 style="color:#1b3d2f;font-size:22px;font-family:Arial,Helvetica,sans-serif;margin:0 0 12px;">Password Reset Request</h2>
    ${name ? `<p style="color:#444;font-size:14px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;margin:0 0 12px;">Hello ${name},</p>` : ''}
    <p style="color:#444;font-size:14px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;margin:0 0 12px;">Use the verification code below to reset your BONORIYA password:</p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:16px 0;">
      <tr><td align="center" style="background-color:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:28px 20px;font-family:Arial,Helvetica,sans-serif;">
        <p style="font-size:12px;color:#166534;margin:0 0 10px;text-transform:uppercase;letter-spacing:1px;">Your Verification Code</p>
        <p style="font-size:44px;font-weight:bold;letter-spacing:12px;color:#1b3d2f;margin:0;font-family:'Courier New',monospace;">${otp}</p>
        <p style="font-size:12px;color:#16a34a;margin:10px 0 0;">Valid for 10 minutes &bull; Single use only</p>
      </td></tr>
    </table>
    <p style="color:#444;font-size:14px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;margin:0 0 12px;">If you did not request this, you can safely ignore this message.</p>
    <p style="font-size:13px;color:#888;font-family:Arial,Helvetica,sans-serif;margin:0;">Security queries: <strong>info@bonoriya.com</strong></p>
  `, `Your BONORIYA password reset code: ${otp} — valid for 10 minutes.`);
  logEmail(email, subject, html, 'otp');
};

export const sendPasswordResetEmail = (email: string, resetCode: string): void => {
  sendOtpEmail(email, resetCode);
};

// ─── BONORIYA Own Property (Bonoriya Agro Eco Tourism) ─────────────────────

export interface BonoriyaGalleryImage {
  id: string;
  url: string;
  caption: string;
  isMain: boolean;
}

export interface BonoriyaMealOption {
  value: string;
  label: string;
  price: number;
}

export interface BonoriyaPropertyData {
  name: string;
  tagline: string;
  location: string;
  aboutUs: string;
  shortDescription: string;
  heroImage: string;
  gallery: BonoriyaGalleryImage[];
  highlights: string[];
  mealOptions: BonoriyaMealOption[];
  maxCapacityPerDay: number;
  priceRange: string;
  rating: string;
  contactPhone: string;
  contactEmail: string;
  howToReach: string;
  updatedAt: string;
}

export const DEFAULT_BONORIYA_PROPERTY: BonoriyaPropertyData = {
  name: 'Bonoriya Agro Eco Tourism',
  tagline: 'Experience the untouched beauty of Jimbrigaon',
  location: 'Jimbrigaon, Halher, Meghalaya',
  aboutUs: `Bonoriya Agro Eco Tourism is nestled in the lush green hills of Jimbrigaon, Halher, Meghalaya. We offer authentic day trips that immerse you in the natural beauty, organic farming, and rich Khasi culture of this pristine region.\n\nOur eco-friendly approach ensures that every visit contributes to the sustainable development of the local community while giving guests an unforgettable experience. From trekking through organic orange farms to savoring traditional Assamese cuisine and witnessing live Khasi folk performances, every moment is crafted to connect you with the soul of Northeast India.`,
  shortDescription: 'Day trip with traditional Assamese food, organic orange farm trek, waterfall trek, and live Khasi folk music in Meghalaya',
  heroImage: 'https://images.unsplash.com/photo-1660558870112-d776ba4b0157?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwyfHxub3J0aCUyMGVhc3QlMjBpbmRpYSUyMG1vdW50YWlucyUyMGxhbmRzY2FwZSUyMHNjZW5pY3xlbnwxfHx8fDE3ODAyMDIwNTl8MA&ixlib=rb-4.1.0&q=80&w=1080',
  gallery: [],
  highlights: [
    'Traditional Assamese food',
    'Trek to organic Khasi Mandarin orange farm',
    'Scenic waterfall trek',
    'Live Khasi folk music performance',
    'Guided nature walk',
    'Local cultural immersion'
  ],
  mealOptions: [
    { value: 'breakfast-starter-lunch', label: 'Breakfast + Starter + Lunch', price: 1500 },
    { value: 'starter-lunch', label: 'Starter + Lunch', price: 1200 },
    { value: 'only-lunch', label: 'Only Lunch', price: 1000 }
  ],
  maxCapacityPerDay: 100,
  priceRange: '₹1,000–1,500',
  rating: '4.8',
  contactPhone: '+91-9864282966',
  contactEmail: 'info@bonoriya.com',
  howToReach: 'Jimbrigaon is located in Halher, Meghalaya. The nearest major city is Guwahati (~50 km). Taxi and shared cab services are available from Guwahati. Please contact us for detailed directions and pick-up arrangements.',
  updatedAt: '',
};

export const saveBonoriyaPropertyData = (data: BonoriyaPropertyData): void => {
  data.updatedAt = new Date().toISOString();
  localStorage.setItem(BONORIYA_PROPERTY_KEY, JSON.stringify(data));
  // Async upsert to Supabase
  _syncBonoriyaPropertyToSupabase(data);
};

async function _syncBonoriyaPropertyToSupabase(data: BonoriyaPropertyData): Promise<void> {
  try {
    const { supabase } = await import('./db');
    await supabase.from('bonoriya_property').upsert({
      id: 1,
      name: data.name,
      tagline: data.tagline,
      location: data.location,
      about_us: data.aboutUs,
      short_description: data.shortDescription,
      hero_image: data.heroImage,
      gallery: data.gallery,
      highlights: data.highlights,
      meal_options: data.mealOptions,
      max_capacity_per_day: data.maxCapacityPerDay,
      price_range: data.priceRange,
      rating: data.rating,
      contact_phone: data.contactPhone,
      contact_email: data.contactEmail,
      how_to_reach: data.howToReach,
      updated_at: data.updatedAt,
    }, { onConflict: 'id' });
  } catch (e) { console.warn('[syncBonoriyaPropertyToSupabase]', e); }
}

export const getBonoriyaPropertyData = (): BonoriyaPropertyData => {
  const stored = localStorage.getItem(BONORIYA_PROPERTY_KEY);
  // Fire async refresh from Supabase in background
  _refreshBonoriyaPropertyFromSupabase();
  return stored ? { ...DEFAULT_BONORIYA_PROPERTY, ...JSON.parse(stored) } : { ...DEFAULT_BONORIYA_PROPERTY };
};

async function _refreshBonoriyaPropertyFromSupabase(): Promise<void> {
  try {
    const { supabase } = await import('./db');
    const { data } = await supabase.from('bonoriya_property').select('*').eq('id', 1).single();
    if (!data) return;
    const mapped = mapDbBonoriyaProperty(data);
    localStorage.setItem(BONORIYA_PROPERTY_KEY, JSON.stringify(mapped));
  } catch (e) { console.warn('[refreshBonoriyaPropertyFromSupabase]', e); }
}

// ─── Day Trip Properties (multi-property support) ─────────────────────────────

export interface DayTripFAQ {
  question: string;
  answer: string;
}

export interface DayTripProperty {
  id: string;
  name: string;
  tagline: string;
  location: string;
  aboutUs: string;
  shortDescription: string;
  heroImage: string;
  gallery: BonoriyaGalleryImage[];
  highlights: string[];
  mealOptions: BonoriyaMealOption[];
  maxCapacityPerDay: number;
  priceRange: string;
  rating: string;
  contactPhone: string;
  contactEmail: string;
  howToReach: string;
  // Map / GPS coordinates
  lat: number;
  lng: number;
  mapAddress: string;
  propertyType: 'bonoriya_own' | 'associated';
  active: boolean;
  sortOrder: number;
  faqs: DayTripFAQ[];
  createdAt: string;
  updatedAt: string;
}

function mapDbDayTripProperty(row: any): DayTripProperty {
  return {
    id: String(row.id),
    name: row.name ?? 'Bonoriya Agro Eco Tourism',
    tagline: row.tagline ?? '',
    location: row.location ?? 'Jimbrigaon, Halher, Meghalaya',
    aboutUs: row.about_us ?? '',
    shortDescription: row.short_description ?? '',
    heroImage: row.hero_image ?? '',
    gallery: row.gallery ?? [],
    highlights: row.highlights ?? [],
    mealOptions: row.meal_options ?? [],
    maxCapacityPerDay: row.max_capacity_per_day ?? 100,
    priceRange: row.price_range ?? '₹1,000–1,500',
    rating: row.rating ?? '4.8',
    contactPhone: row.contact_phone ?? '',
    contactEmail: row.contact_email ?? '',
    howToReach: row.how_to_reach ?? '',
    lat: row.lat ?? 25.5788,
    lng: row.lng ?? 91.8933,
    mapAddress: row.map_address ?? '',
    propertyType: (row.property_type === 'associated' ? 'associated' : 'bonoriya_own') as 'bonoriya_own' | 'associated',
    active: row.active ?? true,
    sortOrder: row.sort_order ?? 0,
    faqs: Array.isArray(row.faqs) ? row.faqs.filter((f: any) => f && typeof f.question === 'string' && typeof f.answer === 'string') : [],
    createdAt: row.created_at ?? new Date().toISOString(),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

/** Fetch all active day trip properties from Supabase */
/** True when error is Supabase PGRST205 = table does not exist yet */
function _isTableMissing(e: any): boolean {
  return e?.code === 'PGRST205' || String(e?.message ?? '').includes('day_trip_properties');
}

/** Fallback DayTripProperty built from the legacy bonoriya_property singleton */
function _legacyFallback(): DayTripProperty {
  const old = getBonoriyaPropertyData();
  return {
    id: 'bonoriya-agro-eco',
    name: old.name || 'Bonoriya Agro Eco Tourism',
    tagline: old.tagline || 'Experience the untouched beauty of Jimbrigaon',
    location: old.location || 'Jimbrigaon, Halher, Meghalaya',
    aboutUs: old.aboutUs || '',
    shortDescription: old.shortDescription || 'Day trip with traditional Assamese food, organic orange farm trek, waterfall trek, and live Khasi folk music in Meghalaya',
    heroImage: old.heroImage || '',
    gallery: old.gallery || [],
    highlights: old.highlights?.length ? old.highlights : ['Traditional Assamese food', 'Trek to organic Khasi Mandarin orange farm', 'Scenic waterfall trek', 'Live Khasi folk music performance'],
    mealOptions: old.mealOptions?.length ? old.mealOptions : [
      { value: 'breakfast-starter-lunch', label: 'Breakfast + Starter + Lunch', price: 1500 },
      { value: 'starter-lunch',           label: 'Starter + Lunch',             price: 1200 },
      { value: 'only-lunch',              label: 'Only Lunch',                  price: 1000 },
    ],
    maxCapacityPerDay: old.maxCapacityPerDay || 100,
    priceRange: old.priceRange || '₹1,000–1,500',
    rating: old.rating || '4.8',
    contactPhone: old.contactPhone || '+91-9864282966',
    contactEmail: old.contactEmail || 'info@bonoriya.com',
    howToReach: old.howToReach || '',
    lat: 25.5788,
    lng: 91.8933,
    mapAddress: 'Jimbrigaon, Halher, Meghalaya',
    propertyType: 'bonoriya_own',
    active: true,
    sortOrder: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function getDayTripProperties(): Promise<DayTripProperty[]> {
  try {
    const { supabase } = await import('./db');
    const { data, error } = await supabase
      .from('day_trip_properties')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    // Table doesn't exist yet — return legacy fallback silently
    if (error) {
      if (_isTableMissing(error)) return [_legacyFallback()];
      throw error;
    }

    // Deduplicate by name before returning (handles dual-insert from auto-seed + manual)
    const seen = new Set<string>();
    const props = (data || []).map(mapDbDayTripProperty).filter(p => {
      const key = p.name.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Table exists but is empty — auto-seed from bonoriya_property then return fallback
    if (props.length === 0) {
      try {
        const { data: legacy } = await supabase.from('bonoriya_property').select('*').eq('id', 1).single();
        const src = legacy ?? {};
        const { data: seeded } = await supabase.from('day_trip_properties').insert({
          name: src.name ?? 'Bonoriya Agro Eco Tourism',
          tagline: src.tagline ?? '',
          location: src.location ?? 'Jimbrigaon, Halher, Meghalaya',
          about_us: src.about_us ?? '',
          short_description: src.short_description ?? '',
          hero_image: src.hero_image ?? '',
          gallery: src.gallery ?? [],
          highlights: src.highlights ?? [],
          meal_options: src.meal_options ?? [],
          max_capacity_per_day: src.max_capacity_per_day ?? 100,
          price_range: src.price_range ?? '₹1,000–1,500',
          rating: src.rating ?? '4.8',
          contact_phone: src.contact_phone ?? '+91-9864282966',
          contact_email: src.contact_email ?? 'info@bonoriya.com',
          how_to_reach: src.how_to_reach ?? '',
          property_type: 'bonoriya_own',
          active: true,
          sort_order: 0,
        }).select();
        if (seeded?.length) return seeded.map(mapDbDayTripProperty);
      } catch {
        // seed failed — return legacy fallback
      }
      return [_legacyFallback()];
    }

    return props;
  } catch (e) {
    if (_isTableMissing(e)) return [_legacyFallback()];
    console.warn('[getDayTripProperties]', e);
    return [_legacyFallback()];
  }
}

/** Fetch all active day trip properties (public-facing) */
export async function getActiveDayTripProperties(): Promise<DayTripProperty[]> {
  try {
    const { supabase } = await import('./db');
    const { data, error } = await supabase
      .from('day_trip_properties')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      if (_isTableMissing(error)) return [_legacyFallback()];
      throw error;
    }

    const allProps = (data || []).map(mapDbDayTripProperty);

    // Deduplicate by name — keep only the first occurrence of each property name.
    // This handles the case where auto-seed and manual INSERT both created a row
    // for "Bonoriya Agro Eco Tourism".
    const seen = new Set<string>();
    const props = allProps.filter(p => {
      const key = p.name.toLowerCase().trim();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return props.length > 0 ? props : [_legacyFallback()];
  } catch (e) {
    if (_isTableMissing(e)) return [_legacyFallback()];
    console.warn('[getActiveDayTripProperties]', e);
    return [_legacyFallback()];
  }
}

/** Create a new day trip property */
export async function createDayTripProperty(data: Omit<DayTripProperty, 'id' | 'createdAt' | 'updatedAt'>): Promise<DayTripProperty | null> {
  const { supabase } = await import('./db');
  const { data: row, error } = await supabase
    .from('day_trip_properties')
    .insert({
      name: data.name,
      tagline: data.tagline,
      location: data.location,
      about_us: data.aboutUs,
      short_description: data.shortDescription,
      hero_image: data.heroImage,
      gallery: data.gallery,
      highlights: data.highlights,
      meal_options: data.mealOptions,
      max_capacity_per_day: data.maxCapacityPerDay,
      price_range: data.priceRange,
      rating: data.rating,
      contact_phone: data.contactPhone,
      contact_email: data.contactEmail,
      how_to_reach: data.howToReach,
      lat: data.lat ?? 25.5788,
      lng: data.lng ?? 91.8933,
      map_address: data.mapAddress ?? '',
      property_type: data.propertyType,
      active: data.active,
      sort_order: data.sortOrder,
      faqs: data.faqs ?? [],
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) {
    console.error('[createDayTripProperty]', error);
    const msg = String((error as any).message || '');
    if (/column .*faqs.* does not exist|Could not find the 'faqs' column|schema cache/i.test(msg)) {
      throw new Error(
        'Supabase migration 011_day_trip_properties_faqs.sql has not been applied yet. ' +
        'Please run: ALTER TABLE day_trip_properties ADD COLUMN IF NOT EXISTS faqs jsonb NOT NULL DEFAULT \'[]\'::jsonb; ' +
        'in the Supabase SQL editor and try saving again.'
      );
    }
    throw new Error(msg || 'Failed to create day trip property');
  }
  try { const { triggerSitemapRegen } = await import('./sitemapTrigger'); triggerSitemapRegen(); } catch {}
  return mapDbDayTripProperty(row);
}

/** Update an existing day trip property */
export async function updateDayTripProperty(id: string, updates: Partial<Omit<DayTripProperty, 'id' | 'createdAt'>>): Promise<boolean> {
  const { supabase } = await import('./db');
  const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.tagline !== undefined) dbUpdates.tagline = updates.tagline;
  if (updates.location !== undefined) dbUpdates.location = updates.location;
  if (updates.aboutUs !== undefined) dbUpdates.about_us = updates.aboutUs;
  if (updates.shortDescription !== undefined) dbUpdates.short_description = updates.shortDescription;
  if (updates.heroImage !== undefined) dbUpdates.hero_image = updates.heroImage;
  if (updates.gallery !== undefined) dbUpdates.gallery = updates.gallery;
  if (updates.highlights !== undefined) dbUpdates.highlights = updates.highlights;
  if (updates.mealOptions !== undefined) dbUpdates.meal_options = updates.mealOptions;
  if (updates.maxCapacityPerDay !== undefined) dbUpdates.max_capacity_per_day = updates.maxCapacityPerDay;
  if (updates.priceRange !== undefined) dbUpdates.price_range = updates.priceRange;
  if (updates.rating !== undefined) dbUpdates.rating = updates.rating;
  if (updates.contactPhone !== undefined) dbUpdates.contact_phone = updates.contactPhone;
  if (updates.contactEmail !== undefined) dbUpdates.contact_email = updates.contactEmail;
  if (updates.howToReach !== undefined) dbUpdates.how_to_reach = updates.howToReach;
  if (updates.lat !== undefined) dbUpdates.lat = updates.lat;
  if (updates.lng !== undefined) dbUpdates.lng = updates.lng;
  if (updates.mapAddress !== undefined) dbUpdates.map_address = updates.mapAddress;
  if (updates.propertyType !== undefined) dbUpdates.property_type = updates.propertyType;
  if (updates.active !== undefined) dbUpdates.active = updates.active;
  if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;
  if (updates.faqs !== undefined) dbUpdates.faqs = updates.faqs;
  const { error } = await supabase.from('day_trip_properties').update(dbUpdates).eq('id', id);
  if (error) {
    console.error('[updateDayTripProperty]', error);
    const msg = String((error as any).message || '');
    if (/column .*faqs.* does not exist|Could not find the 'faqs' column|schema cache/i.test(msg)) {
      throw new Error(
        'Supabase migration 011_day_trip_properties_faqs.sql has not been applied yet. ' +
        'Please run: ALTER TABLE day_trip_properties ADD COLUMN IF NOT EXISTS faqs jsonb NOT NULL DEFAULT \'[]\'::jsonb; ' +
        'in the Supabase SQL editor and try saving again.'
      );
    }
    throw new Error(msg || 'Failed to update day trip property');
  }
  try { const { triggerSitemapRegen } = await import('./sitemapTrigger'); triggerSitemapRegen(); } catch {}
  return true;
}

/** Delete a day trip property */
export async function deleteDayTripProperty(id: string): Promise<boolean> {
  try {
    const { supabase } = await import('./db');
    const { error } = await supabase.from('day_trip_properties').delete().eq('id', id);
    if (error) throw error;
    try { const { triggerSitemapRegen } = await import('./sitemapTrigger'); triggerSitemapRegen(); } catch {}
    return true;
  } catch (e) {
    console.error('[deleteDayTripProperty]', e);
    return false;
  }
}

/** Upload a photo for a day trip property to Supabase Storage */
export async function uploadDayTripPropertyPhoto(file: File, propertyId: string): Promise<string | null> {
  try {
    const { supabase } = await import('./db');
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `day-trip-properties/${propertyId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('bonoriya-assets').upload(path, file, { upsert: true });
    if (error) throw error;
    return supabase.storage.from('bonoriya-assets').getPublicUrl(path).data.publicUrl;
  } catch (e) {
    console.error('[uploadDayTripPropertyPhoto]', e);
    return null;
  }
}

// ─── Booking status email (admin Accept / Cancel / Reject) ───────────────────
export const sendBookingStatusEmail = (booking: BookingEntry, status: 'Confirmed'|'Cancelled'|'Rejected', reason = ''): void => {
  const meta: Record<string,{emoji:string;color:string;heading:string}> = {
    Confirmed:{emoji:'✅',color:'#166534',heading:'Booking Confirmed!'},
    Cancelled:{emoji:'❌',color:'#9a3412',heading:'Booking Cancelled'},
    Rejected :{emoji:'🚫',color:'#7c2d12',heading:'Booking Rejected'},
  };
  const {emoji,color,heading} = meta[status];
  const dateRow = booking.type==='day-trip'
    ? `<p>📅 <strong>Trip Date:</strong> ${booking.tripDate||booking.checkIn}</p>`
    : `<p>📅 <strong>Check-in:</strong> ${booking.checkIn}</p><p>📅 <strong>Check-out:</strong> ${booking.checkOut}</p>`;
  const refund = (status==='Cancelled'||status==='Rejected') && booking.advanceAmount>0
    ? `<p>💰 <strong>Refund:</strong> ₹${booking.advanceAmount.toLocaleString()} will be processed in 5–7 business days.</p>` : '';
  const html = buildEmail(`Booking ${status}`, `
    <h2 style="color:${color};font-size:22px;font-family:Arial,Helvetica,sans-serif;margin:0 0 12px;">${heading}</h2>
    <p style="color:#444;font-size:14px;line-height:1.7;font-family:Arial,Helvetica,sans-serif;margin:0 0 12px;">Dear ${booking.guestName}, your booking status has been updated.</p>
    ${infoBox(`
      <p style="margin:0 0 5px;"><strong>Reference:</strong> ${booking.bookingRef}</p>
      <p style="margin:0 0 5px;"><strong>Property:</strong> ${booking.propertyName}</p>
      <p style="margin:0 0 5px;"><strong>Booked On:</strong> ${booking.bookingDate}</p>
      ${dateRow.replace(/<p>/g,'<p style="margin:0 0 5px;">')}
      <p style="margin:0 0 5px;"><strong>New Status:</strong> <strong style="color:${color};">${status}</strong></p>
      ${reason?`<p style="margin:0 0 5px;"><strong>Reason:</strong> ${reason}</p>`:''}
      ${refund.replace(/<p>/g,'<p style="margin:0;">')}
    `)}
    <p style="font-size:13px;color:#888;font-family:Arial,Helvetica,sans-serif;margin:12px 0 0;">Queries: <strong>info@bonoriya.com</strong> | ${SUPPORT_PHONE}</p>
  `, `Booking ${status} — Reference ${booking.bookingRef}`);
  logEmail(booking.guestEmail, `[BONORIYA] Booking ${status} — ${booking.bookingRef}`, html, `booking_${status.toLowerCase()}`);
};

// ─── Partner Inventory ───────────────────────────────────────────────────────
export interface InventorySlot { roomId:number; date:string; available:number; status:'available'|'blocked'|'sold-out'; }

export const getInventory = (partnerId: string): InventorySlot[] => {
  _refreshInventoryFromSupabase(partnerId);
  return JSON.parse(localStorage.getItem(_invKey(partnerId)) || '[]');
};

async function _refreshInventoryFromSupabase(partnerId: string): Promise<void> {
  try {
    const { supabase } = await import('./db');
    const { data } = await supabase.from('room_inventory').select('*').eq('partner_id', partnerId);
    if (!data) return;
    const slots: InventorySlot[] = data.map((row: any) => ({
      roomId: row.room_id,
      date: row.date,
      available: row.available,
      status: row.status,
    }));
    localStorage.setItem(_invKey(partnerId), JSON.stringify(slots));
  } catch (e) { console.warn('[refreshInventoryFromSupabase]', e); }
}

export const saveInventorySlots = (partnerId: string, slots: InventorySlot[]): void => {
  const base = getInventory(partnerId);
  for (const s of slots) { const i=base.findIndex(x=>x.roomId===s.roomId&&x.date===s.date); if(i>=0)base[i]=s; else base.push(s); }
  localStorage.setItem(_invKey(partnerId), JSON.stringify(base));
  // Async upsert to Supabase
  _syncInventorySlotsToSupabase(partnerId, slots);
};

async function _syncInventorySlotsToSupabase(partnerId: string, slots: InventorySlot[]): Promise<void> {
  if (!slots.length) return;
  try {
    const { supabase } = await import('./db');
    await supabase.from('room_inventory').upsert(
      slots.map(s => ({
        partner_id: partnerId,
        room_id: s.roomId,
        date: s.date,
        available: s.available,
        status: s.status,
      })),
      { onConflict: 'partner_id,room_id,date' }
    );
  } catch (e) { console.warn('[syncInventorySlotsToSupabase]', e); }
}

// ─── Day-trip Availability ───────────────────────────────────────────────────
export interface DayTripDateStatus { date:string; status:'available'|'closed'; }

// ── Per-property availability (new) ──────────────────────────────────────────
// Uses property_id column added by migration 007.
// Falls back to 'default' for legacy data without property_id.

export async function getPropertyAvailability(propertyId: string): Promise<DayTripDateStatus[]> {
  try {
    const { supabase } = await import('./db');
    const { data } = await supabase
      .from('day_trip_availability')
      .select('date, status')
      .eq('property_id', propertyId);
    return (data || []).map((r: any) => ({ date: r.date, status: r.status as 'available' | 'closed' }));
  } catch (e) {
    console.warn('[getPropertyAvailability]', e);
    return [];
  }
}

export async function savePropertyAvailability(propertyId: string, slots: DayTripDateStatus[]): Promise<void> {
  if (!slots.length) return;
  try {
    const { supabase } = await import('./db');
    await supabase.from('day_trip_availability').upsert(
      slots.map(s => ({ property_id: propertyId, date: s.date, status: s.status })),
      { onConflict: 'property_id,date' }
    );
  } catch (e) { console.warn('[savePropertyAvailability]', e); }
}

export async function getPropertyDateStatus(propertyId: string, date: string): Promise<'available' | 'closed'> {
  try {
    const { supabase } = await import('./db');
    const { data } = await supabase
      .from('day_trip_availability')
      .select('status')
      .eq('property_id', propertyId)
      .eq('date', date)
      .single();
    return (data?.status ?? 'available') as 'available' | 'closed';
  } catch {
    return 'available';
  }
}

// ── Legacy (shared) availability — kept for backward compatibility ─────────────

export const getDayTripAvailability = (): DayTripDateStatus[] => {
  _refreshDayTripAvailabilityFromSupabase();
  return JSON.parse(localStorage.getItem(_DT_KEY) || '[]');
};

async function _refreshDayTripAvailabilityFromSupabase(): Promise<void> {
  try {
    const { supabase } = await import('./db');
    const { data } = await supabase.from('day_trip_availability').select('*').eq('property_id', 'default');
    if (!data) return;
    const slots: DayTripDateStatus[] = data.map((row: any) => ({ date: row.date, status: row.status }));
    _dayTripAvailCache = slots;
    localStorage.setItem(_DT_KEY, JSON.stringify(slots));
  } catch (e) { console.warn('[refreshDayTripAvailabilityFromSupabase]', e); }
}

export const saveDayTripAvailability = (slots: DayTripDateStatus[]): void => {
  const base = getDayTripAvailability();
  for (const s of slots) { const i=base.findIndex(x=>x.date===s.date); if(i>=0)base[i]=s; else base.push(s); }
  _dayTripAvailCache = base;
  localStorage.setItem(_DT_KEY, JSON.stringify(base));
  _syncDayTripAvailabilityToSupabase(slots);
};

async function _syncDayTripAvailabilityToSupabase(slots: DayTripDateStatus[]): Promise<void> {
  if (!slots.length) return;
  try {
    const { supabase } = await import('./db');
    await supabase.from('day_trip_availability').upsert(
      slots.map(s => ({ property_id: 'default', date: s.date, status: s.status })),
      { onConflict: 'property_id,date' }
    );
  } catch (e) { console.warn('[syncDayTripAvailabilityToSupabase]', e); }
}

export const getDayTripDateStatus = (date: string): 'available' | 'closed' =>
  getDayTripAvailability().find(s => s.date === date)?.status ?? 'available';
