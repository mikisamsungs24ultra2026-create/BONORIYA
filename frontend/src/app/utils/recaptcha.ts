/**
 * BONORIYA — Google reCAPTCHA v3 Integration
 *
 * Setup (one-time):
 *   1. Go to https://www.google.com/recaptcha/admin/create
 *   2. Choose reCAPTCHA v3, add domain: bonoriya.com (+ localhost for dev)
 *   3. Copy the SITE KEY and paste it below as RECAPTCHA_SITE_KEY
 *   4. Copy the SECRET KEY — add it to your server/Supabase Edge Function
 *      (never put the secret key in frontend code)
 *
 * Usage:
 *   const token = await getRecaptchaToken('login');
 *   // Send token to your backend for verification
 *   // Minimum score: 0.5 (0.0 = bot, 1.0 = human)
 */

// ── Replace with your actual reCAPTCHA v3 Site Key ────────────────────────
// Get it from: https://www.google.com/recaptcha/admin/create
export const RECAPTCHA_SITE_KEY = 'YOUR_RECAPTCHA_V3_SITE_KEY_HERE';

declare global {
  interface Window {
    grecaptcha: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, opts: { action: string }) => Promise<string>;
    };
  }
}

let scriptLoaded = false;

/** Load the reCAPTCHA v3 script once */
export function loadRecaptchaScript(): void {
  if (scriptLoaded || !RECAPTCHA_SITE_KEY || RECAPTCHA_SITE_KEY.includes('YOUR_')) return;
  if (document.getElementById('bonoriya-recaptcha-script')) { scriptLoaded = true; return; }
  const script = document.createElement('script');
  script.id = 'bonoriya-recaptcha-script';
  script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
  script.async = true;
  document.head.appendChild(script);
  scriptLoaded = true;
}

/**
 * Get a reCAPTCHA v3 token for the given action.
 * Returns null if reCAPTCHA is not configured or fails.
 *
 * Actions should be descriptive: 'login', 'register', 'booking', 'contact'
 */
export async function getRecaptchaToken(action: string): Promise<string | null> {
  if (!RECAPTCHA_SITE_KEY || RECAPTCHA_SITE_KEY.includes('YOUR_')) {
    console.info('[reCAPTCHA] Site key not configured — skipping verification');
    return null;
  }
  try {
    loadRecaptchaScript();
    return await new Promise<string>((resolve, reject) => {
      const attempt = (retries: number) => {
        if (window.grecaptcha) {
          window.grecaptcha.ready(async () => {
            try {
              const token = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action });
              resolve(token);
            } catch (e) { reject(e); }
          });
        } else if (retries > 0) {
          setTimeout(() => attempt(retries - 1), 500);
        } else {
          reject(new Error('reCAPTCHA failed to load'));
        }
      };
      attempt(10);
    });
  } catch (e) {
    console.warn('[reCAPTCHA] Token error:', e);
    return null;
  }
}

/**
 * Verify a reCAPTCHA token via Supabase Edge Function.
 * Returns true if score >= minScore (default 0.5).
 *
 * Requires a Supabase Edge Function at /functions/v1/verify-recaptcha
 * that calls: https://www.google.com/recaptcha/api/siteverify
 * with the SECRET KEY (server-side only).
 */
export async function verifyRecaptchaToken(
  token: string | null,
  minScore = 0.5
): Promise<boolean> {
  if (!token) return true; // Allow if reCAPTCHA not configured
  try {
    const { supabase } = await import('./db');
    const { data, error } = await supabase.functions.invoke('verify-recaptcha', {
      body: { token, minScore },
    });
    if (error) { console.warn('[reCAPTCHA verify]', error); return true; }
    return data?.success === true && (data?.score ?? 1) >= minScore;
  } catch (e) {
    console.warn('[reCAPTCHA verify]', e);
    return true; // Fail open — don't block users if verification unavailable
  }
}
