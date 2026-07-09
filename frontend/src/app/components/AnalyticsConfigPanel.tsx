import { useState } from 'react';
import { CheckCircle, AlertCircle, BarChart3, ExternalLink } from 'lucide-react';
import { getAnalyticsConfig, saveAnalyticsConfig, type AnalyticsConfig } from '../utils/seo';

export default function AnalyticsConfigPanel() {
  const [form, setForm] = useState<AnalyticsConfig>(getAnalyticsConfig);
  const [saved, setSaved] = useState(false);

  const save = () => {
    saveAnalyticsConfig(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    // Reload to initialise scripts
    if (form.enabled && (form.ga4Id || form.gtmId || form.metaPixelId)) {
      window.location.reload();
    }
  };

  const upd = (k: keyof AnalyticsConfig, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }));

  const active = form.enabled && (form.ga4Id || form.gtmId || form.metaPixelId);

  return (
    <div className="space-y-5">
      {/* Status */}
      <div className={`p-4 rounded-lg border flex items-start gap-3 ${active ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
        {active ? <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" /> : <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />}
        <div>
          <p className={`font-medium text-sm ${active ? 'text-green-800' : 'text-yellow-800'}`}>
            {active ? 'Analytics & tracking ACTIVE' : 'Analytics not configured — visitor data is not being collected'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {active
              ? `Tracking with: ${[form.ga4Id && 'GA4', form.gtmId && 'GTM', form.metaPixelId && 'Meta Pixel'].filter(Boolean).join(', ')}`
              : 'Fill in your tracking IDs below to start collecting analytics data.'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-border p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Analytics Tracking IDs</h4>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" className="rounded" checked={form.enabled} onChange={e => upd('enabled', e.target.checked)} />
            Enable All Tracking
          </label>
        </div>

        {/* GA4 */}
        <div>
          <label className="block text-sm mb-1 font-medium">Google Analytics 4 (GA4) Measurement ID</label>
          <input
            className="w-full px-3 py-2 border border-border rounded-lg bg-input-background font-mono text-sm"
            placeholder="G-XXXXXXXXXX"
            value={form.ga4Id}
            onChange={e => upd('ga4Id', e.target.value.trim())}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Find at: <a href="https://analytics.google.com" target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">analytics.google.com <ExternalLink className="h-3 w-3" /></a> → Admin → Data Streams → Web
          </p>
        </div>

        {/* GTM */}
        <div>
          <label className="block text-sm mb-1 font-medium">Google Tag Manager Container ID</label>
          <input
            className="w-full px-3 py-2 border border-border rounded-lg bg-input-background font-mono text-sm"
            placeholder="GTM-XXXXXXX"
            value={form.gtmId}
            onChange={e => upd('gtmId', e.target.value.trim())}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Find at: <a href="https://tagmanager.google.com" target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">tagmanager.google.com <ExternalLink className="h-3 w-3" /></a> → Your container
          </p>
        </div>

        {/* Meta Pixel */}
        <div>
          <label className="block text-sm mb-1 font-medium">Meta (Facebook) Pixel ID</label>
          <input
            className="w-full px-3 py-2 border border-border rounded-lg bg-input-background font-mono text-sm"
            placeholder="1234567890123456"
            value={form.metaPixelId}
            onChange={e => upd('metaPixelId', e.target.value.replace(/\D/g, ''))}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Find at: <a href="https://business.facebook.com/events_manager" target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">Meta Events Manager <ExternalLink className="h-3 w-3" /></a>
          </p>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 space-y-1">
          <p className="font-medium">Tracked Events</p>
          <div className="grid grid-cols-2 gap-x-4">
            {['Page Visit', 'Property View', 'Booking Started', 'Booking Completed', 'Partner Signup', 'Guest Signup'].map(e => (
              <span key={e} className="flex items-center gap-1">✓ {e}</span>
            ))}
          </div>
        </div>

        <button
          onClick={save}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 text-sm"
        >
          {saved ? <><CheckCircle className="h-4 w-4" /> Saved!</> : 'Save & Activate'}
        </button>
      </div>
    </div>
  );
}
