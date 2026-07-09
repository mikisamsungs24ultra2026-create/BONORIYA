/**
 * BONORIYA – Supabase Edge Function: send-agreement-email
 *
 * Sends the partner agreement PDF as an actual email ATTACHMENT
 * to both the new partner and info@bonoriya.com.
 *
 * Uses Resend (https://resend.com) — free tier: 3,000 emails/month.
 *
 * Setup:
 *   1. Create free account at https://resend.com
 *   2. Get API key from https://resend.com/api-keys
 *   3. Add to Supabase: Dashboard → Edge Functions → Secrets → Add RESEND_API_KEY
 *   4. Deploy: supabase functions deploy send-agreement-email
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const BONORIYA_INFO = 'info@bonoriya.com';
const BONORIYA_FROM = 'BONORIYA <noreply@bonoriya.com>';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AgreementEmailPayload {
  partnerName: string;
  businessName: string;
  email: string;
  mobile: string;
  address?: string;
  gstNumber?: string;
  acceptedAt: string;
  pdfBase64: string;       // base64-encoded PDF bytes
  pdfFileName: string;     // e.g. "BONORIYA_Partner_Agreement_John.pdf"
  pdfPublicUrl?: string;   // Supabase Storage public URL (fallback link)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const body: AgreementEmailPayload = await req.json();
    const { partnerName, businessName, email, mobile, address, gstNumber, acceptedAt, pdfBase64, pdfFileName, pdfPublicUrl } = body;

    const dateStr = new Date(acceptedAt).toLocaleString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
    });

    const attachment = { filename: pdfFileName, content: pdfBase64 };

    const downloadNote = pdfPublicUrl
      ? `<p style="text-align:center;margin:8px 0;"><a href="${pdfPublicUrl}" style="color:#1b3d2f;">Click here if PDF does not open automatically</a></p>`
      : '';

    // ── Email body (shared, heading changes per recipient) ──────────────────
    const makeHtml = (heading: string) => `<!DOCTYPE html>
<html><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f5f7f5;font-family:Arial,Helvetica,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7f5;">
<tr><td align="center" style="padding:24px 12px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
  <tr><td align="center" style="background:#0F2218;padding:28px 24px 20px;">
    <img src="https://mltpbbbauvluhhddteoy.supabase.co/storage/v1/object/public/bonoriya-assets/bonoriya-logo.png"
         alt="BONORIYA" width="180" style="display:block;margin:0 auto 10px;"/>
    <p style="color:rgba(255,255,255,0.7);font-size:11px;margin:0;">
      Off-beat Tourism &bull; Prefab Cottages &bull; Northeast India
    </p>
  </td></tr>
  <tr><td style="padding:32px 36px 24px;">
    <h2 style="color:#0F2218;font-size:18px;margin:0 0 16px;">${heading}</h2>
    <p style="font-size:14px;color:#333;margin:0 0 12px;">Dear <strong>${partnerName}</strong>,</p>
    <p style="font-size:14px;color:#444;line-height:1.7;margin:0 0 16px;">
      ${heading.includes('New Partner')
        ? `A new partner has registered on BONORIYA. Details below.`
        : `Congratulations on registering as a BONORIYA Partner. Your application is under review. You will be notified once approved (24–48 hours).`}
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <tr><td style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:16px;font-size:13px;color:#166534;line-height:1.9;">
        <strong>Partner:</strong> ${partnerName}<br/>
        <strong>Business:</strong> ${businessName}<br/>
        <strong>Email:</strong> ${email}<br/>
        <strong>Mobile:</strong> ${mobile}<br/>
        ${address ? `<strong>Address:</strong> ${address}<br/>` : ''}
        ${gstNumber ? `<strong>GST:</strong> ${gstNumber}<br/>` : ''}
        <strong>Agreement Accepted:</strong> ${dateStr}
      </td></tr>
    </table>
    <p style="font-size:14px;color:#444;margin:0 0 8px;">
      📎 <strong>The signed Digital Partnership Agreement PDF is attached</strong> to this email.
    </p>
    ${downloadNote}
    <p style="font-size:13px;color:#555;margin:20px 0 0;">
      For queries: <strong>info@bonoriya.com</strong> | <strong>+91-9864282966</strong>
    </p>
  </td></tr>
  <tr><td style="padding:0 36px;"><hr style="border:none;border-top:1px solid #e5e7eb;"/></td></tr>
  <tr><td style="background:#f9fafb;padding:14px 36px;text-align:center;">
    <p style="color:#9ca3af;font-size:12px;margin:2px 0;">BONORIYA &bull; info@bonoriya.com &bull; +91-9864282966</p>
    <p style="color:#9ca3af;font-size:12px;margin:2px 0;">&copy; 2026 BONORIYA. All rights reserved.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

    async function sendViaResend(to: string, subject: string, html: string) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: BONORIYA_FROM,
          to: [to],
          subject,
          html,
          attachments: [attachment],
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(`Resend error: ${JSON.stringify(result)}`);
      return result;
    }

    // ── Send to partner ──────────────────────────────────────────────────────
    const r1 = await sendViaResend(
      email,
      'Welcome to BONORIYA — Your Digital Partnership Agreement',
      makeHtml('Welcome to BONORIYA Partner Network!')
    );
    console.log('[Agreement] ✓ Sent to partner:', email, r1.id);

    // ── Send to BONORIYA info@ ────────────────────────────────────────────────
    const r2 = await sendViaResend(
      BONORIYA_INFO,
      `[New Partner] ${partnerName} — ${businessName} — Agreement Signed`,
      makeHtml(`New Partner Registration — ${partnerName}`)
    );
    console.log('[Agreement] ✓ Sent to BONORIYA:', BONORIYA_INFO, r2.id);

    return new Response(
      JSON.stringify({ success: true, partner_email_id: r1.id, bonoriya_email_id: r2.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (e) {
    console.error('[send-agreement-email]', e);
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
