/**
 * BONORIYA — Server-side data API
 * All data reads and writes go through Supabase.
 * This file replaces the localStorage-based functions in auth.ts.
 *
 * Usage: import from './api' instead of './auth' for data operations.
 */
import { supabase, dbGet, dbList, dbUpsert, dbDelete, uploadPhoto } from './db';

// ─── Partners ─────────────────────────────────────────────────────────────────

export async function apiGetAllPartners() {
  return dbList('partners', { order: 'created_at' });
}

export async function apiGetPendingPartners() {
  const { data } = await supabase.from('partners').select('*')
    .eq('approved', false).eq('rejected', false).order('created_at');
  return data || [];
}

export async function apiGetApprovedPartners() {
  const { data } = await supabase.from('partners').select('*')
    .eq('approved', true).order('created_at');
  return data || [];
}

export async function apiGetPartnerByEmail(email: string) {
  return dbGet('partners', { email });
}

export async function apiCreatePartner(partner: Record<string, unknown>) {
  return dbUpsert('partners', partner, 'email');
}

export async function apiUpdatePartner(id: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase.from('partners').update(updates).eq('id', id).select().single();
  if (error) console.error('[API updatePartner]', error.message);
  return data;
}

export async function apiDeletePartner(id: string) {
  return dbDelete('partners', { id });
}

export async function apiApprovePartner(id: string) {
  return apiUpdatePartner(id, { approved: true, rejected: false, approved_at: new Date().toISOString() });
}

export async function apiRejectPartner(id: string) {
  return apiUpdatePartner(id, { rejected: true, approved: false, rejected_at: new Date().toISOString() });
}

// ─── Guests ───────────────────────────────────────────────────────────────────

export async function apiGetGuestByEmail(email: string) {
  return dbGet('guests', { email });
}

export async function apiCreateGuest(guest: Record<string, unknown>) {
  return dbUpsert('guests', guest, 'email');
}

export async function apiUpdateGuest(email: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase.from('guests').update({ ...updates, updated_at: new Date().toISOString() })
    .eq('email', email).select().single();
  if (error) console.error('[API updateGuest]', error.message);
  return data;
}

// ─── Partner Properties (listings) ───────────────────────────────────────────

export async function apiGetApprovedPartnerProperties() {
  const { data } = await supabase.from('partner_properties').select('*')
    .eq('active', true)
    .in('partner_id', (await apiGetApprovedPartners()).map((p: any) => p.id));
  return data || [];
}

export async function apiGetAllPartnerProperties() {
  return dbList('partner_properties', { order: 'created_at' });
}

export async function apiGetPartnerProperties(partnerId: string) {
  return dbList('partner_properties', { match: { partner_id: partnerId } });
}

export async function apiSavePartnerProperty(property: Record<string, unknown>) {
  return dbUpsert('partner_properties', property, 'id');
}

export async function apiUpdatePartnerProperty(id: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase.from('partner_properties').update(updates).eq('id', id).select().single();
  if (error) console.error('[API updatePartnerProperty]', error.message);
  return data;
}

export async function apiDeletePartnerProperty(id: string) {
  return dbDelete('partner_properties', { id });
}

// ─── Partner Property Data (full dashboard) ───────────────────────────────────

export async function apiLoadPartnerPropertyData(partnerId: string) {
  return dbGet('partner_property_data', { partner_id: partnerId });
}

export async function apiSavePartnerPropertyData(data: Record<string, unknown>) {
  return dbUpsert('partner_property_data', { ...data, updated_at: new Date().toISOString() }, 'partner_id');
}

// ─── Rooms ────────────────────────────────────────────────────────────────────

export async function apiGetRooms(partnerId: string) {
  return dbList('rooms', { match: { partner_id: partnerId }, order: 'created_at' });
}

export async function apiSaveRoom(room: Record<string, unknown>) {
  return dbUpsert('rooms', room, 'id');
}

export async function apiDeleteRoom(id: number) {
  return dbDelete('rooms', { id });
}

// ─── Room Photos ──────────────────────────────────────────────────────────────

export async function apiGetRoomPhotos(roomId: number) {
  return dbList('room_photos', { match: { room_id: roomId }, order: 'sort_order' });
}

export async function apiSaveRoomPhoto(photo: Record<string, unknown>) {
  return dbUpsert('room_photos', photo, 'id');
}

export async function apiDeleteRoomPhoto(id: string) {
  return dbDelete('room_photos', { id });
}

/** Upload a room photo file to Supabase Storage and save the URL to DB */
export async function apiUploadRoomPhoto(
  partnerId: string, roomId: number, file: File, label = ''
): Promise<string | null> {
  const path = `${partnerId}/${roomId}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
  const url = await uploadPhoto('roomPhotos', path, file);
  if (!url) return null;
  await apiSaveRoomPhoto({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    room_id: roomId, partner_id: partnerId,
    url, file_name: file.name, is_primary: false, label,
  });
  return url;
}

// ─── Property Photos ──────────────────────────────────────────────────────────

export async function apiGetPropertyPhotos(partnerId: string) {
  return dbList('property_photos', { match: { partner_id: partnerId }, order: 'sort_order' });
}

export async function apiSavePropertyPhoto(photo: Record<string, unknown>) {
  return dbUpsert('property_photos', photo, 'id');
}

export async function apiSetMainPropertyPhoto(partnerId: string, photoId: string) {
  // Clear all main flags for this partner
  await supabase.from('property_photos').update({ is_main_image: false }).eq('partner_id', partnerId);
  // Set the selected one
  await supabase.from('property_photos').update({ is_main_image: true }).eq('id', photoId);
  // Sync to listing
  const photo = await dbGet<any>('property_photos', { id: photoId });
  if (photo) await apiUpdatePartnerProperty(partnerId, { image: photo.url });
}

export async function apiUploadPropertyPhoto(
  partnerId: string, file: File, category = 'General'
): Promise<string | null> {
  const path = `${partnerId}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
  const url = await uploadPhoto('propertyPhotos', path, file);
  if (!url) return null;
  const photos = await apiGetPropertyPhotos(partnerId);
  await apiSavePropertyPhoto({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    partner_id: partnerId, url, file_name: file.name,
    category, is_main_image: photos.length === 0, sort_order: photos.length,
  });
  return url;
}

// ─── Room Inventory ───────────────────────────────────────────────────────────

export async function apiGetInventory(partnerId: string) {
  return dbList('room_inventory', { match: { partner_id: partnerId } });
}

export async function apiSaveInventorySlot(slot: Record<string, unknown>) {
  return dbUpsert('room_inventory', slot, 'partner_id,room_id,date');
}

export async function apiSaveInventorySlots(partnerId: string, slots: Record<string, unknown>[]) {
  if (!slots.length) return;
  const { error } = await supabase.from('room_inventory').upsert(
    slots.map(s => ({ ...s, partner_id: partnerId })),
    { onConflict: 'partner_id,room_id,date' }
  );
  if (error) console.error('[API saveInventorySlots]', error.message);
}

// ─── Bookings ─────────────────────────────────────────────────────────────────

export async function apiSaveBooking(booking: Record<string, unknown>) {
  return dbUpsert('bookings', booking, 'id');
}

export async function apiGetAllBookings() {
  return dbList('bookings', { order: 'created_at' });
}

export async function apiGetBookingsByGuest(email: string) {
  const { data } = await supabase.from('bookings').select('*')
    .eq('guest_email', email).order('created_at', { ascending: false });
  return data || [];
}

export async function apiGetBookingsByPartner(partnerId: string) {
  const { data } = await supabase.from('bookings').select('*')
    .eq('partner_id', partnerId).order('created_at', { ascending: false });
  return data || [];
}

export async function apiGetDayTripBookings() {
  const { data } = await supabase.from('bookings').select('*')
    .eq('type', 'day-trip').order('created_at', { ascending: false });
  return data || [];
}

export async function apiUpdateBookingStatus(id: string, status: string) {
  const { error } = await supabase.from('bookings').update({ booking_status: status }).eq('id', id);
  if (error) console.error('[API updateBookingStatus]', error.message);
}

// ─── Day Trip Availability ────────────────────────────────────────────────────

export async function apiGetDayTripAvailability() {
  return dbList('day_trip_availability', {});
}

export async function apiGetDayTripDateStatus(date: string): Promise<'available' | 'closed'> {
  const row = await dbGet<any>('day_trip_availability', { date });
  return row?.status || 'available';
}

export async function apiSaveDayTripAvailability(slots: { date: string; status: string }[]) {
  if (!slots.length) return;
  const { error } = await supabase.from('day_trip_availability').upsert(slots, { onConflict: 'date' });
  if (error) console.error('[API saveDayTripAvailability]', error.message);
}

// ─── Bonoriya Own Property ────────────────────────────────────────────────────

export async function apiGetBonoriyaProperty() {
  return dbGet<any>('bonoriya_property', { id: 1 });
}

export async function apiSaveBonoriyaProperty(data: Record<string, unknown>) {
  return dbUpsert('bonoriya_property', { ...data, id: 1, updated_at: new Date().toISOString() }, 'id');
}

// ─── Config ───────────────────────────────────────────────────────────────────

export async function apiGetEmailConfig() {
  return dbGet<any>('email_config', { id: 1 });
}

export async function apiSaveEmailConfig(config: Record<string, unknown>) {
  return dbUpsert('email_config', { ...config, id: 1, updated_at: new Date().toISOString() }, 'id');
}

export async function apiGetAnalyticsConfig() {
  return dbGet<any>('analytics_config', { id: 1 });
}

export async function apiSaveAnalyticsConfig(config: Record<string, unknown>) {
  return dbUpsert('analytics_config', { ...config, id: 1 }, 'id');
}

// ─── Admin settings ───────────────────────────────────────────────────────────

export async function apiGetAdminSetting(key: string) {
  const row = await dbGet<any>('admin_settings', { key });
  return row?.value;
}

export async function apiSetAdminSetting(key: string, value: unknown) {
  return dbUpsert('admin_settings', { key, value, updated_at: new Date().toISOString() }, 'key');
}

// ─── Real-time subscriptions ─────────────────────────────────────────────────

export function subscribeBookings(callback: (payload: any) => void) {
  return supabase.channel('bookings_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, callback)
    .subscribe();
}

export function subscribePartners(callback: (payload: any) => void) {
  return supabase.channel('partners_changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'partners' }, callback)
    .subscribe();
}
