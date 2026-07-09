/**
 * Fire-and-forget sitemap regeneration trigger.
 *
 * Called after any property / day trip / destination content change from
 * partner or admin dashboards. Debounced so rapid consecutive saves collapse
 * into a single backend call.
 */

const DEBOUNCE_MS = 2500;
let timer: number | null = null;

function backendUrl(): string {
  try {
    return (import.meta as any).env?.VITE_BACKEND_URL
        || (import.meta as any).env?.REACT_APP_BACKEND_URL
        || '';
  } catch {
    return '';
  }
}

export function triggerSitemapRegen(): void {
  const url = backendUrl();
  if (!url) return;
  if (timer !== null) window.clearTimeout(timer);
  timer = window.setTimeout(() => {
    fetch(`${url}/api/seo/regenerate-sitemap`, { method: 'POST' })
      .then(r => r.json())
      .then(d => console.info('[SEO] sitemap regenerated', d?.counts))
      .catch(e => console.warn('[SEO] sitemap regen failed', e));
    timer = null;
  }, DEBOUNCE_MS);
}
