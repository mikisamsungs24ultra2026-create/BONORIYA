/**
 * CouponApply — Booking-page coupon section.
 * Shows public coupons as tappable cards + manual code input.
 * Live validation, price breakdown, applied/remove state.
 */
import { useState, useEffect } from 'react';
import { Tag, CheckCircle, X, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { validateCoupon, getPublicActiveCoupons, syncCouponsFromSupabase, formatCouponDate, type Coupon, type BookingType, type PropertyType, type ValidationContext } from '../utils/coupons';

export interface CouponResult {
  couponId: string;
  couponCode: string;
  discountAmount: number;
  finalAmount: number;
}

interface Props {
  bookingType: BookingType;
  propertyType: PropertyType;
  totalAmount: number;
  guestId: string;
  priorBookings: number;
  isNewUser: boolean;
  isLoggedIn: boolean;
  applied: CouponResult | null;
  onApply: (r: CouponResult | null) => void;
}

export default function CouponApply({ bookingType, propertyType, totalAmount, guestId, priorBookings, isNewUser, isLoggedIn, applied, onApply }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<Coupon[]>([]);

  useEffect(() => {
    // Sync from Supabase on mount so offers are always live
    syncCouponsFromSupabase().then(() => setAvailable(getPublicActiveCoupons(bookingType)));
  }, [bookingType]);

  const ctx: ValidationContext = { bookingType, propertyType, totalAmount, guestId, isNewUser, priorBookings, isLoggedIn };

  const tryApply = (inputCode: string) => {
    if (!inputCode.trim()) return;
    setChecking(true); setError('');
    setTimeout(() => {
      const r = validateCoupon(inputCode, ctx);
      setChecking(false);
      if (r.valid && r.coupon) { onApply({ couponId: r.coupon.id, couponCode: r.coupon.code, discountAmount: r.discountAmount, finalAmount: r.finalAmount }); setCode(''); setExpanded(false); }
      else setError(r.error ?? 'Invalid coupon.');
    }, 380);
  };

  const remove = () => { onApply(null); setError(''); setCode(''); };

  // ── Applied state ─────────────────────────────────────────────────────────
  if (applied) {
    return (
      <div className="rounded-xl border-2 border-green-500 bg-green-50 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0"><CheckCircle className="h-4 w-4 text-white" /></div>
            <div>
              <p className="text-sm font-semibold text-green-800">Coupon Applied!</p>
              <p className="text-xs text-green-700 font-mono font-bold tracking-wider">{applied.couponCode}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-sm font-bold text-green-700">You save ₹{applied.discountAmount.toLocaleString()}</p>
            <button onClick={remove} className="p-1.5 hover:bg-green-200 rounded-full text-green-600"><X className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="px-4 pb-4 pt-1 border-t border-green-200 space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground"><span>Original Amount</span><span className="line-through">₹{(applied.finalAmount + applied.discountAmount).toLocaleString()}</span></div>
          <div className="flex justify-between text-green-700 font-medium"><span>Discount ({applied.couponCode})</span><span>− ₹{applied.discountAmount.toLocaleString()}</span></div>
          <div className="flex justify-between font-bold text-base pt-1.5 border-t border-green-200"><span>Final Amount</span><span className="text-green-800">₹{applied.finalAmount.toLocaleString()}</span></div>
        </div>
      </div>
    );
  }

  // ── Default / collapsed ───────────────────────────────────────────────────
  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden">
      <button type="button" onClick={() => setExpanded(e => !e)} className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/30 transition-colors">
        <div className="flex items-center gap-2.5">
          <Tag className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Apply Coupon / Promo Code</span>
          {available.length > 0 && <span className="px-2 py-0.5 bg-primary/10 text-primary text-[11px] rounded-full font-medium">{available.length} available</span>}
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border px-4 pb-5 pt-4 space-y-4">
          <div className="flex gap-2">
            <input
              className="flex-1 px-3.5 py-2.5 border border-border rounded-lg text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-ring font-mono tracking-wider uppercase placeholder:normal-case placeholder:tracking-normal"
              placeholder="Enter coupon code"
              value={code}
              onChange={e => { setCode(e.target.value.toUpperCase()); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && tryApply(code)}
            />
            <button type="button" onClick={() => tryApply(code)} disabled={!code.trim() || checking}
              className="px-5 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap">
              {checking ? 'Checking…' : 'Apply'}
            </button>
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2.5 rounded-lg">
              <X className="h-4 w-4 flex-shrink-0 mt-0.5" />{error}
            </div>
          )}

          {available.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Available Offers</p>
              <div className="space-y-2.5">
                {available.map(c => {
                  const preview = validateCoupon(c.code, ctx);
                  return (
                    <div key={c.id} onClick={() => preview.valid && tryApply(c.code)}
                      className={`relative flex items-start gap-3 p-3.5 rounded-xl border transition-all duration-200 ${preview.valid ? 'border-primary/25 bg-primary/[0.025] hover:border-primary/50 cursor-pointer' : 'border-border bg-muted/20 opacity-60 cursor-not-allowed'}`}>
                      <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${preview.valid ? 'bg-primary' : 'bg-border'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-mono font-bold text-sm text-primary tracking-wider">{c.code}</span>
                          <span className="px-2 py-0.5 bg-primary text-primary-foreground text-[11px] font-semibold rounded-full">
                            {c.discountType === 'percentage' ? `${c.discountValue}% OFF` : `₹${c.discountValue} OFF`}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">{c.description || c.name}</p>
                        <div className="flex flex-wrap gap-2 mt-1.5 text-[11px] text-muted-foreground">
                          {c.maxDiscountAmount > 0 && <span>Max ₹{c.maxDiscountAmount.toLocaleString()}</span>}
                          {c.minBookingAmount > 0 && <span>· Min ₹{c.minBookingAmount.toLocaleString()}</span>}
                          <span>· Valid till {formatCouponDate(c.validUntil)}</span>
                        </div>
                        {!preview.valid && preview.error && <p className="text-[11px] text-red-600 mt-1">{preview.error}</p>}
                      </div>
                      {preview.valid && (
                        <span className="absolute top-2.5 right-3 bg-green-100 text-green-800 text-[11px] font-semibold px-2 py-0.5 rounded-full">
                          Save ₹{preview.discountAmount.toLocaleString()}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {isNewUser && isLoggedIn && !available.find(c => c.code === 'NEWBONORIYA') && (
            <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <Sparkles className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-800">New user offer available!</p>
                <p className="text-xs text-amber-700 mt-0.5">Use code <span className="font-mono font-bold">NEWBONORIYA</span> for 10% off your first 3 stays.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
