/**
 * BONORIYA – Supabase Edge Function: send-email
 *
 * Replaces EmailJS for ALL transactional emails.
 * Uses Resend API so From: noreply@bonoriya.com is DKIM-signed
 * with bonoriya.com's own key → SPF + DKIM + DMARC all PASS.
 *
 * Setup:
 *   1. resend.com → Create account → Add Domain → bonoriya.com
 *   2. Add the DNS records Resend gives you (DKIM TXT + SPF include)
 *   3. Supabase Dashboard → Edge Functions → Secrets → RESEND_API_KEY
 *   4. supabase functions deploy send-email
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendEmailPayload {
  to: string | string[];
  subject: string;
  html: string;
  replyTo?: string;
  attachments?: Array<{ filename: string; content: string }>; // base64 content
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const RESEND_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_KEY) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY secret not set in Supabase Edge Functions' }),
        { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    const payload: SendEmailPayload = await req.json();
    const { to, subject, html, replyTo, attachments } = payload;

    const body: Record<string, unknown> = {
      from: 'BONORIYA <noreply@bonoriya.com>',
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    };
    if (replyTo) body.reply_to = replyTo;
    if (attachments?.length) body.attachments = attachments;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[send-email] Resend error:', data);
      return new Response(
        JSON.stringify({ error: data }),
        { status: res.status, headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-email] ✓ Sent to ${Array.isArray(to) ? to.join(',') : to} | id: ${data.id}`);
    return new Response(
      JSON.stringify({ success: true, id: data.id }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );

  } catch (e) {
    console.error('[send-email]', e);
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    );
  }
});
