/**
 * CouponAdmin — Admin Dashboard coupon management tab.
 * Analytics, data table, create/edit modal, toggle, duplicate, delete, CSV export.
 */
import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit, Trash2, Copy, Search, X, CheckCircle, Tag, TrendingUp, BarChart2, AlertCircle, Download, ToggleLeft, ToggleRight } from 'lucide-react';
import { getAllCoupons, createCoupon, updateCoupon, deleteCoupon, duplicateCoupon, getCouponAnalytics, refreshCouponStatuses, syncCouponsFromSupabase, formatCouponDate, type Coupon, type BookingType, type PropertyType, type DiscountType, type ApplicableDays, type UserType, type Visibility, type CouponStatus, type CouponAnalytics } from '../utils/coupons';

const STATUS_COLORS: Record<CouponStatus, string> = {
  active: 'bg-green-100 text-green-800',
  scheduled: 'bg-blue-100 text-blue-800',
  expired: 'bg-gray-100 text-gray-500',
  disabled: 'bg-red-100 text-red-700',
};

function blank() {
  const today = new Date().toISOString().split('T')[0];
  const next = new Date(); next.setFullYear(next.getFullYear() + 1);
  return { name:'', code:'', description:'', bookingType:'both' as BookingType, propertyType:'both' as PropertyType, discountType:'percentage' as DiscountType, discountValue:10, minBookingAmount:0, maxDiscountAmount:0, validFrom:today, validUntil:next.toISOString().split('T')[0], applicableDays:'everyday' as ApplicableDays, maxUsagePerUser:0, maxOverallRedemptions:0, applicableUserType:'all' as UserType, visibility:'public' as Visibility, status:'active' as CouponStatus, createdBy:'BONORIYA Admin', isDefault:false };
}

function Analytics({ a }: { a: CouponAnalytics }) {
  const tiles = [
    { label:'Total Coupons', value:a.total, cls:'bg-primary/8 text-primary', Icon:Tag },
    { label:'Active', value:a.active, cls:'bg-green-50 text-green-700', Icon:CheckCircle },
    { label:'Scheduled', value:a.scheduled, cls:'bg-blue-50 text-blue-700', Icon:BarChart2 },
    { label:'Expired', value:a.expired, cls:'bg-gray-50 text-gray-500', Icon:AlertCircle },
    { label:'Redemptions', value:a.totalRedemptions, cls:'bg-amber-50 text-amber-700', Icon:TrendingUp },
    { label:'Most Used', value:a.mostUsed?.code ?? '—', cls:'bg-forest-900/8 text-forest-900', Icon:Tag },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {tiles.map(({ label, value, cls, Icon }) => (
        <div key={label} className={`${cls} rounded-xl p-3.5`}>
          <div className="flex items-center justify-between mb-1"><p className="text-[11px] opacity-60 uppercase tracking-wide">{label}</p><Icon className="h-3.5 w-3.5 opacity-50" /></div>
          <p className="text-xl font-semibold">{value}</p>
        </div>
      ))}
    </div>
  );
}

function FormModal({ initial, isEdit, onSave, onClose }: { initial: any; isEdit: boolean; onSave: (d: any) => void; onClose: () => void }) {
  const [f, setF] = useState({ ...initial });
  const [err, setErr] = useState('');
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));
  const inp = "w-full px-3 py-2.5 border border-border rounded-lg bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  const submit = () => {
    if (!f.name.trim()) { setErr('Coupon Name is required.'); return; }
    if (!f.code.trim()) { setErr('Coupon Code is required.'); return; }
    if (f.discountValue <= 0) { setErr('Discount value must be greater than 0.'); return; }
    if (!f.validFrom || !f.validUntil) { setErr('Validity dates are required.'); return; }
    if (f.validFrom > f.validUntil) { setErr('"Valid Until" must be after "Valid From".'); return; }
    setErr(''); onSave({ ...f, code: f.code.toUpperCase().trim() });
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center overflow-y-auto py-6 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-border">
          <h3 className="text-lg font-semibold">{isEdit ? 'Edit Coupon' : 'Create New Coupon'}</h3>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg"><X className="h-5 w-5" /></button>
        </div>
        <div className="px-6 py-5 space-y-4 max-h-[72vh] overflow-y-auto">
          {err && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{err}</div>}
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Coupon Name *</label><input className={inp} value={f.name} onChange={e=>set('name',e.target.value)} placeholder="e.g. Monsoon Special" /></div>
            <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Coupon Code *</label><input className={inp} value={f.code} onChange={e=>set('code',e.target.value.toUpperCase().replace(/\s/g,''))} placeholder="MONSOON25" /></div>
          </div>
          <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Description</label><textarea className={inp} rows={2} value={f.description} onChange={e=>set('description',e.target.value)} placeholder="Brief description for users" /></div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Booking Type</label>
              <select className={inp} value={f.bookingType} onChange={e=>set('bookingType',e.target.value)}><option value="book-stays">Book Stays</option><option value="day-trips">Day Trips</option><option value="both">Both</option></select></div>
            <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Property Type</label>
              <select className={inp} value={f.propertyType} onChange={e=>set('propertyType',e.target.value)}><option value="bonoriya_own">BONORIYA Own</option><option value="associated">Associated</option><option value="both">Both</option></select></div>
            <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">User Type</label>
              <select className={inp} value={f.applicableUserType} onChange={e=>set('applicableUserType',e.target.value)}><option value="all">All Users</option><option value="new">New Users Only</option><option value="existing">Existing Users Only</option></select></div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Discount Type</label>
              <select className={inp} value={f.discountType} onChange={e=>set('discountType',e.target.value)}><option value="percentage">Percentage (%)</option><option value="fixed">Fixed Amount (₹)</option></select></div>
            <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Value {f.discountType==='percentage'?'(%)':'(₹)'}</label>
              <input type="number" min={1} className={inp} value={f.discountValue} onChange={e=>set('discountValue',+e.target.value||0)} /></div>
            <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Max Discount Cap ₹ (0=no cap)</label>
              <input type="number" min={0} className={inp} value={f.maxDiscountAmount} onChange={e=>set('maxDiscountAmount',+e.target.value||0)} /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Min Booking Amount ₹ (0=none)</label>
              <input type="number" min={0} className={inp} value={f.minBookingAmount} onChange={e=>set('minBookingAmount',+e.target.value||0)} /></div>
            <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Applicable Days</label>
              <select className={inp} value={f.applicableDays} onChange={e=>set('applicableDays',e.target.value)}><option value="everyday">Every Day</option><option value="weekends">Weekends Only</option><option value="weekdays">Weekdays Only</option></select></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Valid From</label><input type="date" className={inp} value={f.validFrom} onChange={e=>set('validFrom',e.target.value)} /></div>
            <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Valid Until</label><input type="date" className={inp} value={f.validUntil} onChange={e=>set('validUntil',e.target.value)} /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Max Usage / User (0=unlimited)</label>
              <input type="number" min={0} className={inp} value={f.maxUsagePerUser} onChange={e=>set('maxUsagePerUser',+e.target.value||0)} /></div>
            <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Max Total Redemptions (0=unlimited)</label>
              <input type="number" min={0} className={inp} value={f.maxOverallRedemptions} onChange={e=>set('maxOverallRedemptions',+e.target.value||0)} /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Visibility</label>
              <select className={inp} value={f.visibility} onChange={e=>set('visibility',e.target.value)}><option value="public">Public</option><option value="private">Private</option><option value="invite-only">Invite Only</option></select></div>
            <div><label className="block text-xs font-medium text-muted-foreground mb-1.5">Status</label>
              <select className={inp} value={f.status} onChange={e=>set('status',e.target.value)}><option value="active">Active</option><option value="scheduled">Scheduled</option><option value="disabled">Disabled</option></select></div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted">Cancel</button>
          <button onClick={submit} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90">{isEdit ? 'Save Changes' : 'Create Coupon'}</button>
        </div>
      </div>
    </div>
  );
}

export default function CouponAdmin() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [analytics, setAnalytics] = useState<CouponAnalytics>({ total:0, active:0, expired:0, disabled:0, scheduled:0, totalRedemptions:0, mostUsed:null });
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<CouponStatus|'all'>('all');
  const [filterType, setFilterType] = useState<BookingType|'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Coupon|null>(null);
  const [toast, setToast] = useState('');

  const reload = () => { refreshCouponStatuses(); setCoupons(getAllCoupons()); setAnalytics(getCouponAnalytics()); };

  // On mount: sync from Supabase first, then render from fresh cache
  useEffect(() => {
    syncCouponsFromSupabase().then(() => reload());
  }, []);

  const notify = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const filtered = useMemo(() => coupons.filter(c => {
    const q = search.toLowerCase();
    return (!q || c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
      && (filterStatus === 'all' || c.status === filterStatus)
      && (filterType === 'all' || c.bookingType === filterType || c.bookingType === 'both');
  }), [coupons, search, filterStatus, filterType]);

  const handleCreate = async (d: any) => { await createCoupon(d); reload(); setShowForm(false); notify('Coupon created successfully!'); };
  const handleEdit   = async (d: any) => { await updateCoupon(d.id, d); reload(); setEditing(null); notify('Coupon updated successfully!'); };
  const handleDelete = async (c: Coupon) => {
    if (c.isDefault) { notify('The default NEWBONORIYA coupon cannot be deleted.'); return; }
    if (!confirm(`Delete "${c.code}"? This cannot be undone.`)) return;
    await deleteCoupon(c.id); reload(); notify('Coupon deleted.');
  };
  const handleToggle = async (c: Coupon) => {
    const s: CouponStatus = c.status === 'active' ? 'disabled' : 'active';
    await updateCoupon(c.id, { status: s }); reload(); notify(s === 'active' ? 'Coupon activated.' : 'Coupon disabled.');
  };
  const handleDuplicate = async (c: Coupon) => { await duplicateCoupon(c.id); reload(); notify(`Duplicated as ${c.code}_COPY.`); };
  const exportCSV = () => {
    const rows = [['Code','Name','Type','Discount','Booking Type','Property Type','Valid From','Valid Until','Max/User','Redemptions','Status']];
    coupons.forEach(c => rows.push([c.code,c.name,c.discountType,c.discountType==='percentage'?`${c.discountValue}%`:`₹${c.discountValue}`,c.bookingType,c.propertyType,c.validFrom,c.validUntil,String(c.maxUsagePerUser),String(c.redemptionCount),c.status]));
    const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([rows.map(r=>r.join(',')).join('\n')],{type:'text/csv'})); a.download=`coupons-${new Date().toISOString().split('T')[0]}.csv`; a.click();
  };

  return (
    <div className="space-y-6">
      {toast && <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl bg-green-600 text-white text-sm font-medium"><CheckCircle className="h-5 w-5" />{toast}</div>}

      <div className="bg-white rounded-xl border border-border p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2"><Tag className="h-5 w-5 text-primary" />Discount Coupons</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Create and manage promotional discount codes</p>
          </div>
          <div className="flex gap-2">
            <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted"><Download className="h-4 w-4" />Export CSV</button>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90"><Plus className="h-4 w-4" />New Coupon</button>
          </div>
        </div>
        <Analytics a={analytics} />
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input className="w-full pl-9 pr-4 py-2.5 border border-border rounded-lg text-sm bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Search by code or name…" value={search} onChange={e=>setSearch(e.target.value)} />
          </div>
          <select className="px-3 py-2.5 border border-border rounded-lg text-sm bg-input-background" value={filterStatus} onChange={e=>setFilterStatus(e.target.value as any)}>
            <option value="all">All Statuses</option><option value="active">Active</option><option value="scheduled">Scheduled</option><option value="expired">Expired</option><option value="disabled">Disabled</option>
          </select>
          <select className="px-3 py-2.5 border border-border rounded-lg text-sm bg-input-background" value={filterType} onChange={e=>setFilterType(e.target.value as any)}>
            <option value="all">All Booking Types</option><option value="book-stays">Book Stays</option><option value="day-trips">Day Trips</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                {['Coupon','Discount','Applies To','Validity','Usage Limits','Status','Redemptions','Actions'].map(h=>(
                  <th key={h} className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-muted-foreground text-sm">
                  <Tag className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  {search || filterStatus !== 'all' ? 'No coupons match your filters.' : 'No coupons yet. Create your first one!'}
                </td></tr>
              ) : filtered.map(c => (
                <tr key={c.id} className="border-b border-border hover:bg-muted/20">
                  <td className="py-3.5 px-4">
                    <p className="font-semibold font-mono">{c.code}</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{c.name}</p>
                    {c.isDefault && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Default</span>}
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-semibold text-primary">{c.discountType==='percentage'?`${c.discountValue}% OFF`:`₹${c.discountValue} OFF`}</p>
                    {c.maxDiscountAmount > 0 && <p className="text-xs text-muted-foreground">Cap ₹{c.maxDiscountAmount.toLocaleString()}</p>}
                    {c.minBookingAmount > 0 && <p className="text-xs text-muted-foreground">Min ₹{c.minBookingAmount.toLocaleString()}</p>}
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="text-xs">{c.bookingType==='both'?'All bookings':c.bookingType==='book-stays'?'Book Stays':'Day Trips'}</p>
                    <p className="text-xs text-muted-foreground">{c.propertyType==='both'?'All properties':c.propertyType==='bonoriya_own'?'BONORIYA Own':'Associated'}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="text-xs">{formatCouponDate(c.validFrom)}</p>
                    <p className="text-xs text-muted-foreground">to {formatCouponDate(c.validUntil)}</p>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-muted-foreground">
                    <p>{c.maxUsagePerUser > 0 ? `${c.maxUsagePerUser}× / user` : 'Unlimited / user'}</p>
                    <p>{c.maxOverallRedemptions > 0 ? `${c.maxOverallRedemptions} total` : 'Unlimited total'}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_COLORS[c.status]}`}>{c.status}</span>
                  </td>
                  <td className="py-3.5 px-4"><p className="font-semibold">{c.redemptionCount}</p></td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1">
                      <button onClick={()=>setEditing(c)} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground" title="Edit"><Edit className="h-3.5 w-3.5" /></button>
                      <button onClick={()=>handleDuplicate(c)} className="p-1.5 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground" title="Duplicate"><Copy className="h-3.5 w-3.5" /></button>
                      <button onClick={()=>handleToggle(c)} className="p-1.5 hover:bg-muted rounded-lg" title={c.status==='active'?'Disable':'Activate'}>
                        {c.status==='active'?<ToggleRight className="h-4 w-4 text-green-600" />:<ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                      </button>
                      {!c.isDefault && <button onClick={()=>handleDelete(c)} className="p-1.5 hover:bg-red-50 rounded-lg text-muted-foreground hover:text-red-600" title="Delete"><Trash2 className="h-3.5 w-3.5" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && <div className="px-4 py-3 text-xs text-muted-foreground border-t border-border">{filtered.length} of {coupons.length} coupon{coupons.length!==1?'s':''}</div>}
      </div>

      {showForm && <FormModal initial={blank()} isEdit={false} onSave={handleCreate} onClose={()=>setShowForm(false)} />}
      {editing && <FormModal initial={editing} isEdit onSave={handleEdit} onClose={()=>setEditing(null)} />}
    </div>
  );
}
