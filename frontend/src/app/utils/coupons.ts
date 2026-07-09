/**
 * BONORIYA — Discount Coupon System
 *
 * Storage strategy:
 *   • Supabase = source of truth (table: coupons)
 *   • localStorage = write-through cache for synchronous reads
 *
 * All sync functions (validateCoupon, getPublicActiveCoupons, etc.)
 * read from the localStorage cache, which is populated by
 * syncCouponsFromSupabase() called on Admin / Booking page mount.
 *
 * All write operations (create/update/delete/redeem) write to BOTH
 * localStorage and Supabase. Supabase errors are caught and logged;
 * the operation still succeeds locally so UX is never blocked.
 */

export type BookingType    = 'book-stays' | 'day-trips' | 'both';
export type PropertyType   = 'bonoriya_own' | 'associated' | 'both';
export type DiscountType   = 'percentage' | 'fixed';
export type ApplicableDays = 'everyday' | 'weekends' | 'weekdays';
export type UserType       = 'new' | 'existing' | 'all';
export type Visibility     = 'public' | 'private' | 'invite-only';
export type CouponStatus   = 'active' | 'scheduled' | 'expired' | 'disabled';

export interface Coupon {
  id: string;
  name: string;
  code: string;
  description: string;
  bookingType: BookingType;
  propertyType: PropertyType;
  discountType: DiscountType;
  discountValue: number;
  minBookingAmount: number;
  maxDiscountAmount: number;
  validFrom: string;
  validUntil: string;
  applicableDays: ApplicableDays;
  maxUsagePerUser: number;
  maxOverallRedemptions: number;
  applicableUserType: UserType;
  visibility: Visibility;
  status: CouponStatus;
  redemptionCount: number;
  createdBy: string;
  createdAt: string;
  isDefault?: boolean;
  userRedemptions?: Record<string, number>;
}

export interface CouponValidationResult {
  valid: boolean;
  error?: string;
  discountAmount: number;
  finalAmount: number;
  coupon?: Coupon;
}

export interface ValidationContext {
  bookingType: BookingType;
  propertyType: PropertyType;
  totalAmount: number;
  guestId: string;
  isNewUser: boolean;
  priorBookings: number;
  isLoggedIn: boolean;
}

// ── Supabase row ↔ Coupon mapping ─────────────────────────────────────────────

function rowToCoupon(row: any): Coupon {
  return {
    id:                    row.id,
    name:                  row.name,
    code:                  row.code,
    description:           row.description ?? '',
    bookingType:           (row.booking_type ?? 'both') as BookingType,
    propertyType:          (row.property_type ?? 'both') as PropertyType,
    discountType:          (row.discount_type ?? 'percentage') as DiscountType,
    discountValue:         Number(row.discount_value ?? 0),
    minBookingAmount:      Number(row.min_booking_amount ?? 0),
    maxDiscountAmount:     Number(row.max_discount_amount ?? 0),
    validFrom:             row.valid_from,
    validUntil:            row.valid_until,
    applicableDays:        (row.applicable_days ?? 'everyday') as ApplicableDays,
    maxUsagePerUser:       row.max_usage_per_user ?? 0,
    maxOverallRedemptions: row.max_overall_redemptions ?? 0,
    applicableUserType:    (row.applicable_user_type ?? 'all') as UserType,
    visibility:            (row.visibility ?? 'public') as Visibility,
    status:                (row.status ?? 'active') as CouponStatus,
    redemptionCount:       row.redemption_count ?? 0,
    createdBy:             row.created_by ?? 'BONORIYA Admin',
    createdAt:             row.created_at ?? new Date().toISOString(),
    isDefault:             row.is_default ?? false,
    userRedemptions:       typeof row.user_redemptions === 'object' ? row.user_redemptions : {},
  };
}

function couponToRow(c: Coupon): Record<string, unknown> {
  return {
    id:                      c.id,
    name:                    c.name,
    code:                    c.code.toUpperCase(),
    description:             c.description,
    booking_type:            c.bookingType,
    property_type:           c.propertyType,
    discount_type:           c.discountType,
    discount_value:          c.discountValue,
    min_booking_amount:      c.minBookingAmount,
    max_discount_amount:     c.maxDiscountAmount,
    valid_from:              c.validFrom,
    valid_until:             c.validUntil,
    applicable_days:         c.applicableDays,
    max_usage_per_user:      c.maxUsagePerUser,
    max_overall_redemptions: c.maxOverallRedemptions,
    applicable_user_type:    c.applicableUserType,
    visibility:              c.visibility,
    status:                  c.status,
    redemption_count:        c.redemptionCount,
    user_redemptions:        c.userRedemptions ?? {},
    created_by:              c.createdBy,
    is_default:              c.isDefault ?? false,
  };
}

// ── localStorage cache (synchronous reads) ────────────────────────────────────

const CACHE_KEY = 'bonoriya_coupons';

const DEFAULT_COUPON: Coupon = {
  id: 'default-newbonoriya',
  name: 'New User Welcome Offer',
  code: 'NEWBONORIYA',
  description: '10% off on your first 3 stays — exclusively for new Bonoriya members. Valid on all Bonoriya properties.',
  bookingType: 'book-stays',
  propertyType: 'both',
  discountType: 'percentage',
  discountValue: 10,
  minBookingAmount: 0,
  maxDiscountAmount: 2000,
  validFrom: '2024-01-01',
  validUntil: '2026-12-31',
  applicableDays: 'everyday',
  maxUsagePerUser: 3,
  maxOverallRedemptions: 0,
  applicableUserType: 'new',
  visibility: 'public',
  status: 'active',
  redemptionCount: 0,
  createdBy: 'BONORIYA Admin',
  createdAt: '2024-01-01T00:00:00.000Z',
  isDefault: true,
  userRedemptions: {},
};

function persistCache(coupons: Coupon[]) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(coupons)); } catch { /* noop */ }
}

/** Synchronous read from localStorage cache (fast, no async needed in render) */
export function getAllCoupons(): Coupon[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) { const d = [DEFAULT_COUPON]; persistCache(d); return d; }
    const parsed: Coupon[] = JSON.parse(raw);
    if (!parsed.find(c => c.id === 'default-newbonoriya')) { parsed.unshift(DEFAULT_COUPON); persistCache(parsed); }
    return parsed;
  } catch { return [DEFAULT_COUPON]; }
}

export function getCouponByCode(code: string): Coupon | null {
  return getAllCoupons().find(c => c.code.toUpperCase() === code.trim().toUpperCase()) ?? null;
}

// ── Supabase sync ─────────────────────────────────────────────────────────────

/**
 * Fetch all coupons from Supabase and refresh the localStorage cache.
 * Call this on Admin Dashboard mount and on Booking page load.
 * Falls back to localStorage if Supabase is unreachable.
 */
export async function syncCouponsFromSupabase(): Promise<Coupon[]> {
  try {
    const { supabase } = await import('./db');
    const { data, error } = await supabase
      .from('coupons')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      if (_isTableMissing(error)) {
        console.warn('[coupons] Table not yet created — using localStorage cache. Run migration 010_coupons.sql.');
        return getAllCoupons();
      }
      throw error;
    }

    const coupons: Coupon[] = (data ?? []).map(rowToCoupon);

    // Ensure default coupon is always present
    if (!coupons.find(c => c.id === 'default-newbonoriya')) coupons.unshift(DEFAULT_COUPON);

    persistCache(coupons);
    return coupons;
  } catch (e) {
    console.warn('[syncCouponsFromSupabase]', e);
    return getAllCoupons(); // graceful fallback
  }
}

function _isTableMissing(error: any): boolean {
  const msg = String(error?.message ?? error?.code ?? '').toLowerCase();
  return msg.includes('relation') || msg.includes('does not exist') || error?.code === '42P01' || error?.code === 'PGRST116';
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createCoupon(
  data: Omit<Coupon, 'id' | 'redemptionCount' | 'createdAt' | 'userRedemptions'>
): Promise<Coupon> {
  const coupon: Coupon = {
    ...data,
    id: Date.now().toString() + Math.random().toString(36).slice(2, 6),
    code: data.code.toUpperCase().trim(),
    redemptionCount: 0,
    createdAt: new Date().toISOString(),
    userRedemptions: {},
  };

  // Write to localStorage immediately
  const all = getAllCoupons();
  persistCache([...all, coupon]);

  // Persist to Supabase (non-blocking)
  try {
    const { supabase } = await import('./db');
    const { error } = await supabase.from('coupons').insert(couponToRow(coupon));
    if (error && !_isTableMissing(error)) console.error('[createCoupon] Supabase:', error.message);
  } catch (e) { console.warn('[createCoupon]', e); }

  return coupon;
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateCoupon(id: string, updates: Partial<Coupon>): Promise<boolean> {
  const all = getAllCoupons();
  const idx = all.findIndex(c => c.id === id);
  if (idx < 0) return false;

  const updated: Coupon = { ...all[idx], ...updates };
  if (updates.code) updated.code = updates.code.toUpperCase().trim();
  all[idx] = updated;
  persistCache(all);

  try {
    const { supabase } = await import('./db');
    const dbRow: Record<string, unknown> = {};
    if (updates.name             !== undefined) dbRow.name                   = updates.name;
    if (updates.code             !== undefined) dbRow.code                   = updates.code.toUpperCase().trim();
    if (updates.description      !== undefined) dbRow.description            = updates.description;
    if (updates.bookingType      !== undefined) dbRow.booking_type           = updates.bookingType;
    if (updates.propertyType     !== undefined) dbRow.property_type          = updates.propertyType;
    if (updates.discountType     !== undefined) dbRow.discount_type          = updates.discountType;
    if (updates.discountValue    !== undefined) dbRow.discount_value         = updates.discountValue;
    if (updates.minBookingAmount !== undefined) dbRow.min_booking_amount     = updates.minBookingAmount;
    if (updates.maxDiscountAmount!== undefined) dbRow.max_discount_amount    = updates.maxDiscountAmount;
    if (updates.validFrom        !== undefined) dbRow.valid_from             = updates.validFrom;
    if (updates.validUntil       !== undefined) dbRow.valid_until            = updates.validUntil;
    if (updates.applicableDays   !== undefined) dbRow.applicable_days        = updates.applicableDays;
    if (updates.maxUsagePerUser  !== undefined) dbRow.max_usage_per_user     = updates.maxUsagePerUser;
    if (updates.maxOverallRedemptions !== undefined) dbRow.max_overall_redemptions = updates.maxOverallRedemptions;
    if (updates.applicableUserType!== undefined) dbRow.applicable_user_type  = updates.applicableUserType;
    if (updates.visibility       !== undefined) dbRow.visibility             = updates.visibility;
    if (updates.status           !== undefined) dbRow.status                 = updates.status;
    if (updates.redemptionCount  !== undefined) dbRow.redemption_count       = updates.redemptionCount;
    if (updates.userRedemptions  !== undefined) dbRow.user_redemptions       = updates.userRedemptions;

    const { error } = await supabase.from('coupons').update(dbRow).eq('id', id);
    if (error && !_isTableMissing(error)) console.error('[updateCoupon] Supabase:', error.message);
  } catch (e) { console.warn('[updateCoupon]', e); }

  return true;
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteCoupon(id: string): Promise<boolean> {
  if (id === 'default-newbonoriya') return false;
  persistCache(getAllCoupons().filter(c => c.id !== id));

  try {
    const { supabase } = await import('./db');
    const { error } = await supabase.from('coupons').delete().eq('id', id);
    if (error && !_isTableMissing(error)) console.error('[deleteCoupon] Supabase:', error.message);
  } catch (e) { console.warn('[deleteCoupon]', e); }

  return true;
}

// ── Duplicate ─────────────────────────────────────────────────────────────────

export async function duplicateCoupon(id: string): Promise<Coupon | null> {
  const orig = getAllCoupons().find(c => c.id === id);
  if (!orig) return null;
  const { id: _i, redemptionCount: _r, userRedemptions: _u, createdAt: _c, ...rest } = orig;
  return createCoupon({ ...rest, code: orig.code + '_COPY', name: orig.name + ' (Copy)', status: 'disabled', isDefault: false });
}

// ── Redeem ────────────────────────────────────────────────────────────────────

export function redeemCoupon(couponId: string, guestId: string): void {
  const all = getAllCoupons();
  const c = all.find(x => x.id === couponId);
  if (!c) return;
  c.redemptionCount = (c.redemptionCount ?? 0) + 1;
  const ur = c.userRedemptions ?? {}; ur[guestId] = (ur[guestId] ?? 0) + 1; c.userRedemptions = ur;
  persistCache(all);

  // Async Supabase update — fire and forget
  import('./db').then(({ supabase }) => {
    supabase.from('coupons').update({
      redemption_count: c.redemptionCount,
      user_redemptions: c.userRedemptions,
    }).eq('id', couponId)
    .then(({ error }) => { if (error && !_isTableMissing(error)) console.error('[redeemCoupon]', error.message); });
  }).catch(e => console.warn('[redeemCoupon]', e));
}

// ── Auto-expire (local + Supabase) ────────────────────────────────────────────

export function refreshCouponStatuses(): void {
  const today = new Date().toISOString().split('T')[0];
  const all = getAllCoupons();
  const toExpire: string[] = [];
  const toActivate: string[] = [];

  for (const c of all) {
    if (c.status === 'active' && c.validUntil < today) { c.status = 'expired'; toExpire.push(c.id); }
    if (c.status === 'scheduled' && c.validFrom <= today && c.validUntil >= today) { c.status = 'active'; toActivate.push(c.id); }
  }

  if (toExpire.length || toActivate.length) {
    persistCache(all);
    // Async Supabase batch update
    import('./db').then(({ supabase }) => {
      const updates: Promise<any>[] = [];
      if (toExpire.length)   updates.push(supabase.from('coupons').update({ status: 'expired' }).in('id', toExpire));
      if (toActivate.length) updates.push(supabase.from('coupons').update({ status: 'active' }).in('id', toActivate));
      Promise.all(updates).catch(e => console.warn('[refreshCouponStatuses]', e));
    }).catch(e => console.warn('[refreshCouponStatuses]', e));
  }
}

// ── Validation (synchronous — reads from cache) ───────────────────────────────

export function validateCoupon(code: string, ctx: ValidationContext): CouponValidationResult {
  const fail = (error: string) => ({ valid: false, error, discountAmount: 0, finalAmount: ctx.totalAmount });

  if (!ctx.isLoggedIn) return fail('Please sign in to apply a coupon.');
  const coupon = getCouponByCode(code);
  if (!coupon) return fail('Invalid coupon code. Please check and try again.');

  const today = new Date().toISOString().split('T')[0];
  if (coupon.status !== 'active')
    return fail(coupon.status === 'expired' ? 'This coupon has expired.' :
                coupon.status === 'scheduled' ? 'This coupon is not yet active.' :
                'This coupon is currently disabled.');
  if (today < coupon.validFrom) return fail(`This coupon is valid from ${fmt(coupon.validFrom)}.`);
  if (today > coupon.validUntil) return fail(`This coupon expired on ${fmt(coupon.validUntil)}.`);

  if (coupon.bookingType !== 'both' && coupon.bookingType !== ctx.bookingType)
    return fail(`This coupon is valid for ${coupon.bookingType === 'book-stays' ? 'hotel stays' : 'day trips'} only.`);

  if (coupon.propertyType !== 'both' && coupon.propertyType !== ctx.propertyType)
    return fail(`This coupon is valid for ${coupon.propertyType === 'bonoriya_own' ? 'BONORIYA Own' : 'Associated'} properties only.`);

  if (coupon.minBookingAmount > 0 && ctx.totalAmount < coupon.minBookingAmount)
    return fail(`A minimum booking amount of ₹${coupon.minBookingAmount.toLocaleString()} is required.`);

  if (coupon.applicableUserType === 'new' && !ctx.isNewUser)
    return fail('This coupon is for new users only (fewer than 3 prior confirmed bookings).');
  if (coupon.applicableUserType === 'existing' && ctx.isNewUser)
    return fail('This coupon is for existing users only.');

  const userUsage = (coupon.userRedemptions ?? {})[ctx.guestId] ?? 0;
  if (coupon.maxUsagePerUser > 0 && userUsage >= coupon.maxUsagePerUser)
    return fail(`You have already used this coupon the maximum of ${coupon.maxUsagePerUser} time(s).`);

  if (coupon.maxOverallRedemptions > 0 && coupon.redemptionCount >= coupon.maxOverallRedemptions)
    return fail('This coupon has reached its overall redemption limit.');

  if (coupon.applicableDays !== 'everyday') {
    const dow = new Date().getDay(); const isWknd = dow === 0 || dow === 6;
    if (coupon.applicableDays === 'weekends' && !isWknd) return fail('This coupon is valid on weekends only (Sat & Sun).');
    if (coupon.applicableDays === 'weekdays' && isWknd)  return fail('This coupon is valid on weekdays only (Mon–Fri).');
  }

  let disc = coupon.discountType === 'percentage'
    ? Math.round(ctx.totalAmount * coupon.discountValue / 100)
    : Math.min(coupon.discountValue, ctx.totalAmount);
  if (coupon.discountType === 'percentage' && coupon.maxDiscountAmount > 0)
    disc = Math.min(disc, coupon.maxDiscountAmount);

  return { valid: true, discountAmount: disc, finalAmount: Math.max(0, ctx.totalAmount - disc), coupon };
}

// ── Analytics (reads from cache) ──────────────────────────────────────────────

export interface CouponAnalytics {
  total: number; active: number; expired: number; disabled: number;
  scheduled: number; totalRedemptions: number; mostUsed: Coupon | null;
}

export function getCouponAnalytics(): CouponAnalytics {
  const all = getAllCoupons();
  return {
    total:            all.length,
    active:           all.filter(c => c.status === 'active').length,
    expired:          all.filter(c => c.status === 'expired').length,
    disabled:         all.filter(c => c.status === 'disabled').length,
    scheduled:        all.filter(c => c.status === 'scheduled').length,
    totalRedemptions: all.reduce((s, c) => s + c.redemptionCount, 0),
    mostUsed:         all.length ? all.reduce((a, b) => b.redemptionCount > a.redemptionCount ? b : a) : null,
  };
}

export function getPublicActiveCoupons(bookingType: BookingType): Coupon[] {
  const today = new Date().toISOString().split('T')[0];
  return getAllCoupons().filter(c =>
    c.status === 'active' && c.visibility === 'public' &&
    c.validFrom <= today && c.validUntil >= today &&
    (c.bookingType === 'both' || c.bookingType === bookingType)
  );
}

export function formatCouponDate(iso: string): string { return fmt(iso); }

function fmt(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m-1]} ${y}`;
}
