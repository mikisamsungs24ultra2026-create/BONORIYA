import { useState, useRef } from 'react';
import {
  Download, Upload, RefreshCw, Smartphone, Monitor,
  CheckCircle, AlertCircle, Info, Shield
} from 'lucide-react';
import {
  APP_VERSION, downloadDataFile, importFromFile, exportAppData
} from '../utils/cacheVersion';

export default function DataSyncPanel() {
  const [importing, setImporting]       = useState(false);
  const [importResult, setImportResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [copied, setCopied]             = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    const result = await importFromFile(file);
    setImporting(false);
    if (result.success) {
      setImportResult({ ok: true, msg: `Successfully imported ${result.count} data keys. Reload the page to see all changes.` });
      setTimeout(() => window.location.reload(), 2000);
    } else {
      setImportResult({ ok: false, msg: result.error || 'Import failed.' });
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  const copyDataUrl = () => {
    const exported = exportAppData('admin');
    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(exported))));
    const url = `${window.location.origin}${window.location.pathname}?bonoriya_import=${encodeURIComponent(encoded)}`;
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); }).catch(() => {});
  };

  return (
    <div className="space-y-6">

      {/* Why data differs between devices */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-800 mb-1">Why data looks different on mobile vs laptop</p>
            <p className="text-sm text-blue-700 mb-3">
              BONORIYA stores all data (properties, photos, bookings, settings) in the browser's <strong>localStorage</strong>.
              This storage is <strong>specific to each browser and device</strong> — your laptop browser and mobile browser
              have completely separate data stores.
            </p>
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2 bg-white rounded-lg p-3 border border-blue-100">
                <Monitor className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div><p className="font-medium text-blue-800">Laptop browser</p><p className="text-blue-600">Has all the data you entered here</p></div>
              </div>
              <div className="flex items-start gap-2 bg-white rounded-lg p-3 border border-blue-100">
                <Smartphone className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div><p className="font-medium text-orange-700">Mobile browser</p><p className="text-orange-600">Has its own empty/old localStorage</p></div>
              </div>
            </div>
            <p className="text-sm text-blue-700 mt-3">
              <strong>Solution:</strong> Use the export/import tools below to copy your data from laptop to mobile.
            </p>
          </div>
        </div>
      </div>

      {/* App version */}
      <div className="bg-white rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold">App Version</h3>
          <span className="font-mono text-sm bg-muted px-3 py-1 rounded-full">v{APP_VERSION}</span>
        </div>
        <p className="text-sm text-muted-foreground">
          If the mobile browser is showing an old version of the app, try a hard refresh:
          iOS Safari → long-press reload button → "Reload Without Content Blockers".
          Android Chrome → Menu → "Clear browser data" → "Clear cache".
        </p>
      </div>

      {/* Export */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/20">
          <h3 className="font-semibold flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" /> Step 1 — Export Data from This Device (Laptop)
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Download a backup file containing all BONORIYA configuration, properties, partner data and settings.
          </p>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="border border-border rounded-xl p-4">
              <p className="font-medium mb-1 text-sm">Admin Export</p>
              <p className="text-xs text-muted-foreground mb-3">
                Properties, admin config, email settings, analytics, availability calendars.
                <strong> Does not include guest accounts or booking records.</strong>
              </p>
              <button
                onClick={() => downloadDataFile('admin')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 text-sm font-medium"
              >
                <Download className="h-4 w-4" /> Download Admin Data
              </button>
            </div>
            <div className="border border-border rounded-xl p-4">
              <p className="font-medium mb-1 text-sm">Full Export</p>
              <p className="text-xs text-muted-foreground mb-3">
                Everything including guest accounts, bookings, and all admin data.
                Use this to fully mirror this device on another browser.
              </p>
              <button
                onClick={() => downloadDataFile('full')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-border rounded-lg hover:bg-muted text-sm font-medium"
              >
                <Download className="h-4 w-4" /> Download Full Data
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Import */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/20">
          <h3 className="font-semibold flex items-center gap-2">
            <Upload className="h-5 w-5 text-green-600" /> Step 2 — Import Data on Mobile
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Open this Admin Dashboard on your mobile browser, then upload the file you downloaded in Step 1.
          </p>
        </div>
        <div className="p-6">
          <label className="flex flex-col items-center gap-3 p-6 border-2 border-dashed border-border rounded-xl cursor-pointer hover:bg-muted/20 hover:border-primary/50 transition-colors">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div className="text-center">
              <p className="font-medium text-sm">Click to select BONORIYA export file</p>
              <p className="text-xs text-muted-foreground mt-1">JSON file only · Downloaded from Step 1</p>
            </div>
            <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={handleImport} disabled={importing} />
          </label>

          {importing && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
              <RefreshCw className="h-4 w-4 animate-spin flex-shrink-0" /> Importing data…
            </div>
          )}
          {importResult && (
            <div className={`mt-4 flex items-start gap-2 p-3 rounded-lg text-sm border ${importResult.ok ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-700'}`}>
              {importResult.ok ? <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />}
              {importResult.msg}
            </div>
          )}
        </div>
      </div>

      {/* Quick guide */}
      <div className="bg-white rounded-xl border border-border p-6">
        <h3 className="font-semibold mb-4">Step-by-Step: Sync Laptop → Mobile</h3>
        <ol className="space-y-3">
          {[
            ['On your laptop', 'Click "Download Admin Data" above — save the .json file'],
            ['Transfer the file', 'Email it to yourself, WhatsApp to yourself, or save to Google Drive/iCloud'],
            ['On mobile browser', 'Open the BONORIYA admin URL and navigate to Settings → Data Sync'],
            ['Upload the file', 'Click "Select BONORIYA export file" and choose the downloaded .json'],
            ['Reload', 'The page will reload automatically with all your data synced'],
          ].map(([step, desc], i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-bold">{i+1}</span>
              <div><p className="text-sm font-medium">{step}</p><p className="text-xs text-muted-foreground">{desc}</p></div>
            </li>
          ))}
        </ol>
      </div>

      {/* Cache clearing instructions */}
      <div className="bg-white rounded-xl border border-border p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2"><RefreshCw className="h-5 w-5 text-primary" /> Force-Refresh App on Mobile (Clear Cache)</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div className="p-4 bg-muted/20 rounded-xl border border-border">
            <p className="font-semibold mb-2">📱 iPhone / iPad (Safari)</p>
            <ol className="space-y-1 text-muted-foreground list-decimal list-inside text-xs">
              <li>Settings → Safari → Clear History &amp; Website Data</li>
              <li>OR: Long-press the Reload button in Safari</li>
              <li>Tap "Reload Without Content Blockers"</li>
              <li>For hard refresh: Settings → Safari → Advanced → Website Data → Remove All</li>
            </ol>
          </div>
          <div className="p-4 bg-muted/20 rounded-xl border border-border">
            <p className="font-semibold mb-2">🤖 Android (Chrome)</p>
            <ol className="space-y-1 text-muted-foreground list-decimal list-inside text-xs">
              <li>Chrome Menu (⋮) → Settings → Privacy → Clear browsing data</li>
              <li>Select "Cached images and files"</li>
              <li>Tap "Clear data"</li>
              <li>Reload the BONORIYA URL</li>
            </ol>
          </div>
          <div className="p-4 bg-muted/20 rounded-xl border border-border md:col-span-2">
            <p className="font-semibold mb-2">⚠️ PWA / Add to Home Screen</p>
            <p className="text-xs text-muted-foreground">If you have BONORIYA saved to your home screen as a PWA, delete the app from your home screen and re-add it. PWA apps cache aggressively. After deleting and re-adding, it will fetch the latest version.</p>
          </div>
        </div>
      </div>

      {/* Security note */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3 text-sm text-amber-800">
        <Shield className="h-5 w-5 flex-shrink-0 mt-0.5 text-amber-600" />
        <div>
          <p className="font-semibold mb-1">Data Security Note</p>
          <p>The export file contains all BONORIYA admin configuration including partner credentials and settings. Transfer it securely (e.g. email to yourself, do not share publicly). Import the file only on trusted devices running the official BONORIYA admin URL.</p>
        </div>
      </div>

    </div>
  );
}
