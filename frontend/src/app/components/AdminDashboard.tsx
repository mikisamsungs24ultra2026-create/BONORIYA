import { useState, useEffect } from 'react';
import {
  Home, Users, Building2, DollarSign, FileText, Settings,
  UserPlus, Search, Edit, Eye, Calendar, Download, Filter,
  TrendingUp, CheckCircle, Clock, AlertCircle, Upload, XCircle,
  BookOpen, Trash2, Plus, X, Save, Phone, Mail,
  MapPin, Printer, Bell
} from 'lucide-react';
import {
  getPendingPartners, getAllPartners, approvePartner, rejectPartner,
  deletePartner as deletePartnerFromStore,
  getAllPartnerProperties, updatePartnerProperty, deletePartnerProperty,
  getAllBookings, getDayTripBookings, updateBookingStatus,
  getBonoriyaPropertyData, saveBonoriyaPropertyData,
  sendBookingStatusEmail,
  deleteBonoriyaGalleryImageFromSupabase, deletePartnerDataFromSupabase,
  getDayTripProperties, createDayTripProperty, updateDayTripProperty,
  deleteDayTripProperty, uploadDayTripPropertyPhoto,
  type PartnerRecord, type PartnerProperty, type BookingEntry,
  type BonoriyaPropertyData, type BonoriyaGalleryImage, type BonoriyaMealOption,
  type DayTripProperty
} from '../utils/auth';
import DayTripCalendar      from './DayTripCalendar';
import DTPFormModal          from './DTPFormModal';
import EmailConfigPanel     from './EmailConfigPanel';
import AnalyticsConfigPanel from './AnalyticsConfigPanel';
import { WA } from '../utils/whatsapp';
import WhatsAppConfigPanel  from './WhatsAppConfigPanel';
import BlogEditor           from './BlogEditor';
import AgreementPreview     from './AgreementPreview';
import SEODashboard         from './SEODashboard';
import CouponAdmin          from './CouponAdmin';
// All booking data is now served from Supabase (see src/app/utils/api.ts)

// ─── Utilities ────────────────────────────────────────────────────────────────

function downloadReportCSV(bookings: BookingEntry[]) {
  const hdrs = ['Booking Ref','Type','Property Type','Guest Name','Guest Address','Phone','Email','Adults','Children','Property','Partner Email','Check-In','Check-Out','Trip Date','Booking Date','Total Amount','Advance','Commission (10%)','GST on Commission (18%)','Total Deduction','Net Payable to Property','Payment Status','Booking Status'];
  const rows = bookings.map(b => [b.bookingRef,b.type,b.propertyType||'bonoriya_own',b.guestName,b.guestAddress||'',b.guestPhone,b.guestEmail,b.adults,b.children,b.propertyName,b.partnerEmail,b.checkIn||'',b.checkOut||'',b.tripDate||'',b.bookingDate,`₹${b.totalAmount}`,`₹${b.advanceAmount}`,`₹${b.commissionAmount??0}`,`₹${b.gstOnCommission??0}`,`₹${b.totalDeduction??0}`,`₹${b.netPayable??b.totalAmount}`,b.paymentStatus,b.bookingStatus]);
  const csv = [hdrs,...rows].map(r=>r.map(c=>`"${c}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}));
  a.download = `bonoriya-report-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
}

// ─── Shared modal shell ───────────────────────────────────────────────────────

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-border sticky top-0 bg-white rounded-t-xl z-10">
          <h2 className="text-xl">{title}</h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-lg"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ─── Property edit modal ──────────────────────────────────────────────────────

function PropertyEditModal({ property, onSave, onClose }: { property: PartnerProperty; onSave: (p: PartnerProperty) => void; onClose: () => void }) {
  const [form, setForm] = useState({ ...property });
  const [amenityInput, setAmenityInput] = useState('');
  const upd = (k: keyof PartnerProperty, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Modal title={`Edit Property: ${property.name}`} onClose={onClose}>
      <div className="space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <div><label className="block mb-1 text-sm">Property Name</label>
            <input className="w-full px-3 py-2 border border-border rounded-lg bg-input-background" value={form.name} onChange={e => upd('name', e.target.value)} /></div>
          <div><label className="block mb-1 text-sm">Location</label>
            <input className="w-full px-3 py-2 border border-border rounded-lg bg-input-background" value={form.location} onChange={e => upd('location', e.target.value)} /></div>
        </div>
        <div><label className="block mb-1 text-sm">Description</label>
          <textarea className="w-full px-3 py-2 border border-border rounded-lg bg-input-background" rows={3} value={form.description} onChange={e => upd('description', e.target.value)} /></div>
        <div className="grid md:grid-cols-3 gap-4">
          <div><label className="block mb-1 text-sm">Rooms</label>
            <input type="number" className="w-full px-3 py-2 border border-border rounded-lg bg-input-background" value={form.rooms} onChange={e => upd('rooms', parseInt(e.target.value) || 1)} /></div>
          <div><label className="block mb-1 text-sm">Max Guests</label>
            <input type="number" className="w-full px-3 py-2 border border-border rounded-lg bg-input-background" value={form.maxGuests} onChange={e => upd('maxGuests', parseInt(e.target.value) || 1)} /></div>
          <div><label className="block mb-1 text-sm">Price/Night (₹)</label>
            <input type="number" className="w-full px-3 py-2 border border-border rounded-lg bg-input-background" value={form.pricePerNight} onChange={e => upd('pricePerNight', parseInt(e.target.value) || 0)} /></div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div><label className="block mb-1 text-sm">Property Type</label>
            <select className="w-full px-3 py-2 border border-border rounded-lg bg-input-background" value={form.type} onChange={e => upd('type', e.target.value)}>
              <option value="Associated">Associated</option>
              <option value="Bonoriya Own">Bonoriya Own</option>
            </select></div>
          <div><label className="block mb-1 text-sm">Status</label>
            <select className="w-full px-3 py-2 border border-border rounded-lg bg-input-background" value={form.active ? 'true' : 'false'} onChange={e => upd('active', e.target.value === 'true')}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select></div>
        </div>
        <div>
          <label className="block mb-1 text-sm">Amenities</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {form.amenities.map((a, i) => (
              <span key={i} className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                {a}<button onClick={() => upd('amenities', form.amenities.filter((_, j) => j !== i))} className="hover:text-red-600"><X className="h-3 w-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input className="flex-1 px-3 py-2 border border-border rounded-lg bg-input-background text-sm" placeholder="Add amenity" value={amenityInput} onChange={e => setAmenityInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && amenityInput.trim()) { upd('amenities', [...form.amenities, amenityInput.trim()]); setAmenityInput(''); } }} />
            <button onClick={() => { if (amenityInput.trim()) { upd('amenities', [...form.amenities, amenityInput.trim()]); setAmenityInput(''); } }} className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm"><Plus className="h-4 w-4" /></button>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={() => onSave(form)} className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"><Save className="h-4 w-4" /> Save Changes</button>
          <button onClick={onClose} className="px-6 py-2 border border-border rounded-lg hover:bg-muted">Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Partner view modal ───────────────────────────────────────────────────────

function PartnerViewModal({ partner, onClose }: { partner: PartnerRecord; onClose: () => void }) {
  return (
    <Modal title="Partner Details" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
          <div className="w-14 h-14 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-2xl flex-shrink-0">{partner.name.charAt(0)}</div>
          <div>
            <h3 className="text-lg font-medium">{partner.name}</h3>
            <p className="text-muted-foreground text-sm">{partner.businessName}</p>
            <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Approved</span>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {([['Email', partner.email], ['Phone', partner.phone], ['Address', partner.address || '—'], ['GST Number', partner.gstNumber || '—'], ['Registered', new Date(partner.createdAt).toLocaleDateString('en-IN')], ['Approved', partner.approvedAt ? new Date(partner.approvedAt).toLocaleDateString('en-IN') : '—']] as [string, string][]).map(([lbl, val]) => (
            <div key={lbl} className="p-3 border border-border rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">{lbl}</p>
              <p className="text-sm font-medium">{val}</p>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

// ─── Partner edit modal ───────────────────────────────────────────────────────

function PartnerEditModal({ partner, onSave, onClose }: { partner: PartnerRecord; onSave: (p: PartnerRecord) => void; onClose: () => void }) {
  const [form, setForm] = useState({ ...partner });
  const upd = (k: keyof PartnerRecord, v: unknown) => setForm(f => ({ ...f, [k]: v }));
  return (
    <Modal title={`Edit Partner: ${partner.name}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          {([['Full Name', 'name', 'text'], ['Business Name', 'businessName', 'text'], ['Email', 'email', 'email'], ['Phone', 'phone', 'tel'], ['Address', 'address', 'text'], ['GST Number', 'gstNumber', 'text']] as [string, keyof PartnerRecord, string][]).map(([lbl, key, type]) => (
            <div key={key}>
              <label className="block mb-1 text-sm">{lbl}</label>
              <input type={type} className="w-full px-3 py-2 border border-border rounded-lg bg-input-background" value={(form[key] as string) || ''} onChange={e => upd(key, e.target.value)} />
            </div>
          ))}
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={() => onSave(form)} className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"><Save className="h-4 w-4" /> Save</button>
          <button onClick={onClose} className="px-6 py-2 border border-border rounded-lg hover:bg-muted">Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Delete partner confirmation modal ────────────────────────────────────────

function DeletePartnerModal({ partner, onConfirm, onClose }: { partner: PartnerRecord; onConfirm: () => void; onClose: () => void }) {
  const [confirmed, setConfirmed] = useState(false);
  return (
    <Modal title="Delete Partner — Irreversible Action" onClose={onClose}>
      <div className="space-y-4">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-800 mb-1">Warning: This action cannot be undone</p>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• Partner account and login credentials will be permanently deleted</li>
              <li>• All property listings belonging to this partner will be removed</li>
              <li>• All uploaded photos and media will be deleted</li>
              <li>• All related booking records will be archived</li>
              <li>• No orphaned records will remain in the system</li>
            </ul>
          </div>
        </div>
        <div className="p-4 border border-border rounded-lg">
          <p className="font-medium">{partner.name}</p>
          <p className="text-sm text-muted-foreground">{partner.businessName} · {partner.email}</p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="rounded" />
          <span className="text-sm">I understand this action is permanent and cannot be reversed</span>
        </label>
        <div className="flex gap-3">
          <button onClick={onConfirm} disabled={!confirmed} className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed">
            <Trash2 className="h-4 w-4" /> Delete Permanently
          </button>
          <button onClick={onClose} className="px-6 py-2 border border-border rounded-lg hover:bg-muted">Cancel</button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Day trip view modal ──────────────────────────────────────────────────────

function DayTripViewModal({ booking, onClose }: { booking: BookingEntry; onClose: () => void }) {
  const balance       = booking.totalAmount - booking.advanceAmount;
  const isAssociated  = booking.propertyType === 'associated';
  const commission    = booking.commissionAmount ?? 0;
  const gst           = booking.gstOnCommission  ?? 0;
  const deduction     = booking.totalDeduction   ?? 0;
  const net           = booking.netPayable       ?? booking.totalAmount;

  return (
    <Modal title={`Booking Details — ${booking.bookingRef}`} onClose={onClose}>
      <div className="space-y-5">
        {/* Booking info */}
        <div className="grid grid-cols-2 gap-3">
          {[
            ['Booking Ref',   booking.bookingRef],
            ['Booking Date',  booking.bookingDate],
            ['Trip Date',     booking.tripDate || booking.checkIn || '—'],
            ['Status',        booking.bookingStatus],
            ['Payment',       booking.paymentStatus],
            ['Property Type', isAssociated ? 'Associated' : 'BONORIYA Own'],
          ].map(([l, v]) => (
            <div key={l} className="p-3 border border-border rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">{l}</p>
              <p className="text-sm font-medium">{v}</p>
            </div>
          ))}
        </div>

        {/* Guest */}
        <div>
          <h3 className="text-xs font-medium mb-2 text-muted-foreground uppercase tracking-wide">Guest Information</h3>
          <div className="grid md:grid-cols-2 gap-3">
            {[['Guest Name', booking.guestName], ['Phone', booking.guestPhone], ['Email', booking.guestEmail], ['Address', booking.guestAddress || '—']].map(([l, v]) => (
              <div key={l} className="p-3 border border-border rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">{l}</p>
                <p className="text-sm font-medium">{v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Trip details */}
        <div>
          <h3 className="text-xs font-medium mb-2 text-muted-foreground uppercase tracking-wide">Trip Details</h3>
          <div className="grid md:grid-cols-3 gap-3">
            {[['Adults', booking.adults], ['Children', booking.children], ['Total Persons', booking.adults + booking.children], ['Meal Option', booking.mealOption || '—'], ['Veg', booking.vegCount ?? '—'], ['Non-Veg', booking.nonVegCount ?? '—']].map(([l, v]) => (
              <div key={String(l)} className="p-3 border border-border rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">{l}</p>
                <p className="text-sm font-medium">{v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Financial Summary */}
        <div>
          <h3 className="text-xs font-medium mb-2 text-muted-foreground uppercase tracking-wide">Financial Summary</h3>
          <div className="rounded-xl border border-border overflow-hidden">
            {/* Payment row */}
            <div className="grid grid-cols-3 gap-0 divide-x divide-border bg-green-50 border-b border-border">
              <div className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Booking Amount</p>
                <p className="text-xl font-semibold">₹{booking.totalAmount.toLocaleString()}</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Advance Paid</p>
                <p className="text-xl font-semibold text-green-600">₹{booking.advanceAmount.toLocaleString()}</p>
              </div>
              <div className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Balance Due</p>
                <p className="text-xl font-semibold text-orange-500">₹{balance.toLocaleString()}</p>
              </div>
            </div>

            {/* Commission breakdown — always shown */}
            <div className={`p-4 ${isAssociated ? 'bg-amber-50' : 'bg-blue-50'}`}>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-3 ${isAssociated ? 'text-amber-800' : 'text-blue-800'}`}>
                {isAssociated ? 'Commission on Booking & GST Breakdown — Associated Property' : 'BONORIYA Own Property — No Commission on Booking · No GST'}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-center text-sm">
                <div className="p-2 bg-white rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground">Commission Rate</p>
                  <p className="font-semibold">{isAssociated ? '10%' : '0%'}</p>
                </div>
                <div className="p-2 bg-white rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground">Commission on Booking</p>
                  <p className="font-semibold text-orange-600">₹{commission.toLocaleString()}</p>
                </div>
                <div className="p-2 bg-white rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground">GST on Commission (18%)</p>
                  <p className="font-semibold text-orange-600">₹{gst.toLocaleString()}</p>
                </div>
                <div className="p-2 bg-white rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground">Total Deduction</p>
                  <p className="font-semibold text-red-600">₹{deduction.toLocaleString()}</p>
                </div>
                <div className="p-2 bg-white rounded-lg border border-green-300 col-span-2 md:col-span-1">
                  <p className="text-xs text-muted-foreground">Net Payable to Property</p>
                  <p className="font-bold text-green-700">₹{net.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-border rounded-lg hover:bg-muted">Close</button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Dashboard Component ─────────────────────────────────────────────────

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  // Live data from localStorage
  const [partners, setPartners] = useState<PartnerRecord[]>([]);
  const [pendingPartners, setPendingPartners] = useState<PartnerRecord[]>([]);
  const [properties, setProperties] = useState<PartnerProperty[]>([]);
  const [liveBookings, setLiveBookings] = useState<BookingEntry[]>([]);
  const [liveDayTrips, setLiveDayTrips] = useState<BookingEntry[]>([]);

  // Pending type changes: propId → pending type value (before Save is clicked)
  const [pendingTypes, setPendingTypes] = useState<Record<string, string>>({});
  const [typeSaveMsg, setTypeSaveMsg] = useState<Record<string, 'saved' | 'error' | ''>>({});

  // BONORIYA Own Property state
  const [bonoriyaProp, setBonoriyaProp] = useState<BonoriyaPropertyData>(() => getBonoriyaPropertyData());
  const [bonoriyaSaveMsg, setBonoriyaSaveMsg] = useState('');
  // Day Trip Properties multi-property state
  const [dayTripProps, setDayTripProps] = useState<DayTripProperty[]>([]);
  const [dtpLoading, setDtpLoading] = useState(false);
  /** null = form closed, null-property = Add New, non-null = Edit */
  const [dtpFormTarget, setDtpFormTarget] = useState<DayTripProperty | null | undefined>(undefined);
  const [openCalendarId, setOpenCalendarId] = useState<string | null>(null);
  const [dtpSaveMsg, setDtpSaveMsg] = useState('');
  const [showAgreementPreview, setShowAgreementPreview] = useState(false);
  const [bonoriyaHighlightInput, setBonoriyaHighlightInput] = useState('');
  const [bonoriyaEditingMeal, setBonoriyaEditingMeal] = useState<number | null>(null);

  // Modal state
  const [editingProperty, setEditingProperty] = useState<PartnerProperty | null>(null);
  const [viewingPartner, setViewingPartner] = useState<PartnerRecord | null>(null);
  const [editingPartner, setEditingPartner] = useState<PartnerRecord | null>(null);
  const [deletingPartner, setDeletingPartner] = useState<PartnerRecord | null>(null);
  const [viewingTrip,  setViewingTrip]  = useState<BookingEntry | null>(null);
  const [actionTrip,   setActionTrip]   = useState<{booking:BookingEntry; action:'Confirmed'|'Cancelled'|'Rejected'}|null>(null);
  const [actionReason, setActionReason] = useState('');

  // Filter state
  const [partnerSearch, setPartnerSearch] = useState('');
  const [propertySearch, setPropertySearch] = useState('');
  const [reportFilters, setReportFilters] = useState({ bookingId: '', property: '', partner: '', paymentStatus: '', checkIn: '', checkOut: '', dateFrom: '', dateTo: '' });
  const [selectedTripPropName, setSelectedTripPropName] = useState('');
  const [reportPeriod, setReportPeriod] = useState('monthly');

  const refreshData = () => {
    setPartners(getAllPartners().filter(p => p.approved));
    setPendingPartners(getPendingPartners());
    setProperties(getAllPartnerProperties());
    const allBookings = getAllBookings();
    setLiveBookings(allBookings.filter(b => b.type === 'hotel'));
    setLiveDayTrips(allBookings.filter(b => b.type === 'day-trip'));
  };

  useEffect(() => {
    refreshData();
    // Load day trip properties (also auto-seeds Bonoriya Agro Eco Tourism if table empty)
    setDtpLoading(true);
    getDayTripProperties().then(props => { setDayTripProps(props); setDtpLoading(false); });
  }, []);

  // Reload day trip properties when either the Properties or Bookings tab opens
  // Ensures the property dropdown always shows the latest list from Supabase
  useEffect(() => {
    if (activeTab === 'bonoriya-property' || activeTab === 'day-trips') {
      getDayTripProperties().then(props => { if (props.length > 0) setDayTripProps(props); });
    }
  }, [activeTab]);

  const handleApprove = (id: string) => {
    approvePartner(id); refreshData();
    const p = getAllPartners().find(x => x.id === id);
    if (p) WA.partnerApproved({ name: p.name, businessName: p.businessName });
  };

  const executeTripAction = () => {
    if (!actionTrip) return;
    updateBookingStatus(actionTrip.booking.id, actionTrip.action);
    sendBookingStatusEmail(actionTrip.booking, actionTrip.action, actionReason);
    // WhatsApp admin notification for trip cancellation/rejection
    if (actionTrip.action === 'Cancelled' || actionTrip.action === 'Rejected') {
      WA.dayTripCancelled({ bookingRef: actionTrip.booking.bookingRef, guestName: actionTrip.booking.guestName, tripDate: actionTrip.booking.tripDate || actionTrip.booking.checkIn || '' });
    }
    setActionTrip(null); setActionReason(''); refreshData();
  };
  const handleReject  = (id: string) => { rejectPartner(id); refreshData(); };

  const handleSaveProperty = (updated: PartnerProperty) => {
    updatePartnerProperty(updated.id, updated);
    setProperties(getAllPartnerProperties());
    setEditingProperty(null);
  };

  const handleSavePartner = (updated: PartnerRecord) => {
    // Persist partner edit to localStorage
    const all = getAllPartners().map(p => p.id === updated.id ? updated : p);
    localStorage.setItem('bonoriya_partners', JSON.stringify(all));
    refreshData();
    setEditingPartner(null);
  };

  const handleDeletePartner = (id: string) => {
    deletePartnerFromStore(id);
    refreshData();
    setDeletingPartner(null);
  };

  const handleDeleteProperty = (id: string) => {
    if (window.confirm('Delete this property? This cannot be undone.')) {
      deletePartnerProperty(id);
      setProperties(getAllPartnerProperties());
    }
  };

  const filteredPartners = partners.filter(p =>
    !partnerSearch ||
    p.name.toLowerCase().includes(partnerSearch.toLowerCase()) ||
    p.businessName.toLowerCase().includes(partnerSearch.toLowerCase()) ||
    p.email.toLowerCase().includes(partnerSearch.toLowerCase())
  );

  const filteredProperties = properties.filter(p =>
    !propertySearch ||
    p.name.toLowerCase().includes(propertySearch.toLowerCase()) ||
    p.partnerName.toLowerCase().includes(propertySearch.toLowerCase()) ||
    p.location.toLowerCase().includes(propertySearch.toLowerCase())
  );

  const allBookingsForReport = getAllBookings();
  const filteredBookings = allBookingsForReport.filter(b => {
    if (reportFilters.bookingId && !b.bookingRef.toLowerCase().includes(reportFilters.bookingId.toLowerCase())) return false;
    if (reportFilters.property && b.propertyName !== reportFilters.property) return false;
    if (reportFilters.partner && b.partnerEmail !== reportFilters.partner) return false;
    if (reportFilters.paymentStatus && b.paymentStatus !== reportFilters.paymentStatus) return false;
    if (reportFilters.checkIn && (b.checkIn || '') < reportFilters.checkIn) return false;
    if (reportFilters.checkOut && (b.checkOut || '') > reportFilters.checkOut) return false;
    if (reportFilters.dateFrom && b.bookingDate < reportFilters.dateFrom) return false;
    if (reportFilters.dateTo && b.bookingDate > reportFilters.dateTo) return false;
    return true;
  });

  const navItems = [
    { id: 'overview',          label: 'Overview',           icon: Home },
    { id: 'bonoriya-property', label: 'Day Trip Properties', icon: MapPin },
    { id: 'approvals',         label: 'New Approvals',       icon: Bell,      badge: pendingPartners.length },
    { id: 'partners',          label: 'Partners',            icon: Users },
    { id: 'properties',        label: 'Properties',          icon: Building2 },
    { id: 'invoices',          label: 'Invoices',            icon: DollarSign },
    { id: 'day-trips',         label: 'Day Trip Bookings',   icon: Calendar },
    { id: 'blogs',             label: 'Blogs',               icon: BookOpen },
    { id: 'reports',           label: 'Booking Reports',     icon: FileText },
    { id: 'staff',             label: 'Staff Management',    icon: UserPlus },
    { id: 'settings',          label: 'Settings',            icon: Settings },
    { id: 'coupons', label: 'Discount Coupons', icon: BookOpen },
    { id: 'seo', label: 'SEO', icon: TrendingUp },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Modals */}
      {editingProperty  && <PropertyEditModal  property={editingProperty}   onSave={handleSaveProperty}              onClose={() => setEditingProperty(null)} />}
      {viewingPartner   && <PartnerViewModal   partner={viewingPartner}                                              onClose={() => setViewingPartner(null)}  />}
      {editingPartner   && <PartnerEditModal   partner={editingPartner}     onSave={handleSavePartner}               onClose={() => setEditingPartner(null)}  />}
      {deletingPartner  && <DeletePartnerModal partner={deletingPartner}    onConfirm={() => handleDeletePartner(deletingPartner.id)} onClose={() => setDeletingPartner(null)} />}
      {viewingTrip      && <DayTripViewModal   booking={viewingTrip}   onClose={() => setViewingTrip(null)} />}
      {showAgreementPreview && <AgreementPreview onClose={() => setShowAgreementPreview(false)} />}

      {/* Booking action confirmation */}
      {actionTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={()=>{setActionTrip(null);setActionReason('');}}>
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6" onClick={e=>e.stopPropagation()}>
            <h2 className="text-xl mb-1">{actionTrip.action} Booking</h2>
            <p className="text-sm text-muted-foreground mb-3">
              {actionTrip.action} booking <strong>{actionTrip.booking.bookingRef}</strong> for <strong>{actionTrip.booking.guestName}</strong>?
              {(actionTrip.action==='Cancelled'||actionTrip.action==='Rejected') && actionTrip.booking.advanceAmount>0 &&
                <span className="block mt-1 text-orange-600">Refund of ₹{actionTrip.booking.advanceAmount.toLocaleString()} will be communicated to guest.</span>}
            </p>
            <textarea className="w-full px-3 py-2 border border-border rounded-lg bg-input-background text-sm mb-3" rows={2}
              placeholder="Reason (optional — included in guest email)" value={actionReason} onChange={e=>setActionReason(e.target.value)}/>
            <p className="text-xs text-muted-foreground mb-4">Notification email → <strong>{actionTrip.booking.guestEmail}</strong> from admin@bonoriya.com</p>
            <div className="flex gap-3">
              <button onClick={executeTripAction}
                className={`flex-1 py-2.5 text-white rounded-lg text-sm font-medium ${actionTrip.action==='Confirmed'?'bg-green-600 hover:bg-green-700':actionTrip.action==='Cancelled'?'bg-orange-500 hover:bg-orange-600':'bg-red-600 hover:bg-red-700'}`}>
                {actionTrip.action} &amp; Notify Guest
              </button>
              <button onClick={()=>{setActionTrip(null);setActionReason('');}} className="flex-1 py-2.5 border border-border rounded-lg hover:bg-muted text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="bg-forest-900 text-white border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl">BONORIYA Admin Panel</h1>
            <p className="text-sm text-white/60">Administrator Dashboard</p>
          </div>
          <div className="flex items-center gap-3">
            {pendingPartners.length > 0 && (
              <button onClick={() => setActiveTab('approvals')} className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-full text-sm hover:bg-red-700">
                <Bell className="h-4 w-4" />
                {pendingPartners.length} pending approval{pendingPartners.length !== 1 ? 's' : ''}
              </button>
            )}
            <span className="px-3 py-1 bg-green-600 text-white rounded-full text-xs">Super Admin</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid lg:grid-cols-4 gap-6">

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-border p-3 sticky top-4">
              <nav className="space-y-0.5 max-h-[calc(100vh-120px)] overflow-y-auto">
                {navItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left ${activeTab === item.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                  >
                    <item.icon className="h-4 w-4 flex-shrink-0" />
                    <span className="text-sm flex-1">{item.label}</span>
                    {(item as any).badge > 0 && (
                      <span className={`text-xs rounded-full w-5 h-5 flex items-center justify-center font-medium ${activeTab === item.id ? 'bg-white text-primary' : 'bg-red-500 text-white'}`}>
                        {(item as any).badge}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main content */}
          <div className="lg:col-span-3 space-y-0">

            {/* ── OVERVIEW ── */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Approved Partners', value: String(partners.length), icon: Users, color: 'bg-blue-500', change: `${pendingPartners.length} pending` },
                    { label: 'Active Properties', value: String(properties.filter(p => p.active).length), icon: Building2, color: 'bg-green-500', change: 'Partner listings' },
                    { label: 'Total Bookings', value: String(getAllBookings().length), icon: Calendar, color: 'bg-purple-500', change: `${liveDayTrips.length} day trips` },
                    { label: 'Commission on Booking', value: '10%', icon: TrendingUp, color: 'bg-orange-500', change: 'Associated props only' }
                  ].map((s, i) => (
                    <div key={i} className="bg-white rounded-lg shadow-sm border border-border p-6">
                      <div className={`${s.color} p-3 rounded-lg w-fit mb-3`}><s.icon className="h-6 w-6 text-white" /></div>
                      <p className="text-2xl mb-1">{s.value}</p>
                      <p className="text-sm text-muted-foreground mb-1">{s.label}</p>
                      <p className="text-xs text-green-600">{s.change}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-border p-6">
                  <h2 className="text-xl mb-4">Recent Activity</h2>
                  <div className="space-y-3">
                    {pendingPartners.length > 0 ? (
                      <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                        <Bell className="h-5 w-5 text-red-500 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm">{pendingPartners.length} new partner registration{pendingPartners.length !== 1 ? 's' : ''} awaiting approval</p>
                          <button onClick={() => setActiveTab('approvals')} className="text-xs text-primary hover:underline mt-0.5">Review now →</button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-green-500" />
                        <p className="text-sm">No pending approvals — all registrations reviewed</p>
                      </div>
                    )}
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                      <Clock className="h-5 w-5 text-yellow-500" />
                      <div><p className="text-sm">Day trip bookings active for June 2026</p><p className="text-xs text-muted-foreground">3 confirmed bookings</p></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── NEW APPROVALS ── */}
            {activeTab === 'approvals' && (
              <div className="bg-white rounded-lg shadow-sm border border-border p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl">New Partner Approvals</h2>
                  {pendingPartners.length > 0 && (
                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                      {pendingPartners.length} pending
                    </span>
                  )}
                </div>

                {pendingPartners.length === 0 ? (
                  <div className="text-center py-16">
                    <CheckCircle className="h-14 w-14 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg mb-2">All caught up!</h3>
                    <p className="text-muted-foreground text-sm">No pending approvals. All partner registrations have been reviewed.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingPartners.map(partner => (
                      <div key={partner.id} className="border border-border rounded-xl p-5 hover:border-primary/30 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1 min-w-0">
                            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-lg flex-shrink-0">
                              {partner.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-base">{partner.name}</h3>
                              <p className="text-sm text-muted-foreground mb-3">{partner.businessName}</p>
                              <div className="grid md:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Mail className="h-3.5 w-3.5 flex-shrink-0" /><span className="truncate">{partner.email}</span>
                                </div>
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Phone className="h-3.5 w-3.5 flex-shrink-0" /><span>{partner.phone}</span>
                                </div>
                                {partner.address && (
                                  <div className="flex items-center gap-1.5 text-muted-foreground md:col-span-2">
                                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" /><span>{partner.address}</span>
                                  </div>
                                )}
                                {partner.gstNumber && (
                                  <div className="flex items-center gap-1.5 text-muted-foreground">
                                    <FileText className="h-3.5 w-3.5 flex-shrink-0" /><span>GST: {partner.gstNumber}</span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                  <Clock className="h-3.5 w-3.5 flex-shrink-0" />
                                  <span>Registered: {new Date(partner.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleApprove(partner.id)}
                              className="flex items-center gap-2 px-5 py-2 bg-forest-900 text-white rounded-lg hover:bg-forest-900/80 text-sm font-medium whitespace-nowrap"
                            >
                              <CheckCircle className="h-4 w-4" /> Approve
                            </button>
                            <button
                              onClick={() => handleReject(partner.id)}
                              className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium whitespace-nowrap"
                            >
                              <XCircle className="h-4 w-4" /> Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── PARTNERS ── */}
            {activeTab === 'partners' && (
              <div className="bg-white rounded-lg shadow-sm border border-border p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl">Partner Management</h2>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input type="text" className="pl-10 pr-4 py-2 bg-input-background rounded-lg border border-border text-sm" placeholder="Search partners..." value={partnerSearch} onChange={e => setPartnerSearch(e.target.value)} />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        {['Partner Name', 'Business Name', 'Email', 'Phone', 'Status', 'Actions'].map(h => (
                          <th key={h} className="text-left py-3 px-4 text-sm font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPartners.length === 0 ? (
                        <tr><td colSpan={6} className="py-12 text-center text-muted-foreground text-sm">
                          {partners.length === 0
                            ? 'No approved partners yet. Approve registrations from the New Approvals tab.'
                            : 'No partners match your search.'}
                        </td></tr>
                      ) : filteredPartners.map(partner => (
                        <tr key={partner.id} className="border-b border-border hover:bg-muted/20">
                          <td className="py-3 px-4 font-medium text-sm">{partner.name}</td>
                          <td className="py-3 px-4 text-sm">{partner.businessName}</td>
                          <td className="py-3 px-4 text-sm">{partner.email}</td>
                          <td className="py-3 px-4 text-sm">{partner.phone}</td>
                          <td className="py-3 px-4">
                            <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">Approved</span>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-1">
                              <button onClick={() => setViewingPartner(partner)} className="p-1.5 hover:bg-muted rounded-lg" title="View"><Eye className="h-4 w-4" /></button>
                              <button onClick={() => setEditingPartner(partner)} className="p-1.5 hover:bg-muted rounded-lg" title="Edit"><Edit className="h-4 w-4" /></button>
                              <button onClick={() => setDeletingPartner(partner)} className="p-1.5 hover:bg-red-100 text-red-600 rounded-lg" title="Delete"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">Partner deletion is restricted to Super Admin only and permanently removes all associated properties and data.</p>
                </div>
              </div>
            )}

            {/* ── PROPERTIES ── */}
            {activeTab === 'properties' && (
              <div className="bg-white rounded-lg shadow-sm border border-border p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl">Property Management</h2>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input type="text" className="pl-10 pr-4 py-2 bg-input-background rounded-lg border border-border text-sm" placeholder="Search properties..." value={propertySearch} onChange={e => setPropertySearch(e.target.value)} />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        {['Property', 'Partner', 'Location', 'Rooms', 'Type', 'Status', 'Actions'].map(h => (
                          <th key={h} className="text-left py-3 px-4 text-sm font-medium">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProperties.length === 0 ? (
                        <tr><td colSpan={7} className="py-12 text-center text-muted-foreground text-sm">
                          {properties.length === 0 ? 'No properties yet. Properties are created when partners are approved.' : 'No properties match your search.'}
                        </td></tr>
                      ) : filteredProperties.map(prop => (
                        <tr key={prop.id} className="border-b border-border hover:bg-muted/20">
                          <td className="py-3 px-4">
                            <p className="font-medium text-sm">{prop.name}</p>
                            <p className="text-xs text-muted-foreground">₹{prop.pricePerNight.toLocaleString()}/night</p>
                          </td>
                          <td className="py-3 px-4 text-sm">{prop.partnerName}</td>
                          <td className="py-3 px-4 text-sm">{prop.location}</td>
                          <td className="py-3 px-4 text-sm">{prop.rooms}</td>
                          <td className="py-3 px-4">
                            {(() => {
                              const pending = pendingTypes[prop.id] ?? prop.type;
                              const msg = typeSaveMsg[prop.id] ?? '';
                              const isDirty = pending !== prop.type;
                              return (
                                <div className="flex flex-col gap-1.5 min-w-[130px]">
                                  <select
                                    value={pending}
                                    onChange={e => setPendingTypes(prev => ({ ...prev, [prop.id]: e.target.value }))}
                                    className={`px-2 py-1 rounded-full text-xs border-0 cursor-pointer w-full ${pending === 'Bonoriya Own' ? 'bg-primary text-primary-foreground' : 'bg-green-100 text-green-700'}`}
                                  >
                                    <option value="Associated">Associated</option>
                                    <option value="Bonoriya Own">Bonoriya Own</option>
                                  </select>
                                  {isDirty && (
                                    <button
                                      onClick={async () => {
                                        const ok = updatePartnerProperty(prop.id, { type: pending as any });
                                        if (ok) {
                                          setProperties(getAllPartnerProperties());
                                          setPendingTypes(prev => { const n = { ...prev }; delete n[prop.id]; return n; });
                                          setTypeSaveMsg(prev => ({ ...prev, [prop.id]: 'saved' }));
                                          setTimeout(() => setTypeSaveMsg(prev => ({ ...prev, [prop.id]: '' })), 2500);
                                        } else {
                                          setTypeSaveMsg(prev => ({ ...prev, [prop.id]: 'error' }));
                                          setTimeout(() => setTypeSaveMsg(prev => ({ ...prev, [prop.id]: '' })), 2500);
                                        }
                                      }}
                                      className="w-full px-2 py-1 bg-primary text-primary-foreground rounded text-xs hover:opacity-90"
                                    >
                                      Save
                                    </button>
                                  )}
                                  {msg === 'saved' && <p className="text-xs text-green-600 text-center">✓ Saved Successfully</p>}
                                  {msg === 'error'  && <p className="text-xs text-red-500 text-center">✗ Not Saved</p>}
                                </div>
                              );
                            })()}
                          </td>
                          <td className="py-3 px-4">
                            <select value={prop.active ? 'true' : 'false'} onChange={e => { updatePartnerProperty(prop.id, { active: e.target.value === 'true' }); setProperties(getAllPartnerProperties()); }}
                              className={`px-2 py-1 rounded-full text-xs border-0 cursor-pointer ${prop.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              <option value="true">Active</option>
                              <option value="false">Inactive</option>
                            </select>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-1">
                              <button onClick={() => setEditingProperty(prop)} className="p-1.5 hover:bg-blue-100 text-blue-600 rounded-lg" title="Edit Property"><Edit className="h-4 w-4" /></button>
                              <button onClick={() => handleDeleteProperty(prop.id)} className="p-1.5 hover:bg-red-100 text-red-600 rounded-lg" title="Delete Property"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── INVOICES ── */}
            {activeTab === 'invoices' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-border p-6">
                  <h2 className="text-xl mb-6">Upload Partner Invoice</h2>
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div><label className="block mb-2 text-sm">Select Partner</label>
                      <select className="w-full px-4 py-2 bg-input-background rounded-lg border border-border">
                        <option value="">Choose partner...</option>
                        {partners.map(p => <option key={p.id} value={p.id}>{p.name} — {p.businessName}</option>)}
                      </select></div>
                    <div><label className="block mb-2 text-sm">Invoice Month</label>
                      <input type="month" className="w-full px-4 py-2 bg-input-background rounded-lg border border-border" /></div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    {[['Total Bookings', 'Number of bookings'], ['Commission Amount (₹)', 'Commission (10%)'], ['GST Amount (₹)', 'GST (18%)']].map(([lbl, ph]) => (
                      <div key={lbl}><label className="block mb-2 text-sm">{lbl}</label>
                        <input type="number" className="w-full px-4 py-2 bg-input-background rounded-lg border border-border" placeholder={ph} /></div>
                    ))}
                  </div>
                  <div className="mb-4">
                    <label className="block mb-2 text-sm">Upload Invoice PDF</label>
                    <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-muted/20 cursor-pointer">
                      <Upload className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Click to upload or drag and drop</p>
                      <p className="text-xs text-muted-foreground mt-1">PDF files only (max 10MB)</p>
                      <input type="file" className="hidden" accept="application/pdf" />
                    </div>
                  </div>
                  <button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90">Upload Invoice</button>
                </div>
              </div>
            )}

            {/* ── DAY TRIP PROPERTIES ── */}
            {activeTab === 'bonoriya-property' && (
              <div className="space-y-6">
                {dtpSaveMsg && (
                  <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl bg-green-600 text-white text-sm font-medium">
                    <CheckCircle className="h-5 w-5" /> {dtpSaveMsg}
                  </div>
                )}

                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm border border-border p-6">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h2 className="text-xl">Day Trip Properties</h2>
                      <p className="text-sm text-muted-foreground mt-1">Manage all BONORIYA day trip and eco tourism properties</p>
                    </div>
                    <button
                      onClick={() => setDtpFormTarget(null)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 text-sm"
                    >
                      <Plus className="h-4 w-4" /> Add New Property
                    </button>
                  </div>
                </div>

                {/* Property list */}
                {dtpLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : dayTripProps.length === 0 ? (
                  <div className="bg-white rounded-lg shadow-sm border border-border p-12 text-center">
                    <MapPin className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-muted-foreground mb-4">No day trip properties yet. Add your first property.</p>
                    <button onClick={() => setDtpFormTarget(null)} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm">+ Add Property</button>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-5">
                    {dayTripProps.map(prop => (
                      <div key={prop.id} className={`bg-white rounded-xl shadow-sm border ${prop.active ? 'border-border' : 'border-dashed border-gray-300 opacity-60'} overflow-hidden`}>
                        {prop.heroImage && (
                          <div className="h-40 overflow-hidden">
                            <img src={prop.heroImage} alt={prop.name} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="p-5">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold">{prop.name}</h3>
                              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1"><MapPin className="h-3 w-3" />{prop.location}</p>
                            </div>
                            <div className="flex flex-col items-end gap-1.5">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${prop.propertyType === 'bonoriya_own' ? 'bg-primary text-primary-foreground' : 'bg-green-100 text-green-800'}`}>
                                {prop.propertyType === 'bonoriya_own' ? 'BONORIYA Own' : 'Associated'}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs ${prop.active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                {prop.active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </div>
                          {prop.shortDescription && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{prop.shortDescription}</p>}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                            <span>{prop.priceRange}/person</span>
                            <span>·</span>
                            <span>Max {prop.maxCapacityPerDay} guests/day</span>
                            <span>·</span>
                            <span>★ {prop.rating}</span>
                          </div>
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => setDtpFormTarget(prop)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs hover:opacity-90"
                            >
                              <Edit className="h-3.5 w-3.5" /> Edit
                            </button>
                            <button
                              onClick={() => setOpenCalendarId(openCalendarId === prop.id ? null : prop.id)}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-colors ${openCalendarId === prop.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-muted'}`}
                            >
                              <Calendar className="h-3.5 w-3.5" />
                              {openCalendarId === prop.id ? 'Hide Calendar' : 'Availability'}
                            </button>
                            <button
                              onClick={async () => {
                                await updateDayTripProperty(prop.id, { active: !prop.active });
                                const updated = await getDayTripProperties();
                                setDayTripProps(updated);
                              }}
                              className="px-3 py-1.5 border border-border rounded-lg text-xs hover:bg-muted"
                            >
                              {prop.active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={async () => {
                                if (!confirm(`Delete "${prop.name}"? This cannot be undone.`)) return;
                                await deleteDayTripProperty(prop.id);
                                setDayTripProps(prev => prev.filter(p => p.id !== prop.id));
                              }}
                              className="p-1.5 hover:bg-red-100 text-red-600 rounded-lg"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Per-property Availability Calendar — expands inline */}
                          {openCalendarId === prop.id && (
                            <div className="mt-4 border-t border-border pt-4">
                              <DayTripCalendar
                                propertyId={prop.id}
                                propertyName={prop.name}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}


                {/* DTP Form Modal */}
                {dtpFormTarget !== undefined && (
                  <DTPFormModal
                    property={dtpFormTarget}
                    onSaved={updated => {
                      setDayTripProps(updated);
                      setDtpSaveMsg(dtpFormTarget ? 'Property updated!' : 'Property added!');
                      setTimeout(() => setDtpSaveMsg(''), 3000);
                    }}
                    onClose={() => setDtpFormTarget(undefined)}
                  />
                )}
              </div>
            )}

            {/* ── DAY TRIPS ── */}
            {activeTab === 'day-trips' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-border p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                    <h2 className="text-xl">
                      Day Trip Bookings
                      {selectedTripPropName && <span className="ml-2 text-base font-normal text-muted-foreground">— {selectedTripPropName}</span>}
                    </h2>
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-muted-foreground whitespace-nowrap hidden sm:block">Property:</label>
                      <select
                        className="px-3 py-2 bg-input-background rounded-lg border border-border text-sm min-w-[190px] focus:outline-none focus:ring-2 focus:ring-ring"
                        value={selectedTripPropName}
                        onChange={e => setSelectedTripPropName(e.target.value)}
                      >
                        <option value="">All Properties</option>
                        {dayTripProps.map(p => (
                          <option key={p.id} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                      {selectedTripPropName && (
                        <button onClick={() => setSelectedTripPropName('')} className="p-2 text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted" title="Clear filter">
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <div><label className="block mb-2 text-sm">Filter by Date</label><input type="date" className="w-full px-4 py-2 bg-input-background rounded-lg border border-border" /></div>
                    <div><label className="block mb-2 text-sm">Status</label>
                      <select className="w-full px-4 py-2 bg-input-background rounded-lg border border-border">
                        <option value="">All Bookings</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="pending">Pending Payment</option>
                        <option value="cancelled">Cancelled</option>
                      </select></div>
                    <div><label className="block mb-2 text-sm">Search by Name</label><input type="text" className="w-full px-4 py-2 bg-input-background rounded-lg border border-border" placeholder="Search guest name..." /></div>
                  </div>
                  {(() => {
                    const CANCELLED_STATUSES = ['Cancelled','Cancelled by Admin','Rejected'];
                    const filteredDT = selectedTripPropName
                      ? liveDayTrips.filter(b => b.propertyName === selectedTripPropName)
                      : liveDayTrips;
                    const activeDT    = filteredDT.filter(b => !CANCELLED_STATUSES.includes(b.bookingStatus));
                    const cancelledDT = filteredDT.filter(b =>  CANCELLED_STATUSES.includes(b.bookingStatus));
                    return (
                  <>
                  {filteredDT.length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                      {selectedTripPropName
                        ? <><p className="text-muted-foreground font-medium">No bookings for <strong>{selectedTripPropName}</strong></p><button onClick={() => setSelectedTripPropName('')} className="mt-2 text-sm text-primary hover:underline">Show all properties</button></>
                        : <><p className="text-muted-foreground">No day trip bookings yet.</p><p className="text-sm text-muted-foreground mt-1">Bookings will appear here in real time once guests complete the booking form.</p></>
                      }
                    </div>
                  ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          {['Booking Ref', 'Property', 'Type', 'Guest', 'Trip Date', 'Persons', 'Total', 'Commission', 'GST', 'Net Payable', 'Status', 'Actions'].map(h => (
                            <th key={h} className="text-left py-3 px-4 text-sm font-medium whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDT.map(b => {
                          const isAssoc = b.propertyType === 'associated';
                          const commission = b.commissionAmount ?? 0;
                          const gst = b.gstOnCommission ?? 0;
                          const net = b.netPayable ?? b.totalAmount;
                          return (
                          <tr key={b.id} className="border-b border-border hover:bg-muted/20">
                            <td className="py-3 px-4 font-medium text-sm">{b.bookingRef}</td>
                            <td className="py-3 px-4 text-xs text-muted-foreground max-w-[100px]"><span className="line-clamp-2">{b.propertyName || '—'}</span></td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${isAssoc ? 'bg-green-100 text-green-800' : 'bg-primary/10 text-primary'}`}>
                                {isAssoc ? 'Associated' : 'BONORIYA Own'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-sm">
                              <p>{b.guestName}</p>
                              <p className="text-xs text-muted-foreground">{b.guestPhone}</p>
                            </td>
                            <td className="py-3 px-4 text-sm">{b.tripDate || b.checkIn || '—'}</td>
                            <td className="py-3 px-4 text-sm text-center">{b.adults + b.children}</td>
                            <td className="py-3 px-4">
                              <p className="font-medium text-sm">₹{b.totalAmount.toLocaleString()}</p>
                              <p className="text-xs text-muted-foreground">Adv: ₹{b.advanceAmount.toLocaleString()}</p>
                            </td>
                            <td className="py-3 px-4 text-sm text-orange-600">{commission > 0 ? `₹${commission.toLocaleString()}` : '—'}</td>
                            <td className="py-3 px-4 text-sm text-orange-600">{gst > 0 ? `₹${gst.toLocaleString()}` : '—'}</td>
                            <td className="py-3 px-4 text-sm font-semibold text-green-700">₹{net.toLocaleString()}</td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                b.bookingStatus==='Confirmed'?'bg-green-100 text-green-700':
                                b.bookingStatus==='Cancelled'?'bg-orange-100 text-orange-700':
                                b.bookingStatus==='Rejected'?'bg-red-100 text-red-700':
                                'bg-yellow-100 text-yellow-700'}`}>
                                {b.bookingStatus}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex gap-1 flex-wrap">
                                <button onClick={() => setViewingTrip(b)} className="p-1.5 hover:bg-blue-100 text-blue-600 rounded-lg" title="View Details"><Eye className="h-4 w-4" /></button>
                                {b.bookingStatus!=='Confirmed' && b.bookingStatus!=='Cancelled' && b.bookingStatus!=='Rejected' && (
                                  <button onClick={()=>setActionTrip({booking:b,action:'Confirmed'})} className="p-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg" title="Accept"><CheckCircle className="h-4 w-4"/></button>
                                )}
                                {b.bookingStatus!=='Cancelled' && b.bookingStatus!=='Rejected' && (
                                  <button onClick={()=>setActionTrip({booking:b,action:'Cancelled'})} className="p-1.5 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg" title="Cancel"><XCircle className="h-4 w-4"/></button>
                                )}
                                {b.bookingStatus!=='Rejected' && b.bookingStatus!=='Cancelled' && (
                                  <button onClick={()=>setActionTrip({booking:b,action:'Rejected'})} className="p-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg" title="Reject"><Trash2 className="h-4 w-4"/></button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ); })}
                      </tbody>
                    </table>
                  </div>
                  )}
                  {/* ── Summary metrics — Bookings + Revenue + Commission ── */}
                  <div className="grid md:grid-cols-4 gap-4 mt-6">
                    {([
                      ['Total Bookings',    String(activeDT.length),                                                       'bg-blue-50',   cancelledDT.length > 0 ? `${cancelledDT.length} cancelled` : 'Active'],
                      ['Total Revenue',     `₹${activeDT.reduce((s,b)=>s+b.totalAmount,0).toLocaleString()}`,              'bg-green-50',  'Confirmed only'],
                      ['Commission Earned', `₹${activeDT.filter(b=>b.propertyType==='associated').reduce((s,b)=>s+(b.commissionAmount??0)+(b.gstOnCommission??0),0).toLocaleString()}`, 'bg-amber-50', 'Associated props'],
                      ['Total Guests',      String(activeDT.reduce((s,b)=>s+b.adults+b.children,0)),                      'bg-orange-50', 'Confirmed only'],
                    ] as [string,string,string,string][]).map(([lbl,val,bg,note]) => (
                      <div key={lbl} className={`p-4 ${bg} rounded-lg`}>
                        <p className="text-sm text-muted-foreground mb-1">{lbl}</p>
                        <p className="text-2xl font-medium">{val}</p>
                        <p className="text-xs text-muted-foreground mt-1">{note}</p>
                      </div>
                    ))}
                  </div>
                  {cancelledDT.length > 0 && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                      <strong>Cancelled / Rejected ({cancelledDT.length}):</strong>&nbsp;
                      Revenue excluded: ₹{cancelledDT.reduce((s,b)=>s+b.totalAmount,0).toLocaleString()} · Guests excluded: {cancelledDT.reduce((s,b)=>s+b.adults+b.children,0)}
                    </div>
                  )}
                  {selectedTripPropName && (
                    <p className="mt-2 text-xs text-muted-foreground text-right">
                      Showing: <strong>{selectedTripPropName}</strong> · <button onClick={() => setSelectedTripPropName('')} className="text-primary hover:underline">Show all</button>
                    </p>
                  )}
                  </>
                    ); // end IIFE return
                  })(/* filteredDayTrips IIFE */)}
                </div>
              </div>
            )}

            {/* ── BLOGS ── */}
            {activeTab === 'blogs' && (
              <BlogEditor />
            )}

            {/* ── BOOKING REPORTS ── */}
            {activeTab === 'reports' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-border p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl">Booking Reports</h2>
                    <button onClick={() => downloadReportCSV(filteredBookings)} className="flex items-center gap-2 px-4 py-2 bg-forest-900 text-white rounded-lg hover:bg-forest-900/80 text-sm">
                      <Download className="h-4 w-4" /> Export CSV
                    </button>
                  </div>

                  {/* ── SELECT PROPERTY filter — placed above all other filters ── */}
                  {(() => {
                    // Build a deduplicated, sorted list of all property names:
                    // 1. From the partner_properties table (approved + active)
                    // 2. From any bookings that reference a property (covers historical data)
                    const fromProps   = properties.map(p => p.name).filter(Boolean);
                    const fromBookings = getAllBookings().map(b => b.propertyName).filter(Boolean);
                    const allNames    = [...new Set([...fromProps, ...fromBookings])].sort();

                    return (
                      <div className="mb-5 p-4 bg-primary/5 border border-primary/20 rounded-xl flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Building2 className="h-4 w-4 text-primary" />
                          <label className="text-sm font-semibold text-foreground whitespace-nowrap">Select Property</label>
                        </div>
                        <select
                          className="flex-1 px-3 py-2.5 bg-white rounded-lg border border-border text-sm focus:outline-none focus:ring-2 focus:ring-ring shadow-sm"
                          value={reportFilters.property}
                          onChange={e => setReportFilters(rf => ({ ...rf, property: e.target.value }))}
                        >
                          <option value="">All Properties</option>
                          {allNames.map(name => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                        {reportFilters.property && (
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-primary font-medium bg-primary/10 px-2.5 py-1 rounded-full">
                              Filtered: {reportFilters.property}
                            </span>
                            <button
                              onClick={() => setReportFilters(rf => ({ ...rf, property: '' }))}
                              className="text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-2.5 py-1 hover:bg-muted transition-colors"
                              title="Clear property filter"
                            >
                              ✕ Clear
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* ── Existing filters (unchanged) ── */}
                  <div className="grid md:grid-cols-3 gap-4 mb-4">
                    {[
                      { lbl: 'Booking ID', key: 'bookingId', type: 'text', ph: 'e.g. BKG-2026-001' },
                      { lbl: 'Payment Status', key: 'paymentStatus', type: 'select', opts: ['', 'Paid', 'Partial', 'Pending'] },
                      { lbl: 'Check-In From', key: 'checkIn', type: 'date' },
                      { lbl: 'Check-Out To', key: 'checkOut', type: 'date' },
                      { lbl: 'Booking Date From', key: 'dateFrom', type: 'date' },
                      { lbl: 'Booking Date To', key: 'dateTo', type: 'date' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="block mb-1 text-xs text-muted-foreground uppercase tracking-wide">{f.lbl}</label>
                        {f.type === 'select' ? (
                          <select className="w-full px-3 py-2 bg-input-background rounded-lg border border-border text-sm" value={(reportFilters as any)[f.key]} onChange={e => setReportFilters(rf => ({ ...rf, [f.key]: e.target.value }))}>
                            {f.opts!.map(o => <option key={o} value={o}>{o || 'All'}</option>)}
                          </select>
                        ) : (
                          <input type={f.type} className="w-full px-3 py-2 bg-input-background rounded-lg border border-border text-sm" placeholder={f.ph} value={(reportFilters as any)[f.key]} onChange={e => setReportFilters(rf => ({ ...rf, [f.key]: e.target.value }))} />
                        )}
                      </div>
                    ))}
                    <div className="flex items-end">
                      <button onClick={() => setReportFilters({ bookingId: '', property: '', partner: '', paymentStatus: '', checkIn: '', checkOut: '', dateFrom: '', dateTo: '' })} className="w-full px-3 py-2 border border-border rounded-lg hover:bg-muted text-sm">Clear All Filters</button>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-5 border border-blue-200 mb-6">
                    {/* Exclude cancelled/rejected bookings from revenue metrics */}
                    {(() => {
                      const activeB = filteredBookings.filter(b => b.bookingStatus !== 'Cancelled' && b.bookingStatus !== 'Rejected');
                      const cancelledB = filteredBookings.filter(b => b.bookingStatus === 'Cancelled' || b.bookingStatus === 'Rejected');
                      const activeRevenue = activeB.reduce((s,b)=>s+b.totalAmount,0);
                      // Commission on Booking applies ONLY to Associated properties
                      const assocB = activeB.filter(b => b.propertyType === 'associated' || (b.type === 'hotel' && (b as any).commissionCategory === 'associated'));
                      const commissionEarned = Math.round(assocB.reduce((s,b) => s + (b.commissionAmount ?? b.totalAmount * 0.10), 0) * 100) / 100;
                      return (
                    <div className="grid md:grid-cols-4 gap-4">
                      {[
                        ['Active Bookings', activeB.length + (cancelledB.length > 0 ? ` (${cancelledB.length} cancelled)` : ''), ''],
                        ['Total Revenue', `₹${activeRevenue.toLocaleString()}`, 'text-green-600'],
                        ['Commission on Booking', `₹${commissionEarned.toLocaleString()}`, 'text-blue-600'],
                        ['Total Guests', activeB.reduce((s,b)=>s+b.adults+b.children,0), 'text-purple-600'],
                      ].map(([lbl,val,cls]) => (
                        <div key={String(lbl)} className="bg-white rounded-lg p-4 text-center">
                          <p className="text-xs text-muted-foreground mb-1">{lbl}</p>
                          <p className={`text-2xl ${cls}`}>{val}</p>
                        </div>
                      ))}
                    </div>
                      );
                    })()}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          {['Booking ID','Guest','Contact','Guests','Property','Partner','Check-In','Check-Out','Booked On','Amount','Payment','Status'].map(h=>(
                            <th key={h} className="text-left py-2 px-3 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredBookings.length === 0 ? (
                          <tr><td colSpan={12} className="py-8 text-center text-muted-foreground text-sm">No bookings match the selected filters.</td></tr>
                        ) : filteredBookings.map(b => (
                          <tr key={b.id} className="border-b border-border hover:bg-muted/20">
                            <td className="py-2 px-3 text-xs font-medium text-blue-600">{b.bookingRef}</td>
                            <td className="py-2 px-3 text-sm"><p className="font-medium">{b.guestName}</p><p className="text-xs text-muted-foreground">{b.guestAddress || '—'}</p></td>
                            <td className="py-2 px-3 text-xs"><p>{b.guestPhone}</p><p className="text-muted-foreground">{b.guestEmail}</p></td>
                            <td className="py-2 px-3 text-sm text-center">{b.adults + b.children}</td>
                            <td className="py-2 px-3 text-xs"><p className="font-medium">{b.propertyName}</p><p className="text-muted-foreground">{b.roomType || b.mealOption || '—'}</p></td>
                            <td className="py-2 px-3 text-sm">{b.partnerEmail || '—'}</td>
                            <td className="py-2 px-3 text-xs whitespace-nowrap">{b.checkIn || b.tripDate || '—'}</td>
                            <td className="py-2 px-3 text-xs whitespace-nowrap">{b.checkOut || '—'}</td>
                            <td className="py-2 px-3 text-xs whitespace-nowrap">{b.bookingDate}</td>
                            <td className="py-2 px-3 text-sm font-medium">₹{b.totalAmount.toLocaleString()}</td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs ${b.paymentStatus==='Paid'?'bg-green-100 text-green-700':b.paymentStatus==='Partial'?'bg-yellow-100 text-yellow-700':'bg-red-100 text-red-700'}`}>{b.paymentStatus}</span>
                            </td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-xs ${b.bookingStatus==='Completed'?'bg-gray-100 text-gray-700':'bg-blue-100 text-blue-700'}`}>{b.bookingStatus}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── STAFF ── */}
            {activeTab === 'staff' && (
              <div className="bg-white rounded-lg shadow-sm border border-border p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl">Staff Management</h2>
                  <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90"><UserPlus className="h-4 w-4" /> Add Staff Login</button>
                </div>
                <div className="border-2 border-dashed border-border rounded-lg p-6">
                  <h3 className="mb-4">Create New Staff Login</h3>
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div><label className="block mb-2 text-sm">Staff Name</label><input type="text" className="w-full px-4 py-2 bg-input-background rounded-lg border border-border" placeholder="Enter staff name" /></div>
                      <div><label className="block mb-2 text-sm">Email</label><input type="email" className="w-full px-4 py-2 bg-input-background rounded-lg border border-border" placeholder="staff@bonoriya.com" /></div>
                    </div>
                    <div><label className="block mb-2 text-sm">Access Level</label>
                      <select className="w-full px-4 py-2 bg-input-background rounded-lg border border-border">
                        <option value="view">View Only</option>
                        <option value="limited">Limited Edit</option>
                      </select></div>
                    <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90">Create Staff Account</button>
                  </div>
                </div>
              </div>
            )}

            {/* ── SETTINGS ── */}
            {activeTab === 'settings' && (<>

              {/* Partner Agreement Preview */}
              <div className="bg-white rounded-lg shadow-sm border border-border p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl mb-1">Partner Agreement Document</h2>
                    <p className="text-sm text-muted-foreground">Preview the digital agreement PDF automatically sent to every new partner and to admin@bonoriya.com on registration.</p>
                  </div>
                  <button
                    onClick={() => setShowAgreementPreview(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-forest-900 text-white rounded-lg hover:bg-forest-900/80 text-sm font-medium flex-shrink-0 ml-4"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    View Sample Agreement
                  </button>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="font-semibold text-green-800">18 Clauses</p>
                    <p className="text-xs text-green-600 mt-0.5">Complete legal terms</p>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="font-semibold text-blue-800">Auto-Generated</p>
                    <p className="text-xs text-blue-600 mt-0.5">On partner registration</p>
                  </div>
                  <div className="p-3 bg-forest-900/10 border border-forest-900/20 rounded-lg">
                    <p className="font-semibold text-forest-900">Dual Delivery</p>
                    <p className="text-xs text-forest-900/70 mt-0.5">Partner + Admin email</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-border p-6">
                <h2 className="text-xl mb-6">System Settings</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="mb-4">Commission Settings</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div><label className="block mb-2 text-sm">Commission Rate (%)</label><input type="number" className="w-full px-4 py-2 bg-input-background rounded-lg border border-border" defaultValue="10" disabled /><p className="text-xs text-muted-foreground mt-1">Fixed at 10%</p></div>
                      <div><label className="block mb-2 text-sm">GST on Commission (%)</label><input type="number" className="w-full px-4 py-2 bg-input-background rounded-lg border border-border" defaultValue="18" disabled /><p className="text-xs text-muted-foreground mt-1">Fixed at 18%</p></div>
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-4">Payment Terms</h3>
                    <div className="p-4 bg-muted/30 rounded-lg text-sm space-y-1">
                      <p>• Payment Cycle: 30 Days (Monthly)</p>
                      <p>• Payment Due: Within 15 days from invoice</p>
                      <p>• Auto-block on non-payment: Enabled</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Email delivery */}
              <div className="bg-white rounded-lg shadow-sm border border-border p-6">
                <h2 className="text-xl mb-5">Email Delivery Configuration</h2>
                <EmailConfigPanel />
              </div>

              {/* WhatsApp Notifications */}
              <div className="bg-white rounded-lg shadow-sm border border-border p-6">
                <h2 className="text-xl mb-5">WhatsApp Notifications</h2>
                <WhatsAppConfigPanel />
              </div>

              {/* Analytics & Tracking */}
              <div className="bg-white rounded-lg shadow-sm border border-border p-6">
                <h2 className="text-xl mb-5">Analytics & Tracking Scripts</h2>
                <AnalyticsConfigPanel />
              </div>

            </>)}

            {/* DISCOUNT COUPONS */}
            {activeTab === 'coupons' && <CouponAdmin />}

            {/* SEO DASHBOARD */}
            {activeTab === 'seo' && (
              <SEODashboard />
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
