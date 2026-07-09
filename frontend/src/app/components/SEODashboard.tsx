import { useState, useEffect } from 'react';
import { CheckCircle, ExternalLink, FileText, Globe, Search, TrendingUp, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const PRIORITY_KEYWORDS = [
  { kw: 'offbeat stays in northeast india', type: 'Tourism', priority: 'High' },
  { kw: 'best resorts in assam', type: 'Tourism', priority: 'High' },
  { kw: 'homestays in northeast india', type: 'Tourism', priority: 'High' },
  { kw: 'day trip near guwahati', type: 'Tourism', priority: 'High' },
  { kw: 'eco resorts in northeast india', type: 'Tourism', priority: 'High' },
  { kw: 'resorts in meghalaya', type: 'Tourism', priority: 'High' },
  { kw: 'prefab house manufacturer in assam', type: 'Prefab', priority: 'High' },
  { kw: 'prefabricated cottages in assam', type: 'Prefab', priority: 'High' },
  { kw: 'modular cottages in assam', type: 'Prefab', priority: 'High' },
  { kw: 'prefab cottages manufacturer northeast india', type: 'Prefab', priority: 'High' },
  { kw: 'glamping pod manufacturer', type: 'Prefab', priority: 'Medium' },
  { kw: 'homestays in shillong', type: 'Tourism', priority: 'Medium' },
];

const BLOG_TOPICS = [
  { title: 'Top 10 Offbeat Stays in Northeast India', category: 'Tourism', status: 'Suggested' },
  { title: 'Best Day Trips Near Guwahati', category: 'Tourism', status: 'Suggested' },
  { title: 'Hidden Gems in Meghalaya', category: 'Tourism', status: 'Suggested' },
  { title: 'Best Resorts in Assam', category: 'Tourism', status: 'Suggested' },
  { title: 'Benefits of Prefab Homes in Assam', category: 'Prefab', status: 'Suggested' },
  { title: 'Cost of Prefabricated Cottages in India', category: 'Prefab', status: 'Suggested' },
  { title: 'Why Resorts Prefer Modular Construction', category: 'Prefab', status: 'Suggested' },
];

const CHECKLIST = [
  { item: 'SEO titles & meta descriptions on all pages', done: true },
  { item: 'Open Graph + Twitter Card tags', done: true },
  { item: 'JSON-LD structured data (Organization, FAQ, Hotel, Product)', done: true },
  { item: 'FAQ sections on Homepage, Prefab, Day Trip pages', done: true },
  { item: 'robots.txt created', done: true },
  { item: 'sitemap.xml created (19 URLs)', done: true },
  { item: 'blog-sitemap.xml created', done: true },
  { item: 'Location landing page SEO configs (Assam, Meghalaya)', done: true },
  { item: 'Homepage H1 updated to target keywords', done: true },
  { item: 'BlogPosting schema helper (injectBlogSchema)', done: true },
  { item: 'Submit sitemap.xml to Google Search Console', done: false },
  { item: 'Create / optimize Google Business Profile', done: false },
  { item: 'Set up Google Analytics 4 tracking', done: false },
  { item: 'Set up Google Tag Manager', done: false },
  { item: 'Publish first 4 blog posts', done: false },
  { item: 'Build 10+ quality backlinks', done: false },
];

export default function SEODashboard() {
  const [kFilter, setKFilter] = useState<'All' | 'Tourism' | 'Prefab'>('All');
  const [regenLoading, setRegenLoading] = useState(false);
  const [sitemapStatus, setSitemapStatus] = useState<Record<string, { size: number; modified: string }>>({});
  const done = CHECKLIST.filter(c => c.done).length;

  const backendUrl = (import.meta as any).env?.VITE_BACKEND_URL || '';

  useEffect(() => {
    if (!backendUrl) return;
    fetch(`${backendUrl}/api/seo/sitemap-status`)
      .then(r => r.json()).then(d => { if (d?.files) setSitemapStatus(d.files); })
      .catch(() => {});
  }, [backendUrl]);

  const regenerateSitemap = async () => {
    if (!backendUrl) {
      toast.error('Backend URL not configured (VITE_BACKEND_URL). Run the sitemap script manually.');
      return;
    }
    setRegenLoading(true);
    try {
      const r = await fetch(`${backendUrl}/api/seo/regenerate-sitemap`, { method: 'POST' });
      const d = await r.json();
      if (d?.ok) {
        toast.success(`Sitemap regenerated: ${d.counts?.properties || 0} properties, ${d.counts?.day_trips || 0} day trips`);
        const s = await fetch(`${backendUrl}/api/seo/sitemap-status`).then(x => x.json());
        setSitemapStatus(s?.files || {});
      } else {
        toast.error(d?.error || 'Regeneration failed');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Regeneration failed');
    } finally {
      setRegenLoading(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-border p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-xl mb-1">SEO Domination Dashboard</h2>
            <p className="text-sm text-muted-foreground">Phase-by-phase tracking for BONORIYA's Google ranking goals</p>
          </div>
          <span className="px-3 py-1.5 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
            Technical SEO: Active
          </span>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">SEO Implementation Progress</span>
            <span className="text-sm text-muted-foreground">{done}/{CHECKLIST.length} tasks</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2.5">
            <div className="bg-primary h-2.5 rounded-full transition-all" style={{ width: `${(done / CHECKLIST.length) * 100}%` }} />
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: Globe, label: 'Pages Indexed', value: '9', note: 'Sitemap URLs: 19', color: 'text-blue-600 bg-blue-50' },
            { icon: Search, label: 'Target Keywords', value: '12', note: '6 High priority', color: 'text-green-600 bg-green-50' },
            { icon: FileText, label: 'FAQ Q&As Live', value: '22', note: '3 pages covered', color: 'text-purple-600 bg-purple-50' },
            { icon: TrendingUp, label: 'Schema Types', value: '5', note: 'FAQ·Hotel·Product·Org·Blog', color: 'text-orange-600 bg-orange-50' },
          ].map(s => (
            <div key={s.label} className="p-4 rounded-xl border border-border">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${s.color}`}>
                <s.icon className="h-4 w-4" />
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs font-medium text-muted-foreground mt-0.5">{s.label}</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">{s.note}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sitemap Regeneration */}
      <div className="bg-white rounded-xl shadow-sm border border-border p-6" data-testid="seo-sitemap-panel">
        <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
          <div>
            <h3 className="text-base font-semibold mb-1">XML Sitemap & robots.txt</h3>
            <p className="text-sm text-muted-foreground">
              Regenerate all sitemap XML files (index, properties, destinations, day trips, images) + robots.txt directly from Supabase data.
            </p>
          </div>
          <button
            data-testid="regen-sitemap-btn"
            onClick={regenerateSitemap}
            disabled={regenLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition disabled:opacity-50 text-sm font-medium"
          >
            <RefreshCw className={`h-4 w-4 ${regenLoading ? 'animate-spin' : ''}`} />
            {regenLoading ? 'Regenerating…' : 'Regenerate Sitemap Now'}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
          {['sitemap.xml','sitemap-properties.xml','sitemap-destinations.xml','sitemap-daytrips.xml','sitemap-images.xml','robots.txt'].map(name => {
            const info = sitemapStatus[name];
            return (
              <div key={name} className="border border-border rounded-lg p-3 text-xs">
                <div className="font-mono font-medium">{name}</div>
                <div className="mt-1 text-muted-foreground">
                  {info ? `${(info.size / 1024).toFixed(1)} KB · ${new Date(info.modified).toLocaleString()}` : 'Not generated yet'}
                </div>
                <a
                  href={`/${name}`} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-1.5 text-primary hover:underline"
                >View <ExternalLink className="h-3 w-3" /></a>
              </div>
            );
          })}
        </div>
      </div>

      {/* Implementation Checklist */}
      <div className="bg-white rounded-xl shadow-sm border border-border p-6">
        <h3 className="text-base font-semibold mb-4">SEO Implementation Checklist</h3>
        <div className="space-y-2">
          {CHECKLIST.map((c, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/30 transition-colors">
              <CheckCircle className={`h-4 w-4 flex-shrink-0 ${c.done ? 'text-green-500' : 'text-muted-foreground/30'}`} />
              <span className={`text-sm ${c.done ? 'text-foreground' : 'text-muted-foreground'}`}>{c.item}</span>
              {!c.done && <span className="ml-auto text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full flex-shrink-0">Pending</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Priority Keywords */}
      <div className="bg-white rounded-xl shadow-sm border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">Priority Target Keywords</h3>
          <div className="flex gap-1.5">
            {(['All', 'Tourism', 'Prefab'] as const).map(f => (
              <button key={f} onClick={() => setKFilter(f)} className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${kFilter === f ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>{f}</button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          {PRIORITY_KEYWORDS.filter(k => kFilter === 'All' || k.type === kFilter).map((k, i) => (
            <div key={i} className="flex items-center justify-between p-2.5 border border-border rounded-lg">
              <span className="text-sm font-mono">{k.kw}</span>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                <span className={`text-xs px-2 py-0.5 rounded-full ${k.type === 'Tourism' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{k.type}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${k.priority === 'High' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{k.priority}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Blog Strategy */}
      <div className="bg-white rounded-xl shadow-sm border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold">Blog Content Strategy</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Publish 4–8 blogs/month. Each blog must link back to property and prefab pages.</p>
          </div>
        </div>
        <div className="space-y-2">
          {BLOG_TOPICS.map((b, i) => (
            <div key={i} className="flex items-center justify-between p-3 border border-border rounded-lg">
              <div>
                <p className="text-sm font-medium">{b.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{b.category}</p>
              </div>
              <span className="text-xs px-2.5 py-1 bg-muted text-muted-foreground rounded-full flex-shrink-0 ml-3">{b.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* External Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-border p-6">
        <h3 className="text-base font-semibold mb-4">Phase 4 — Google Authority (Manual Steps)</h3>
        <div className="space-y-3">
          {[
            { title: 'Submit Sitemap to Google Search Console', url: 'https://search.google.com/search-console', note: 'Submit: https://bonoriya.com/sitemap.xml' },
            { title: 'Create / Optimise Google Business Profile', url: 'https://business.google.com', note: 'Add logo, photos, contact, website & reviews' },
            { title: 'Set Up Google Analytics 4', url: 'https://analytics.google.com', note: 'Use Admin → Settings → Analytics Config to paste your GA4 ID' },
          ].map((a, i) => (
            <div key={i} className="flex items-start justify-between p-4 border border-border rounded-xl gap-3">
              <div>
                <p className="text-sm font-semibold">{a.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.note}</p>
              </div>
              <a href={a.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:opacity-90 flex-shrink-0">
                Open <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
