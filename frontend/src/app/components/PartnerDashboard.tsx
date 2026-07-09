import { useState, useEffect, useCallback } from 'react';
import {
  Home, Calendar, DollarSign, Image, Settings, Bell,
  MessageSquare, Star, Users, TrendingUp, Eye, Edit,
  Plus, CheckCircle, XCircle, Clock, MapPin, Bed, Building2,
  Save, Trash2, ChevronLeft, ChevronRight, Upload, AlertCircle, X
} from 'lucide-react';
import { RoomsTab } from './RoomsTab';
import PartnerInventory from './PartnerInventory';
import {
  loadPartnerPropertyData, savePartnerPropertyData, getDefaultPartnerPropertyData,
  getBookingsByPartnerId, updateBookingStatus, saveBooking,
  deleteRoomFromSupabase, deletePropertyPhotoFromSupabase, mapDbBooking,
  type PartnerPropertyData, type PartnerRoomData, type PartnerImageData, type BookingEntry, type RoomPhoto
} from '../utils/auth';

interface PartnerDashboardProps {
  partnerId: string;
  partnerName?: string;
  partnerEmail?: string;
  businessName?: string;
}

// ─── Toast notification ───────────────────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl text-white text-sm font-medium animate-fade-in ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {type === 'success' ? <CheckCircle className="h-5 w-5 flex-shrink-0" /> : <AlertCircle className="h-5 w-5 flex-shrink-0" />}
      {message}
      <button onClick={onClose} className="ml-2 hover:opacity-70"><X className="h-4 w-4" /></button>
    </div>
  );
}

// ─── GST helper ───────────────────────────────────────────────────────────────

function calcGst(base: number): number {
  if (base <= 1000) return 0;
  if (base <= 7500) return 5;
  return 18;
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function PartnerDashboard({
  partnerId, partnerName = 'Partner', partnerEmail = '', businessName = 'Your Property'
}: PartnerDashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  // No-show confirmation modal
  const [noShowModal, setNoShowModal] = useState<{ bookingId: string; guestName: string; checkIn: string } | null>(null);

  // ── Property data — loaded DIRECTLY from Supabase (not localStorage) ─────────
  const [propData, setPropData] = useState<PartnerPropertyData>(
    () => getDefaultPartnerPropertyData(partnerId, businessName)   // start with defaults
  );
  const [dataLoading, setDataLoading] = useState(true);

  // Load from Supabase on mount — ensures all devices see the same live data
  useEffect(() => {
    let cancelled = false;
    async function loadFromSupabase() {
      setDataLoading(true);
      try {
        const { supabase } = await import('../utils/db');
        const { data, error } = await supabase
          .from('partner_property_data')
          .select('*')
          .eq('partner_id', partnerId)
          .single();
        if (cancelled || error || !data) {
          // Fall back to localStorage if Supabase has no data yet
          const local = loadPartnerPropertyData(partnerId);
          if (local && !cancelled) setPropData(local);
          return;
        }
        const mapped: PartnerPropertyData = {
          partnerId: data.partner_id,
          propertyName: data.property_name ?? businessName,
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
        if (!cancelled) {
          setPropData(mapped);
          // Also update localStorage cache
          localStorage.setItem(`bonoriya_partner_data_${partnerId}`, JSON.stringify(mapped));
        }
      } catch (e) {
        console.warn('[PartnerDashboard] Supabase load failed, using localStorage:', e);
        const local = loadPartnerPropertyData(partnerId);
        if (local && !cancelled) setPropData(local);
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    }
    loadFromSupabase();

    // Real-time subscription — update UI when data changes on another device
    let channel: any;
    import('../utils/db').then(({ supabase }) => {
      channel = supabase
        .channel(`partner_data_${partnerId}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'partner_property_data',
          filter: `partner_id=eq.${partnerId}`
        }, () => { loadFromSupabase(); })
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) import('../utils/db').then(({ supabase }) => supabase.removeChannel(channel));
    };
  }, [partnerId]);

  // ── Bookings — loaded from Supabase ──────────────────────────────────────────
  const [bookings, setBookings] = useState<BookingEntry[]>([]);

  // ── Bookings: load from Supabase with correct mapping + real-time subscription ──
  const loadBookingsFromSupabase = useCallback(async () => {
    try {
      const { supabase } = await import('../utils/db');
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('partner_id', partnerId)
        .in('booking_status', ['Confirmed', 'Cancelled', 'No Show'])
        .order('created_at', { ascending: false });
      if (error) throw error;
      if (data) setBookings(data.map(mapDbBooking));
    } catch {
      // Fallback: localStorage cache, filter to relevant statuses
      setBookings(
        getBookingsByPartnerId(partnerId).filter(b =>
          b.bookingStatus === 'Confirmed' || b.bookingStatus === 'Cancelled' || b.bookingStatus === 'No Show'
        )
      );
    }
  }, [partnerId]);

  useEffect(() => {
    loadBookingsFromSupabase();

    // Real-time subscription — any INSERT/UPDATE on bookings for this partner
    let channel: any;
    import('../utils/db').then(({ supabase }) => {
      channel = supabase
        .channel(`partner_bookings_${partnerId}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'bookings',
          filter: `partner_id=eq.${partnerId}`,
        }, () => { loadBookingsFromSupabase(); })
        .subscribe();
    });

    return () => {
      if (channel) import('../utils/db').then(({ supabase }) => supabase.removeChannel(channel));
    };
  }, [partnerId, loadBookingsFromSupabase]);

  const refreshBookings = loadBookingsFromSupabase;

  // ── Address tab state ────────────────────────────────────────────────────────
  const [addressMode, setAddressMode] = useState<'manual' | 'map'>('manual');

  // ── Calendar state ───────────────────────────────────────────────────────────
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [bulkUpdateMode, setBulkUpdateMode] = useState(false);

  // ── Editing room ─────────────────────────────────────────────────────────────
  const [editingRoom, setEditingRoom] = useState<number | null>(null);
  const [roomEditForm, setRoomEditForm] = useState<PartnerRoomData | null>(null);

  // ── Computed stats from real bookings ────────────────────────────────────────
  const confirmedBookings = bookings.filter(b => b.bookingStatus === 'Confirmed');
  const totalRevenue = confirmedBookings.reduce((s, b) => s + b.totalAmount, 0);
  const avgRating = bookings.length === 0 ? null : null; // no reviews yet

  const showToast = (message: string, type: 'success' | 'error' = 'success') => setToast({ message, type });

  // ── Save property data ───────────────────────────────────────────────────────
  const handleSaveProperty = () => {
    savePartnerPropertyData(propData);
    showToast('SAVED SUCCESSFULLY!');
  };

  // ── Update propData field ────────────────────────────────────────────────────
  const upd = (updates: Partial<PartnerPropertyData>) => setPropData(d => ({ ...d, ...updates }));

  // ── Toggle amenity ───────────────────────────────────────────────────────────
  const toggleAmenity = (a: string) => {
    const list = propData.amenities.includes(a)
      ? propData.amenities.filter(x => x !== a)
      : [...propData.amenities, a];
    upd({ amenities: list });
  };

  // ── Room management ──────────────────────────────────────────────────────────
  const startEditRoom = (room: PartnerRoomData) => { setEditingRoom(room.id); setRoomEditForm({ ...room }); };
  const cancelEditRoom = () => { setEditingRoom(null); setRoomEditForm(null); };
  const saveRoom = () => {
    if (!roomEditForm) return;
    const updated = propData.rooms.map(r => r.id === roomEditForm.id ? roomEditForm : r);
    upd({ rooms: updated });
    savePartnerPropertyData({ ...propData, rooms: updated });
    setEditingRoom(null);
    setRoomEditForm(null);
    showToast('SAVED SUCCESSFULLY!');
  };
  const addRoom = () => {
    const newRoom: PartnerRoomData = { id: Date.now(), type: 'New Room Type', basePrice: 1500, available: 1, baseOccupancy: 2, maxOccupancy: 2, description: '', photos: [] };
    const updated = [...propData.rooms, newRoom];
    upd({ rooms: updated });
    setEditingRoom(newRoom.id);
    setRoomEditForm(newRoom);
  };
  const deleteRoom = (id: number) => {
    upd({ rooms: propData.rooms.filter(r => r.id !== id) });
    // Delete from Supabase: cascades to room_photos + room_inventory
    deleteRoomFromSupabase(id);
    showToast('Room deleted.');
  };

  // ── Image management ─────────────────────────────────────────────────────────
  const setMainImage = (imgId: string) => {
    const updated = propData.images.map(img => ({ ...img, isMainImage: img.id === imgId }));
    const next = { ...propData, images: updated };
    setPropData(next);
    savePartnerPropertyData(next);   // persist immediately so listing syncs
    showToast('SAVED SUCCESSFULLY! Main image updated.');
  };
  const deleteImage = (imgId: string) => {
    const img = propData.images.find(i => i.id === imgId);
    upd({ images: propData.images.filter(i => i.id !== imgId) });
    // Delete from Supabase DB + Storage
    if (img) deletePropertyPhotoFromSupabase(imgId, img.url);
  };
  const handleImageUpload = async (category: string, file: File) => {
    // Validate before upload
    const MAX = 5 * 1024 * 1024;
    if (file.size > MAX) { showToast('Image must be under 5 MB.', 'error'); return; }
    const allowed = ['image/jpeg','image/jpg','image/png','image/webp'];
    if (!allowed.includes(file.type)) { showToast('Use JPG, JPEG, PNG or WEBP.', 'error'); return; }

    showToast('Uploading photo…');
    try {
      // Upload directly to Supabase Storage — NOT base64
      const { supabase } = await import('../utils/db');
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${partnerId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('property-photos').upload(path, file, { upsert: true });
      if (error) { showToast('Upload failed: ' + error.message, 'error'); return; }
      const url = supabase.storage.from('property-photos').getPublicUrl(path).data.publicUrl;

      const newImg: PartnerImageData = {
        id: Date.now().toString(), url, category,
        isMainImage: propData.images.length === 0,
        fileName: file.name
      };
      const updatedImages = [...propData.images, newImg];
      upd({ images: updatedImages });
      showToast('Photo uploaded! Click Save All Photos to confirm.');
    } catch (e) {
      console.error('[handleImageUpload]', e);
      showToast('Upload failed — check your connection.', 'error');
    }
  };

  // ── Booking actions ──────────────────────────────────────────────────────────

  // A guest is a no-show if: today >= day after check-in AND status is still Confirmed
  const canMarkNoShow = (checkIn: string, status: string) => {
    if (status !== 'Confirmed') return false;
    if (!checkIn) return false;
    const dayAfterCheckIn = new Date(checkIn);
    dayAfterCheckIn.setDate(dayAfterCheckIn.getDate() + 1);
    dayAfterCheckIn.setHours(0, 0, 0, 0);
    return new Date() >= dayAfterCheckIn;
  };

  const confirmNoShow = async () => {
    if (!noShowModal) return;
    updateBookingStatus(noShowModal.bookingId, 'No Show');
    setNoShowModal(null);
    showToast('Marked as "Guests Didn\'t Show Up". No commission or GST will be charged.');
    await loadBookingsFromSupabase();
  };

  const AMENITY_LIST = ['WiFi', 'Parking', 'Restaurant', 'Room Service', 'AC', 'TV', 'Hot Water', 'Laundry', 'Power Backup', 'Swimming Pool', 'Bonfire', 'Garden', 'Terrace', 'Breakfast Included'];
  const STATES = ['Assam', 'Meghalaya', 'Arunachal Pradesh', 'Nagaland', 'Manipur', 'Mizoram', 'Tripura', 'Sikkim'];

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'property', label: 'Property Details', icon: Building2 },
    { id: 'rooms', label: 'Rooms & Rates', icon: Bed },
    { id: 'bookings', label: 'Bookings', icon: Calendar },
    { id: 'calendar', label: 'Availability', icon: Clock },
    { id: 'photos', label: 'Photos', icon: Image },
    { id: 'reviews', label: 'Reviews', icon: Star },
    { id: 'invoices', label: 'Invoices', icon: DollarSign },
    { id: 'policies', label: 'Policies', icon: Settings },
  ];

  // Show loading spinner while fetching from Supabase
  if (dataLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground text-sm">Loading your property data from server…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* No-Show confirmation modal */}
      {noShowModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setNoShowModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-start gap-4 mb-5">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                <XCircle className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Guests Didn't Show Up?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  You are marking <strong>{noShowModal.guestName}</strong>'s booking (check-in: {noShowModal.checkIn}) as a no-show.
                </p>
              </div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-5 text-sm space-y-1.5">
              <p className="font-medium text-orange-900">What happens when you confirm:</p>
              <p className="text-orange-800">• Booking status → <strong>Guests Didn't Show Up</strong></p>
              <p className="text-orange-800">• <strong>No commission</strong> will be charged to you</p>
              <p className="text-orange-800">• <strong>No GST</strong> will be applied</p>
              <p className="text-orange-800">• Room inventory will be restored for those dates</p>
              <p className="text-orange-800">• Guest will be notified by email</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setNoShowModal(null)} className="flex-1 py-2.5 border border-border rounded-xl hover:bg-muted text-sm">
                Cancel
              </button>
              <button onClick={confirmNoShow} className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-medium">
                Yes, Mark as No Show
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="bg-white border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl">Partner Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {partnerName}!</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="relative p-2 hover:bg-muted rounded-lg">
              <Bell className="h-5 w-5" />
              {bookings.filter(b => b.bookingStatus === 'Pending').length > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
              )}
            </button>
            <button className="p-2 hover:bg-muted rounded-lg"><MessageSquare className="h-5 w-5" /></button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid lg:grid-cols-4 gap-6">

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-border p-4">
              <nav className="space-y-1">
                {navItems.map(item => (
                  <button key={item.id} onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${activeTab === item.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm">{item.label}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">

            {/* ── DASHBOARD ── */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {/* Stats — live from bookings */}
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Bookings', value: bookings.length === 0 ? '0' : String(bookings.length), icon: Calendar, color: 'bg-blue-500' },
                    { label: 'Active Listings', value: propData.rooms.length === 0 ? '0' : String(propData.rooms.length), icon: Home, color: 'bg-green-500' },
                    { label: 'Revenue (Month)', value: totalRevenue === 0 ? '₹0' : `₹${totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'bg-purple-500' },
                    { label: 'Avg Rating', value: avgRating ?? '—', icon: Star, color: 'bg-yellow-500' },
                  ].map((s, i) => (
                    <div key={i} className="bg-white rounded-lg shadow-sm border border-border p-6">
                      <div className={`${s.color} p-3 rounded-lg w-fit mb-3`}><s.icon className="h-6 w-6 text-white" /></div>
                      <p className="text-2xl mb-1">{s.value}</p>
                      <p className="text-sm text-muted-foreground">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Recent bookings */}
                <div className="bg-white rounded-lg shadow-sm border border-border p-6">
                  <h2 className="text-xl mb-4">Recent Bookings</h2>
                  {bookings.length === 0 ? (
                    <div className="text-center py-10">
                      <Calendar className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                      <p className="text-muted-foreground">No bookings yet.</p>
                      <p className="text-sm text-muted-foreground mt-1">New bookings will appear here once guests start booking your property.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead><tr className="border-b border-border">
                          {['Booking ID', 'Guest', 'Check-in', 'Check-out', 'Status'].map(h => <th key={h} className="text-left py-3 px-4 text-sm">{h}</th>)}
                        </tr></thead>
                        <tbody>
                          {bookings.slice(0, 5).map(b => (
                            <tr key={b.id} className="border-b border-border hover:bg-muted/20">
                              <td className="py-3 px-4 text-sm font-medium">{b.bookingRef}</td>
                              <td className="py-3 px-4 text-sm">{b.guestName}</td>
                              <td className="py-3 px-4 text-sm">{b.checkIn || b.tripDate || '—'}</td>
                              <td className="py-3 px-4 text-sm">{b.checkOut || '—'}</td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded-full text-xs ${b.bookingStatus === 'Confirmed' ? 'bg-green-100 text-green-700' : b.bookingStatus === 'No Show' ? 'bg-gray-100 text-gray-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                  {b.bookingStatus}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Setup prompt for new partners */}
                {propData.rooms.length === 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <h3 className="mb-2 text-blue-800">Complete your property setup</h3>
                    <p className="text-sm text-blue-700 mb-4">Your property listing is active but incomplete. Complete these steps to start receiving bookings:</p>
                    <div className="space-y-2">
                      {[
                        { label: 'Add Property Details', done: !!propData.description, tab: 'property' },
                        { label: 'Add Room Types & Pricing', done: propData.rooms.length > 0, tab: 'rooms' },
                        { label: 'Upload Property Photos', done: propData.images.length > 0, tab: 'photos' },
                        { label: 'Set Policies', done: !!propData.checkInTime, tab: 'policies' },
                      ].map(step => (
                        <button key={step.label} onClick={() => setActiveTab(step.tab)}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left hover:bg-white transition-colors ${step.done ? 'border-green-200 bg-green-50' : 'border-border bg-white'}`}>
                          {step.done ? <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" /> : <div className="h-5 w-5 rounded-full border-2 border-border flex-shrink-0" />}
                          <span className={`text-sm ${step.done ? 'line-through text-muted-foreground' : ''}`}>{step.label}</span>
                          {!step.done && <span className="ml-auto text-xs text-primary">Set up →</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── PROPERTY DETAILS ── */}
            {activeTab === 'property' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm border border-border p-6">
                  <h2 className="text-xl mb-6">Property Information</h2>
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm mb-2">Property Name *</label>
                        <input type="text" className="w-full px-4 py-2 bg-input-background rounded-lg border border-border" value={propData.propertyName} onChange={e => upd({ propertyName: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-sm mb-2">Property Type *</label>
                        <select className="w-full px-4 py-2 bg-input-background rounded-lg border border-border" value={propData.propertyType} onChange={e => upd({ propertyType: e.target.value })}>
                          {['Hotel', 'Guest House', 'Homestay', 'Resort', 'Cottage', 'Eco Lodge', 'Villa'].map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm mb-2">Property Description *</label>
                      <textarea className="w-full px-4 py-2 bg-input-background rounded-lg border border-border" rows={5} placeholder="Describe your property — location highlights, unique features, guest experience..." value={propData.description} onChange={e => upd({ description: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm mb-3">Amenities</label>
                      <div className="grid md:grid-cols-3 gap-2">
                        {AMENITY_LIST.map(a => (
                          <label key={a} className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" className="rounded" checked={propData.amenities.includes(a)} onChange={() => toggleAmenity(a)} />
                            <span className="text-sm">{a}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <button onClick={handleSaveProperty} className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90">
                      <Save className="h-4 w-4" /> Save Changes
                    </button>
                  </div>
                </div>

                {/* Address Section */}
                <div className="bg-white rounded-lg shadow-sm border border-border p-6">
                  <h2 className="text-xl mb-4">Property Address & Location</h2>

                  {/* Mode Toggle */}
                  <div className="flex gap-2 mb-6 bg-muted/40 p-1 rounded-lg w-fit">
                    <button onClick={() => setAddressMode('manual')} className={`px-5 py-2 rounded-md text-sm transition-colors ${addressMode === 'manual' ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted/60'}`}>Manual Entry</button>
                    <button onClick={() => setAddressMode('map')} className={`px-5 py-2 rounded-md text-sm transition-colors ${addressMode === 'map' ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted/60'}`}>Google Maps Pin</button>
                  </div>

                  {addressMode === 'manual' ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm mb-2">Address Line 1 *</label>
                        <input type="text" className="w-full px-4 py-2 bg-input-background rounded-lg border border-border" placeholder="House/Building No., Street Name" value={propData.addressLine1} onChange={e => upd({ addressLine1: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-sm mb-2">Address Line 2</label>
                        <input type="text" className="w-full px-4 py-2 bg-input-background rounded-lg border border-border" placeholder="Area, Locality, Landmark (optional)" value={propData.addressLine2} onChange={e => upd({ addressLine2: e.target.value })} />
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm mb-2">City *</label>
                          <input type="text" className="w-full px-4 py-2 bg-input-background rounded-lg border border-border" placeholder="City" value={propData.city} onChange={e => upd({ city: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-sm mb-2">State *</label>
                          <select className="w-full px-4 py-2 bg-input-background rounded-lg border border-border" value={propData.state} onChange={e => upd({ state: e.target.value })}>
                            {STATES.map(s => <option key={s}>{s}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm mb-2">PIN Code / Postal Code *</label>
                          <input type="text" className="w-full px-4 py-2 bg-input-background rounded-lg border border-border" placeholder="6-digit PIN code" maxLength={6} value={propData.pinCode} onChange={e => upd({ pinCode: e.target.value.replace(/\D/g, '') })} />
                        </div>
                        <div>
                          <label className="block text-sm mb-2">Country</label>
                          <input type="text" className="w-full px-4 py-2 bg-input-background rounded-lg border border-border" value={propData.country} onChange={e => upd({ country: e.target.value })} />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Enter your property's GPS coordinates. Find them by right-clicking on{' '}
                        <a href="https://maps.google.com" target="_blank" rel="noreferrer" className="text-primary underline">
                          Google Maps
                        </a>{' '}
                        and selecting <strong>"What's here?"</strong>.
                      </p>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm mb-2">Latitude</label>
                          <input
                            type="number"
                            step="0.000001"
                            className="w-full px-4 py-2 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="e.g. 26.144500"
                            value={propData.lat || ''}
                            onChange={e => upd({ lat: parseFloat(e.target.value) || 26.1445 })}
                          />
                        </div>
                        <div>
                          <label className="block text-sm mb-2">Longitude</label>
                          <input
                            type="number"
                            step="0.000001"
                            className="w-full px-4 py-2 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                            placeholder="e.g. 91.736200"
                            value={propData.lng || ''}
                            onChange={e => upd({ lng: parseFloat(e.target.value) || 91.7362 })}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm mb-2">Map Address / Label <span className="text-muted-foreground font-normal">(shown to guests)</span></label>
                        <input
                          type="text"
                          className="w-full px-4 py-2 bg-input-background rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                          placeholder="e.g. Near Brahmaputra River, Guwahati, Assam 781001"
                          value={propData.mapAddress || ''}
                          onChange={e => {
                            upd({ mapAddress: e.target.value });
                            if (e.target.value && !propData.addressLine1) upd({ addressLine1: e.target.value });
                          }}
                        />
                      </div>

                      {propData.lat && propData.lng && propData.lat !== 26.1445 && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm text-green-800 font-medium">
                              {propData.mapAddress || 'Location pinned'}
                            </p>
                            <p className="text-xs text-green-600 mt-0.5">
                              {propData.lat.toFixed(6)}, {propData.lng.toFixed(6)}
                            </p>
                          </div>
                          <a
                            href={`https://www.google.com/maps?q=${propData.lat},${propData.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-shrink-0 flex items-center gap-1.5 text-xs text-primary hover:underline mt-0.5"
                          >
                            <MapPin className="h-3.5 w-3.5" />
                            Preview on Maps
                          </a>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-6">
                    <button onClick={handleSaveProperty} className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90">
                      <Save className="h-4 w-4" /> Save Address
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── ROOMS & RATES ── */}
            {activeTab === 'rooms' && (
              <RoomsTab
                propData={propData}
                partnerId={partnerId}
                editingRoom={editingRoom}
                roomEditForm={roomEditForm}
                onAddRoom={addRoom}
                onStartEdit={startEditRoom}
                onSaveRoom={saveRoom}
                onCancelEdit={cancelEditRoom}
                onDeleteRoom={deleteRoom}
                onRoomEditFormChange={setRoomEditForm}
                onUpdateRoomPhotos={async (roomId, photos) => {
                  const updated = propData.rooms.map(r =>
                    r.id === roomId ? { ...r, photos } : r
                  );
                  upd({ rooms: updated });
                  // Save with the correct updated data (not the stale propData closure)
                  savePartnerPropertyData({ ...propData, rooms: updated });

                  // Also explicitly upsert photos into room_photos Supabase table
                  // so they're queryable independently (for guest Book Stays page)
                  try {
                    const { supabase } = await import('../utils/db');
                    // Delete old photos for this room then re-insert (clean sync)
                    await supabase.from('room_photos').delete().eq('room_id', roomId);
                    if (photos.length > 0) {
                      const rows = photos.map((p, i) => ({
                        id: p.id,
                        room_id: roomId,
                        partner_id: partnerId,
                        url: p.url,
                        file_name: p.fileName,
                        is_primary: p.isPrimary,
                        label: p.label,
                        sort_order: i,
                      }));
                      await supabase.from('room_photos').upsert(rows, { onConflict: 'id' });
                    }
                  } catch (e) {
                    console.error('[syncRoomPhotos]', e);
                  }
                }}
                onSaved={() => {
                  // Do NOT call savePartnerPropertyData(propData) here —
                  // onUpdateRoomPhotos already saved with the correct data.
                  // Calling it again with old propData would overwrite and lose the photos.
                  showToast('ROOM PHOTOS SAVED SUCCESSFULLY!');
                }}
              />
            )}

            {/* ── BOOKINGS ── */}
            {activeTab === 'bookings' && (() => {
              const confirmedBks = bookings.filter(b => b.bookingStatus === 'Confirmed');
              const closedBks    = bookings.filter(b => b.bookingStatus === 'Cancelled' || b.bookingStatus === 'No Show');
              const noShowEligible = confirmedBks.filter(b => canMarkNoShow(b.checkIn || b.tripDate || '', b.bookingStatus));

              const BookingCard = ({ b }: { b: BookingEntry }) => (
                <div className={`border rounded-xl p-5 ${b.bookingStatus === 'Confirmed' ? 'border-green-200 bg-green-50/30' : b.bookingStatus === 'No Show' ? 'border-orange-200 bg-orange-50/30' : 'border-red-200 bg-red-50/20'}`}>
                  <div className="flex items-start justify-between mb-3 gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-base">{b.guestName}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Ref: {b.bookingRef}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                      b.bookingStatus === 'Confirmed' ? 'bg-green-100 text-green-800' :
                      b.bookingStatus === 'No Show'   ? 'bg-orange-100 text-orange-800' :
                                                        'bg-red-100 text-red-800'
                    }`}>
                      {b.bookingStatus === 'No Show' ? 'Guests Didn\'t Show Up' : b.bookingStatus}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Check-in</p>
                      <p className="font-medium">{b.checkIn || b.tripDate || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Check-out</p>
                      <p className="font-medium">{b.checkOut || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Guests</p>
                      <p className="font-medium">{b.adults} Adults{b.children > 0 ? ` · ${b.children} Children` : ''}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{b.bookingStatus === 'No Show' || b.bookingStatus === 'Cancelled' ? 'Amount (waived)' : 'Total Amount'}</p>
                      <p className={`font-semibold ${b.bookingStatus === 'No Show' || b.bookingStatus === 'Cancelled' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        ₹{b.totalAmount.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {b.roomType && (
                    <p className="text-xs text-muted-foreground mb-3">Room: <span className="font-medium text-foreground">{b.roomType}</span></p>
                  )}

                  <div className="flex flex-wrap gap-2 pt-3 border-t border-border/50 items-center">
                    {b.guestPhone && (
                      <a href={`tel:${b.guestPhone}`} className="px-3 py-1.5 border border-border rounded-lg hover:bg-muted text-xs flex items-center gap-1.5">
                        Contact Guest
                      </a>
                    )}
                    {b.guestEmail && (
                      <a href={`mailto:${b.guestEmail}`} className="px-3 py-1.5 border border-border rounded-lg hover:bg-muted text-xs flex items-center gap-1.5">
                        Email Guest
                      </a>
                    )}
                    {canMarkNoShow(b.checkIn || b.tripDate || '', b.bookingStatus) && (
                      <button
                        onClick={() => setNoShowModal({ bookingId: b.id, guestName: b.guestName, checkIn: b.checkIn || b.tripDate || '' })}
                        className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-xs font-medium flex items-center gap-1.5"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Guests Didn't Show Up
                      </button>
                    )}
                    {(b.bookingStatus === 'No Show') && (
                      <p className="text-xs text-orange-700 italic">No commission or GST charged.</p>
                    )}
                    {(b.bookingStatus === 'Cancelled') && (
                      <p className="text-xs text-muted-foreground italic">Booking cancelled by guest.</p>
                    )}
                  </div>
                </div>
              );

              return (
                <div className="space-y-6">
                  {/* Alert for eligible no-shows */}
                  {noShowEligible.length > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-orange-800">{noShowEligible.length} booking{noShowEligible.length > 1 ? 's' : ''} may have no-show guests</p>
                        <p className="text-xs text-orange-700 mt-0.5">Check-in date has passed. Mark as "Guests Didn't Show Up" if they haven't arrived. No commission will be charged.</p>
                      </div>
                    </div>
                  )}

                  {/* Confirmed bookings */}
                  <div className="bg-white rounded-xl shadow-sm border border-border p-6">
                    <div className="flex items-center justify-between mb-5">
                      <h2 className="text-xl flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        Confirmed Bookings
                        <span className="text-sm font-normal text-muted-foreground">({confirmedBks.length})</span>
                      </h2>
                      <button onClick={() => loadBookingsFromSupabase()} className="text-xs text-primary hover:underline flex items-center gap-1">
                        Refresh
                      </button>
                    </div>

                    {confirmedBks.length === 0 ? (
                      <div className="text-center py-10">
                        <Calendar className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                        <p className="text-muted-foreground text-sm">No confirmed bookings yet.</p>
                        <p className="text-xs text-muted-foreground mt-1">Bookings will appear here in real time once guests complete their booking.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {confirmedBks.map(b => <BookingCard key={b.id} b={b} />)}
                      </div>
                    )}
                  </div>

                  {/* Cancelled / No Show bookings */}
                  <div className="bg-white rounded-xl shadow-sm border border-border p-6">
                    <h2 className="text-xl flex items-center gap-2 mb-5">
                      <XCircle className="h-5 w-5 text-red-500" />
                      Cancelled &amp; No Show
                      <span className="text-sm font-normal text-muted-foreground">({closedBks.length})</span>
                    </h2>

                    {closedBks.length === 0 ? (
                      <p className="text-center text-muted-foreground text-sm py-6">No cancelled bookings.</p>
                    ) : (
                      <div className="space-y-4">
                        {closedBks.map(b => <BookingCard key={b.id} b={b} />)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* ── AVAILABILITY CALENDAR ── */}
            {activeTab === 'calendar' && (
              <div className="space-y-4">
                <h2 className="text-xl">Inventory & Availability</h2>
                <PartnerInventory
                  partnerId={partnerId}
                  rooms={propData.rooms}
                  onSaved={() => showToast('SAVED SUCCESSFULLY!')}
                />
              </div>
            )}

            {/* ── PHOTOS ── */}
            {activeTab === 'photos' && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="mb-1 flex items-center gap-2 text-blue-800"><CheckCircle className="h-5 w-5" /> Main Display Photo</h3>
                  <p className="text-sm text-muted-foreground">Select one photo as your main image. It will appear on the homepage and search results.</p>
                </div>

                {propData.images.length > 0 && (
                  <div className="bg-white rounded-lg shadow-sm border border-border p-6">
                    <h2 className="text-xl mb-6">Uploaded Photos</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {propData.images.map(img => (
                        <div key={img.id} className={`relative border-2 rounded-lg overflow-hidden ${img.isMainImage ? 'border-primary shadow-lg' : 'border-border'}`}>
                          <img src={img.url} alt={img.category} className="w-full h-48 object-cover" />
                          {img.isMainImage && (
                            <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-0.5 rounded-full text-xs flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" /> Main
                            </div>
                          )}
                          <div className="p-3 bg-white">
                            <p className="text-sm font-medium mb-2">{img.category} — {img.fileName}</p>
                            <label className="flex items-center gap-2 mb-2 cursor-pointer hover:bg-muted/20 p-1 rounded">
                              <input type="checkbox" checked={img.isMainImage} onChange={() => setMainImage(img.id)} className="rounded cursor-pointer" />
                              <span className="text-sm">Set as Main Image</span>
                            </label>
                            <button onClick={() => deleteImage(img.id)} className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 text-sm">
                              <Trash2 className="h-4 w-4" /> Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-lg shadow-sm border border-border p-6">
                  <h2 className="text-xl mb-4">Upload Property Photos</h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {['Entrance', 'Lobby', 'Reception', 'Dining Area', 'Garden', 'Exterior'].map(area => (
                      <div key={area} className="space-y-2">
                        <label className="block text-sm font-medium">{area}</label>
                        <label className="block border-2 border-dashed border-border rounded-lg p-6 text-center hover:bg-muted/20 cursor-pointer">
                          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">Upload {area}</p>
                          <input type="file" className="hidden" accept="image/*" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(area, f); e.target.value = ''; }} />
                        </label>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-blue-800">Photo Guidelines</p>
                    <p>• High-quality JPG/PNG (min 1920×1080, max 5MB per file)</p>
                    <p>• Well-lit, clear photos showcase your property best</p>
                    <p>• Photos are reviewed before going live</p>
                  </div>
                  <button
                    onClick={async () => {
                      // Photos are already in Supabase Storage (uploaded in handleImageUpload).
                      // Save the image metadata (URLs, categories, main flag) to Supabase DB.
                      savePartnerPropertyData(propData);
                      // Also save each image entry to property_photos table for cross-device visibility
                      try {
                        const { supabase } = await import('../utils/db');
                        const propertyId = propData.partnerId;
                        // Upsert each image into property_photos table
                        const rows = propData.images.map(img => ({
                          id: img.id,
                          partner_id: propertyId,
                          url: img.url,
                          file_name: img.fileName,
                          category: img.category,
                          is_main_image: img.isMainImage,
                          sort_order: propData.images.indexOf(img),
                        }));
                        if (rows.length > 0) {
                          await supabase.from('property_photos').upsert(rows, { onConflict: 'id' });
                        }
                        // Sync main image to partner_properties listing
                        const mainImg = propData.images.find(i => i.isMainImage);
                        if (mainImg) {
                          await supabase.from('partner_properties')
                            .update({ image: mainImg.url })
                            .eq('partner_id', propertyId);
                        }
                      } catch (e) {
                        console.error('[SaveAllPhotos]', e);
                      }
                      showToast('PROPERTY PHOTOS SAVED SUCCESSFULLY!');
                    }}
                    className="mt-6 flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90"
                  >
                    <Save className="h-4 w-4" /> Save All Photos
                  </button>
                </div>
              </div>
            )}

            {/* ── REVIEWS ── */}
            {activeTab === 'reviews' && (
              <div className="bg-white rounded-lg shadow-sm border border-border p-6">
                <h2 className="text-xl mb-6">Guest Reviews</h2>
                <div className="text-center py-14">
                  <Star className="h-14 w-14 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg mb-2">No reviews yet</h3>
                  <p className="text-sm text-muted-foreground">Guest reviews will appear here after their stay.</p>
                </div>
              </div>
            )}

            {/* ── INVOICES ── */}
            {activeTab === 'invoices' && (
              <div className="space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="mb-2 flex items-center gap-2"><Bell className="h-5 w-5 text-yellow-600" /> Payment Terms</h3>
                  <ul className="text-sm space-y-1">
                    <li>• Invoice amount must be paid to BONORIYA within <strong>7 days</strong> of invoice generation</li>
                    <li>• Late payment will result in account suspension and removal from listings</li>
                    <li>• Invoices for <strong>Associated</strong> properties include 10% Commission on Booking + 18% GST on Commission</li>
                    <li>• <strong>BONORIYA Own</strong> properties are commission-free — no Commission on Booking, no GST on Commission</li>
                  </ul>
                </div>
                <div className="bg-white rounded-lg shadow-sm border border-border p-6">
                  <h2 className="text-xl mb-6">Monthly Invoices</h2>
                  <div className="text-center py-14">
                    <DollarSign className="h-14 w-14 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg mb-2">No invoices yet</h3>
                    <p className="text-sm text-muted-foreground">Invoices will be generated by BONORIYA admin once bookings are confirmed and completed.</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── POLICIES ── */}
            {activeTab === 'policies' && (
              <div className="bg-white rounded-lg shadow-sm border border-border p-6">
                <h2 className="text-xl mb-6">Property Policies</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="mb-4">Check-in / Check-out</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div><label className="block text-sm mb-2">Check-in Time</label><input type="time" className="w-full px-4 py-2 bg-input-background rounded-lg border border-border" value={propData.checkInTime} onChange={e => upd({ checkInTime: e.target.value })} /></div>
                      <div><label className="block text-sm mb-2">Check-out Time</label><input type="time" className="w-full px-4 py-2 bg-input-background rounded-lg border border-border" value={propData.checkOutTime} onChange={e => upd({ checkOutTime: e.target.value })} /></div>
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-4">Cancellation Policy</h3>
                    <select className="w-full px-4 py-2 bg-input-background rounded-lg border border-border" value={propData.cancellationPolicy} onChange={e => upd({ cancellationPolicy: e.target.value })}>
                      <option value="free-24h">Free cancellation up to 24 hours before check-in</option>
                      <option value="free-48h">Free cancellation up to 48 hours before check-in</option>
                      <option value="free-7d">Free cancellation up to 7 days before check-in</option>
                      <option value="non-refundable">Non-refundable</option>
                    </select>
                  </div>
                  <div>
                    <h3 className="mb-4">House Rules</h3>
                    <div className="space-y-3">
                      {[
                        { key: 'petsAllowed', label: 'Pets allowed' },
                        { key: 'smokingAllowed', label: 'Smoking allowed' },
                        { key: 'partiesAllowed', label: 'Parties/events allowed' },
                      ].map(rule => (
                        <label key={rule.key} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" className="rounded" checked={(propData as any)[rule.key]} onChange={e => upd({ [rule.key]: e.target.checked } as any)} />
                          <span className="text-sm">{rule.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <h4 className="mb-2">BONORIYA Commission Structure</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>• <strong>Associated properties:</strong> Commission on Booking = 10% of booking amount</li>
                      <li>• <strong>Associated properties:</strong> GST on Commission = 18% of commission amount</li>
                      <li>• <strong>BONORIYA Own properties:</strong> No Commission on Booking · No GST on Commission</li>
                      <li>• Payment cycle: 30 days (monthly)</li>
                      <li>• Payment due: Within 7 days of invoice receipt</li>
                    </ul>
                  </div>
                  <button onClick={() => { savePartnerPropertyData(propData); showToast('SAVED SUCCESSFULLY!'); }} className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90">
                    <Save className="h-4 w-4" /> Save Policies
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
