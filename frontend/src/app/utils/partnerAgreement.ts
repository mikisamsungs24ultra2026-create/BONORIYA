/**
 * BONORIYA Partner Agreement
 *
 * Flow:
 *   1. generateAndUploadAgreementPDF()  — builds PDF with jsPDF text API,
 *      uploads to Supabase Storage, returns { blob, publicUrl }
 *   2. sendPartnerAgreementEmail()      — calls Supabase Edge Function
 *      "send-agreement-email" which sends the PDF as a real attachment via
 *      Resend. Falls back to EmailJS download-link if Edge Function fails.
 *
 * Both partner email AND info@bonoriya.com receive the agreement as an
 * email attachment.
 */

export interface PartnerAgreementData {
  partnerName: string;
  businessName: string;
  email: string;
  mobile: string;
  address?: string;
  gstNumber?: string;
  acceptedAt: string;
}

const BONORIYA_INFO_EMAIL = 'info@bonoriya.com';

// ── All 18 agreement clauses ──────────────────────────────────────────────────
const AGREEMENT_CLAUSES: [string, string][] = [
  ['1. Appointment of Partner',
    'The Partner agrees to register and list their property/properties and hospitality services on BONORIYA platform for promotion, bookings, and customer acquisition. BONORIYA reserves the right to approve, reject, suspend, or remove any listing at its sole discretion.'],
  ['2. Commission Structure',
    'The Partner agrees that BONORIYA shall charge a commission of 10% (Ten Percent) on the total booking value for every successful booking generated through BONORIYA platform. Applicable on: Stay bookings, Room bookings, Day trip bookings, Package bookings, and any other paid bookings. Commission shall be calculated on the final booking amount excluding taxes unless otherwise agreed in writing.'],
  ['3. GST & Taxes',
    'All applicable taxes including GST, local taxes, and government levies shall apply as per prevailing Government rules. The Partner shall be solely responsible for tax compliance, registration, filing, and payment. BONORIYA shall not be liable for tax non-compliance by Partner.'],
  ['4. Licenses & Legal Compliance',
    'The Partner confirms that all required licenses, permits, approvals, and registrations have been obtained from relevant local/state/government authorities including: Trade License, Tourism Registration, Fire Safety Clearance, Pollution Clearance, FSSAI License, and Homestay/Hotel Registration. Partner shall maintain compliance at all times. BONORIYA shall not be responsible for any regulatory violation by the Partner.'],
  ['5. Property Information Accuracy',
    'Partner agrees that all submitted information must be true and accurate including property details, room details, pricing, photos, amenities, and availability. The Partner is solely responsible for false or misleading information submitted to BONORIYA.'],
  ['6. Booking Fulfillment Responsibility',
    'The Partner is solely responsible for honoring confirmed bookings generated via BONORIYA. Partner must provide services as listed. Repeated booking denial or failure to honor bookings may result in immediate suspension from the platform.'],
  ['7. Guest & Host Conduct',
    'Both Partner and Guest are expected to maintain professional, respectful, and lawful conduct. Partner may refuse service in case of unlawful or disruptive behavior subject to applicable laws.'],
  ['8. Limitation of Liability',
    'BONORIYA acts solely as an online intermediary platform connecting guests and hosts. BONORIYA shall not be liable for disputes, damages, losses, misconduct, claims, injuries, or disagreements arising between Partner/Host and Guest/Visitor. All such disputes shall be resolved directly between Partner and Guest.'],
  ['9. Payments & Settlement',
    'Payments and settlements shall be processed as per BONORIYA 30-day monthly payment cycle. BONORIYA reserves the right to deduct commission, taxes, refund adjustments, and applicable penalties before settlement to the Partner.'],
  ['10. Cancellation & Refund Policy',
    'Cancellation and refund shall be governed by the applicable booking policies displayed at the time of booking. Partner agrees to honor the displayed cancellation policy for all bookings.'],
  ['11. Suspension / Termination',
    'BONORIYA reserves the right to suspend or terminate partner access in case of: Fraud, Policy violation, Misrepresentation, Legal non-compliance, Repeated service failures, or Serious customer complaints.'],
  ['12. Modification of Agreement',
    'BONORIYA reserves the right to update this Agreement from time to time with reasonable notice. Continued use of the platform after notification constitutes acceptance of revised terms.'],
  ['13. Governing Law',
    'This Agreement shall be governed by the laws of India. All disputes shall be subject to the exclusive jurisdiction of competent courts in India.'],
  ['14. Force Majeure',
    'BONORIYA shall not be liable for failure or delay caused by events beyond reasonable control including natural disasters, floods, fire, pandemic, government restrictions, war, technical failures, cyber attacks, or internet outage.'],
  ['15. Indemnity Clause',
    'The Partner agrees to indemnify and hold harmless BONORIYA from all liabilities, losses, claims, damages, costs, and legal expenses arising due to Agreement breach, regulatory violation, invalid licenses, property disputes, guest disputes, fraud, or tax non-compliance. The Partner shall bear all legal and financial consequences.'],
  ['16. Electronic Acceptance & Digital Consent',
    'This Agreement is executed electronically. By registering as a Partner on BONORIYA platform and clicking "I AGREE TO THE TERMS & CONDITIONS", the Partner confirms they have read this Agreement in full, understand all terms, and agree to be legally bound. No physical signature is required. Electronic acceptance has full legal validity under the Information Technology Act, 2000.'],
  ['17. Electronic Communication Consent',
    'The Partner agrees to receive all communications electronically through Email, WhatsApp, SMS, and BONORIYA platform notifications including agreement copy, updates, notices, payment communication, and policy changes.'],
  ['18. Agreement Record & Audit Trail',
    'BONORIYA shall maintain digital records of agreement acceptance including: Partner Name, Email ID, Mobile Number, Property Name, Date & Time of Acceptance, IP Address, and Device Details. This digital audit trail serves as legally valid proof of acceptance under applicable laws.'],
];

// ── Build PDF using jsPDF text API (reliable — no canvas/CORS dependencies) ──
async function buildAgreementPDF(data: PartnerAgreementData): Promise<Blob> {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = 210;
  const margin = 15;
  const colW = pageW - margin * 2;
  let y = 0;

  const newPageIfNeeded = (needed = 12) => {
    if (y + needed > 280) { doc.addPage(); y = 20; }
  };

  const text = (t: string, size: number, bold = false, colorHex = '#000000', align: 'left' | 'center' = 'left') => {
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    const r = parseInt(colorHex.slice(1,3),16), g = parseInt(colorHex.slice(3,5),16), b = parseInt(colorHex.slice(5,7),16);
    doc.setTextColor(r, g, b);
    const lines = doc.splitTextToSize(t, align === 'center' ? colW : colW);
    lines.forEach((line: string) => {
      newPageIfNeeded(size * 0.4 + 2);
      doc.text(line, align === 'center' ? pageW / 2 : margin, y, { align });
      y += size * 0.42;
    });
    y += 1.5;
  };

  const divider = () => {
    newPageIfNeeded(6);
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageW - margin, y);
    y += 5;
  };

  // ── Cover header ────────────────────────────────────────────────────────────
  doc.setFillColor(15, 34, 24);
  doc.rect(0, 0, 210, 42, 'F');

  doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
  doc.text('BONORIYA', pageW / 2, 14, { align: 'center' });

  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text('Off-beat Tourism  ·  Prefab Cottages  ·  Northeast India', pageW / 2, 21, { align: 'center' });

  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text('DIGITAL PARTNER AGREEMENT', pageW / 2, 31, { align: 'center' });

  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(200, 220, 210);
  doc.text('Terms & Conditions for Partner Registration and Platform Listing', pageW / 2, 38, { align: 'center' });

  y = 52;

  const dateStr = new Date(data.acceptedAt).toLocaleString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
  });

  // ── Parties section ─────────────────────────────────────────────────────────
  text('AGREEMENT PARTIES', 11, true, '#0F2218');
  divider();
  text('Party 1 (Platform):', 10, true);
  text('BONORIYA  |  info@bonoriya.com  |  +91-9864282966  |  bonoriya.com', 10);
  y += 3;
  text('Party 2 (Partner):', 10, true);
  text(`Name      : ${data.partnerName}`, 10);
  text(`Business  : ${data.businessName}`, 10);
  text(`Email     : ${data.email}`, 10);
  text(`Mobile    : ${data.mobile}`, 10);
  if (data.address) text(`Address   : ${data.address}`, 10);
  if (data.gstNumber) text(`GST No.   : ${data.gstNumber}`, 10);
  text(`Accepted  : ${dateStr}`, 10);
  y += 4;

  text('SCOPE OF AGREEMENT', 11, true, '#0F2218');
  divider();
  text('This Agreement governs the listing, promotion, booking, and management of properties, rooms, stays, homestays, resorts, eco-tourism units, day-trip venues, and hospitality services listed on BONORIYA platform.', 10);
  y += 3;

  // ── Clauses ─────────────────────────────────────────────────────────────────
  text('TERMS & CONDITIONS', 11, true, '#0F2218');
  divider();

  AGREEMENT_CLAUSES.forEach(([title, body]) => {
    newPageIfNeeded(20);
    text(title, 10, true, '#0F2218');
    text(body, 9.5);
    y += 2;
  });

  // ── Acceptance block ────────────────────────────────────────────────────────
  newPageIfNeeded(40);
  divider();
  y += 2;

  doc.setFillColor(15, 34, 24);
  doc.rect(margin, y, colW, 32, 'F');
  doc.setTextColor(255, 255, 255);

  doc.setFontSize(12); doc.setFont('helvetica', 'bold');
  doc.text('✓ DIGITAL ACCEPTANCE CONFIRMED', pageW / 2, y + 9, { align: 'center' });

  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text(`Partner: ${data.partnerName}   |   Business: ${data.businessName}`, pageW / 2, y + 16, { align: 'center' });
  doc.text(`Email: ${data.email}   |   Mobile: ${data.mobile}`, pageW / 2, y + 21, { align: 'center' });
  doc.text(`Accepted On: ${dateStr}`, pageW / 2, y + 27, { align: 'center' });

  y += 38;

  doc.setTextColor(140, 140, 140); doc.setFontSize(8);
  doc.text('BONORIYA  ·  info@bonoriya.com  ·  +91-9864282966  ·  bonoriya.com', pageW / 2, y, { align: 'center' });
  doc.text('This is a computer-generated document. No physical signature required.', pageW / 2, y + 5, { align: 'center' });

  return doc.output('blob');
}

// ── Convert Blob to base64 string ────────────────────────────────────────────
async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // strip "data:application/pdf;base64," prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Generate the PDF, upload to Supabase Storage, return { blob, publicUrl }.
 */
export async function generateAndUploadAgreementPDF(
  data: PartnerAgreementData
): Promise<{ blob: Blob; publicUrl: string | null }> {
  const blob = await buildAgreementPDF(data);

  try {
    const { supabase } = await import('./db');
    const safeEmail = data.email.replace(/[@.]/g, '_');
    const fileName = `agreements/${safeEmail}_${Date.now()}.pdf`;

    const { error } = await supabase.storage
      .from('bonoriya-assets')
      .upload(fileName, blob, { contentType: 'application/pdf', upsert: true });

    if (error) {
      console.error('[Agreement PDF upload]', error.message);
      return { blob, publicUrl: null };
    }

    const { data: urlData } = supabase.storage.from('bonoriya-assets').getPublicUrl(fileName);
    console.log('[Agreement PDF] ✓ Uploaded →', urlData.publicUrl);
    return { blob, publicUrl: urlData.publicUrl };
  } catch (e) {
    console.error('[generateAndUploadAgreementPDF storage]', e);
    return { blob, publicUrl: null };
  }
}

/**
 * Send the signed agreement as a PDF ATTACHMENT to both:
 *   1. The new partner (their registration email)
 *   2. info@bonoriya.com (BONORIYA's info inbox)
 *
 * Primary: Supabase Edge Function → Resend (real attachment)
 * Fallback: EmailJS → download link in email body
 */
export async function sendPartnerAgreementEmail(
  data: PartnerAgreementData,
  pdf: { blob: Blob; publicUrl: string | null } | string | null
): Promise<void> {
  // Normalise legacy string-only calls (backward compat)
  const pdfBlob = pdf && typeof pdf === 'object' && 'blob' in pdf ? pdf.blob : null;
  const pdfUrl  = pdf && typeof pdf === 'object' && 'publicUrl' in pdf
    ? pdf.publicUrl
    : (typeof pdf === 'string' ? pdf : null);

  const partnerName = data.partnerName;
  const fileName = `BONORIYA_Partner_Agreement_${partnerName.replace(/\s+/g, '_')}.pdf`;

  // ── Attempt 1: Edge Function (true PDF attachment via Resend) ──────────────
  try {
    const { supabase } = await import('./db');
    let pdfBase64 = '';

    if (pdfBlob) {
      pdfBase64 = await blobToBase64(pdfBlob);
    } else if (pdfUrl) {
      // Download from Supabase Storage so edge function can attach it
      const resp = await fetch(pdfUrl);
      const blob = await resp.blob();
      pdfBase64 = await blobToBase64(blob);
    }

    if (pdfBase64) {
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        'send-agreement-email',
        {
          body: {
            ...data,
            pdfBase64,
            pdfFileName: fileName,
            pdfPublicUrl: pdfUrl,
          },
        }
      );

      if (!fnError && fnData?.success) {
        console.log('[Agreement] ✓✓ Both emails sent with PDF attachment via Resend');
        return;
      }
      console.warn('[Agreement] Edge Function failed, falling back to EmailJS:', fnError);
    }
  } catch (e) {
    console.warn('[Agreement] Edge Function unavailable, falling back to EmailJS:', e);
  }

  // ── Fallback 2: EmailJS (download link, no attachment) ────────────────────
  try {
    const { getEmailConfig } = await import('./auth');
    const cfg = getEmailConfig();

    if (!cfg.serviceId) {
      console.warn('[Agreement Email] No email service configured. Agreement recorded for:', data.email, '| PDF:', pdfUrl);
      return;
    }

    const dateStr = new Date(data.acceptedAt).toLocaleString('en-IN', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true
    });

    const downloadSection = pdfUrl
      ? `<table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:20px auto;">
           <tr><td align="center" style="border-radius:8px;background:#0F2218;">
             <a href="${pdfUrl}" target="_blank" style="display:inline-block;padding:12px 28px;color:#fff;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;">
               📄 Download Partnership Agreement PDF
             </a>
           </td></tr>
         </table>
         <p style="font-size:12px;color:#888;text-align:center;font-family:Arial,sans-serif;">Direct link: <a href="${pdfUrl}" style="color:#0F2218;">${pdfUrl}</a></p>`
      : '<p style="font-family:Arial,sans-serif;font-size:13px;color:#666;">Agreement recorded. PDF will be sent separately.</p>';

    const makeHtml = (heading: string) => `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN">
<html xmlns="http://www.w3.org/1999/xhtml"><head><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f5f7f5;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#f5f7f5;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="max-width:600px;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
  <tr><td align="center" style="background:#000000;padding:26px 24px 18px;">
    <a href="https://bonoriya.com" style="text-decoration:none;border:0;display:block;">
      <img src="https://mltpbbbauvluhhddteoy.supabase.co/storage/v1/object/public/bonoriya-assets/bonoriya-b-logo.png"
        alt="BONORIYA" width="72" border="0" style="display:block;width:72px;height:auto;margin:0 auto 10px;border-radius:10px;"/>
    </a>
    <p style="color:#ffffff;font-size:18px;font-weight:bold;letter-spacing:3px;margin:0 0 4px;text-transform:uppercase;font-family:Arial,sans-serif;">BONORIYA</p>
    <p style="color:#F0A010;font-size:10px;margin:0;letter-spacing:0.6px;font-family:Arial,sans-serif;">
      Off-beat Tourism &bull; Prefab Cottages &bull; Northeast India
    </p>
  </td></tr>
  <tr><td style="padding:32px 36px 24px;font-family:Arial,sans-serif;">
    <h2 style="color:#0F2218;font-size:18px;margin:0 0 14px;">${heading}</h2>
    <p style="font-size:14px;color:#333;margin:0 0 10px;">Dear <strong>${partnerName}</strong>,</p>
    <p style="font-size:14px;color:#444;line-height:1.7;margin:0 0 16px;">
      ${heading.includes('New Partner')
        ? 'A new partner has registered on BONORIYA. Details below:'
        : 'Congratulations on registering as a BONORIYA Partner. Your application is under review and you will be notified upon approval within 24–48 hours.'}
    </p>
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 16px;">
      <tr><td style="background:#f0fdf4;border:1px solid #86efac;border-radius:8px;padding:14px 16px;font-size:13px;color:#166534;line-height:1.9;font-family:Arial,sans-serif;">
        <strong>Partner:</strong> ${partnerName}<br/>
        <strong>Business:</strong> ${data.businessName}<br/>
        <strong>Email:</strong> ${data.email}<br/>
        <strong>Mobile:</strong> ${data.mobile}<br/>
        ${data.address ? `<strong>Address:</strong> ${data.address}<br/>` : ''}
        ${data.gstNumber ? `<strong>GST No.:</strong> ${data.gstNumber}<br/>` : ''}
        <strong>Accepted On:</strong> ${dateStr}
      </td></tr>
    </table>
    <p style="font-size:14px;color:#444;margin:0 0 8px;font-family:Arial,sans-serif;">
      Your <strong>Digital Partnership Agreement</strong> is ready. Download it here:
    </p>
    ${downloadSection}
    <p style="font-size:13px;color:#555;margin:18px 0 0;font-family:Arial,sans-serif;">
      For any queries: <strong>info@bonoriya.com</strong> | <strong>+91-9864282966</strong>
    </p>
  </td></tr>
  <tr><td style="padding:0 36px;"><hr style="border:none;border-top:1px solid #e5e7eb;margin:0;"/></td></tr>
  <tr><td style="background:#000000;padding:16px 36px;text-align:center;font-family:Arial,sans-serif;">
    <p style="color:#ffffff;font-size:12px;font-weight:bold;letter-spacing:2px;margin:0 0 3px;text-transform:uppercase;">BONORIYA</p>
    <p style="color:#F0A010;font-size:10px;margin:0 0 8px;">Off-beat Tourism &bull; Prefab Cottages &bull; Northeast India</p>
    <p style="color:#9ca3af;font-size:11px;margin:2px 0;">
      <a href="mailto:info@bonoriya.com" style="color:#F0A010;text-decoration:none;">info@bonoriya.com</a>
      &bull; +91-9864282966 &bull;
      <a href="https://bonoriya.com" style="color:#9ca3af;text-decoration:none;">bonoriya.com</a>
    </p>
    <p style="color:#6b7280;font-size:10px;margin:4px 0 0;">Guwahati, Assam, India &bull; &copy; 2026 BONORIYA. All rights reserved.</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;

    const ejs = await import('@emailjs/browser');

    // Send to partner
    await ejs.send(cfg.serviceId, cfg.templateId, {
      to_email: data.email,
      from_name: 'BONORIYA',
      reply_to: BONORIYA_INFO_EMAIL,
      subject: '[BONORIYA] Welcome — Your Digital Partnership Agreement',
      html_message: makeHtml('Welcome to BONORIYA Partner Network!'),
      plain_message: `Dear ${partnerName}, welcome to BONORIYA! Your agreement PDF: ${pdfUrl || 'Contact info@bonoriya.com'}`,
    }, { publicKey: cfg.publicKey });
    console.log('[Agreement EmailJS] ✓ Sent to partner:', data.email);

    // Send to BONORIYA info@
    await ejs.send(cfg.serviceId, cfg.templateId, {
      to_email: BONORIYA_INFO_EMAIL,
      from_name: 'BONORIYA System',
      reply_to: data.email,
      subject: `[BONORIYA] New Partner — ${partnerName} | ${data.businessName} — Agreement Signed`,
      html_message: makeHtml(`New Partner Registration — ${partnerName}`),
      plain_message: `New partner: ${partnerName}, ${data.businessName}, ${data.email}, ${data.mobile}. PDF: ${pdfUrl}`,
    }, { publicKey: cfg.publicKey });
    console.log('[Agreement EmailJS] ✓ Sent to BONORIYA:', BONORIYA_INFO_EMAIL);

  } catch (e) {
    console.error('[sendPartnerAgreementEmail]', e);
  }
}
