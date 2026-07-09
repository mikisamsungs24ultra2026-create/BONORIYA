/**
 * Cache version management.
 *
 * HOW TO FORCE A CACHE CLEAR ON ALL DEVICES:
 *   Increment APP_VERSION below, then redeploy.
 *   On next load every browser will detect the version mismatch,
 *   clear all non-critical caches, and reload the fresh app.
 *
 * NOTE: Guest accounts, partner registrations, bookings and
 *       admin configuration are preserved across version bumps.
 *       Only UI/view caches are cleared.
 */

export const APP_VERSION = '2026.06.1';

const VERSION_KEY = 'bonoriya_app_version';

/** Keys that are safe to clear on a version upgrade (UI state, not user data) */
const CLEARABLE_KEYS = [
  'bonoriya_daytrip_availability',   // re-fetched from admin
  'bonoriya_own_property',           // re-fetched from admin
  'bonoriya_analytics_config',       // non-critical config
];

/**
 * Call once at app startup.
 * If the stored version doesn't match APP_VERSION:
 *   - clears UI/view caches
 *   - updates the stored version
 *   - returns true (indicating a refresh happened)
 */
export function checkAndUpdateVersion(): boolean {
  try {
    const stored = localStorage.getItem(VERSION_KEY);
    if (stored === APP_VERSION) return false;

    // Version mismatch — clear non-critical caches
    CLEARABLE_KEYS.forEach(key => localStorage.removeItem(key));

    // Update to new version
    localStorage.setItem(VERSION_KEY, APP_VERSION);
    console.log(`[BONORIYA] App updated to v${APP_VERSION}. UI caches cleared.`);
    return true;
  } catch {
    return false;
  }
}

export function getCurrentVersion(): string {
  return localStorage.getItem(VERSION_KEY) || 'unknown';
}

// ─── Data export/import for cross-device sync ─────────────────────────────────

const SYNC_KEYS = [
  'bonoriya_admin',
  'bonoriya_partners',
  'bonoriya_partner_properties',
  'bonoriya_email_config',
  'bonoriya_analytics_config',
  'bonoriya_own_property',
  'bonoriya_daytrip_availability',
  'bonoriya_email_logs',
] as const;

const FULL_SYNC_KEYS = [
  ...SYNC_KEYS,
  'bonoriya_guests',
  'bonoriya_bookings',
  'bonoriya_email_logs',
];

export interface ExportedData {
  version: string;
  exportedAt: string;
  exportedFrom: string;
  data: Record<string, unknown>;
}

/**
 * Export all app data to a JSON object for cross-device transfer.
 * @param scope 'admin' = admin+partner config only | 'full' = everything including guests+bookings
 */
export function exportAppData(scope: 'admin' | 'full' = 'admin'): ExportedData {
  const keys = scope === 'full' ? FULL_SYNC_KEYS : [...SYNC_KEYS];
  const data: Record<string, unknown> = {};
  keys.forEach(key => {
    const raw = localStorage.getItem(key);
    if (raw) {
      try { data[key] = JSON.parse(raw); } catch { data[key] = raw; }
    }
  });
  return {
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    exportedFrom: window.navigator.userAgent.substring(0, 80),
    data,
  };
}

/**
 * Import data from an ExportedData object into localStorage.
 * Returns number of keys imported.
 */
export function importAppData(exported: ExportedData): number {
  let count = 0;
  Object.entries(exported.data).forEach(([key, value]) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      count++;
    } catch (e) {
      console.warn(`[BONORIYA] Failed to import key ${key}:`, e);
    }
  });
  // Mark the version so cache-clear doesn't wipe it again
  localStorage.setItem(VERSION_KEY, exported.version || APP_VERSION);
  return count;
}

/** Download data as a JSON file */
export function downloadDataFile(scope: 'admin' | 'full' = 'admin'): void {
  const exported = exportAppData(scope);
  const blob = new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bonoriya-data-${scope}-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Read an uploaded file and import the data */
export async function importFromFile(file: File): Promise<{ success: boolean; count: number; error?: string }> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const exported: ExportedData = JSON.parse(e.target?.result as string);
        if (!exported.data || typeof exported.data !== 'object') {
          resolve({ success: false, count: 0, error: 'Invalid file format. Please use a BONORIYA export file.' });
          return;
        }
        const count = importAppData(exported);
        resolve({ success: true, count });
      } catch {
        resolve({ success: false, count: 0, error: 'Could not parse file. Ensure it is a valid BONORIYA JSON export.' });
      }
    };
    reader.onerror = () => resolve({ success: false, count: 0, error: 'Failed to read file.' });
    reader.readAsText(file);
  });
}
