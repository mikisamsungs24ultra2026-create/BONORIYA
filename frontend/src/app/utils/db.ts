/**
 * BONORIYA — Supabase database client
 * Single source of truth for all data operations.
 * Replaces all localStorage usage for business data.
 */
import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

export const supabase = createClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey,
  {
    auth: { persistSession: false },   // app manages its own auth
    realtime: { params: { eventsPerSecond: 10 } },
  }
);

// ─── Type-safe table names ────────────────────────────────────────────────────

export type Tables =
  | 'admin_settings'
  | 'partners'
  | 'guests'
  | 'partner_properties'
  | 'partner_property_data'
  | 'rooms'
  | 'room_photos'
  | 'property_photos'
  | 'room_inventory'
  | 'bookings'
  | 'day_trip_availability'
  | 'bonoriya_property'
  | 'email_config'
  | 'analytics_config';

// ─── Generic helpers ──────────────────────────────────────────────────────────

export async function dbGet<T>(table: Tables, match: Record<string, unknown>): Promise<T | null> {
  const { data, error } = await supabase.from(table).select('*').match(match).single();
  if (error && error.code !== 'PGRST116') console.error(`[DB GET ${table}]`, error.message);
  return (data as T) || null;
}

export async function dbList<T>(
  table: Tables,
  options: { match?: Record<string, unknown>; order?: string; limit?: number } = {}
): Promise<T[]> {
  let q = supabase.from(table).select('*');
  if (options.match) q = q.match(options.match);
  if (options.order) q = q.order(options.order);
  if (options.limit) q = q.limit(options.limit);
  const { data, error } = await q;
  if (error) console.error(`[DB LIST ${table}]`, error.message);
  return (data as T[]) || [];
}

export async function dbUpsert<T extends Record<string, unknown>>(
  table: Tables,
  data: T | T[],
  onConflict?: string
): Promise<T | null> {
  const opts = onConflict ? { onConflict } : undefined;
  const { data: result, error } = await supabase.from(table).upsert(data as any, opts).select().single();
  if (error) console.error(`[DB UPSERT ${table}]`, error.message);
  return (result as T) || null;
}

export async function dbDelete(table: Tables, match: Record<string, unknown>): Promise<boolean> {
  const { error } = await supabase.from(table).delete().match(match);
  if (error) { console.error(`[DB DELETE ${table}]`, error.message); return false; }
  return true;
}

// ─── Photo storage helpers ────────────────────────────────────────────────────

const BUCKETS = {
  propertyPhotos: 'property-photos',
  roomPhotos:     'room-photos',
  bonoriyaAssets: 'bonoriya-assets',
} as const;

/**
 * Upload a base64 data URL or File to Supabase Storage.
 * Returns the public URL.
 */
export async function uploadPhoto(
  bucket: keyof typeof BUCKETS,
  path: string,
  fileOrBase64: File | string
): Promise<string | null> {
  let file: File;
  if (typeof fileOrBase64 === 'string') {
    // Convert base64 data URL to File
    const arr = fileOrBase64.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    const u8arr = new Uint8Array(bstr.length);
    for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
    file = new File([u8arr], path.split('/').pop() || 'photo.jpg', { type: mime });
  } else {
    file = fileOrBase64;
  }

  const bucketName = BUCKETS[bucket];
  const { error } = await supabase.storage.from(bucketName).upload(path, file, { upsert: true });
  if (error) { console.error(`[STORAGE UPLOAD ${bucketName}]`, error.message); return null; }

  const { data } = supabase.storage.from(bucketName).getPublicUrl(path);
  return data.publicUrl;
}

export function getPhotoUrl(bucket: keyof typeof BUCKETS, path: string): string {
  const { data } = supabase.storage.from(BUCKETS[bucket]).getPublicUrl(path);
  return data.publicUrl;
}

// ─── Real-time subscription helper ───────────────────────────────────────────

export function subscribeToTable(
  table: Tables,
  callback: (payload: any) => void
) {
  return supabase
    .channel(`realtime:${table}`)
    .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
    .subscribe();
}
