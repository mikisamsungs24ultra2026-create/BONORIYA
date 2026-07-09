/**
 * BONORIYA Notification System
 *
 * Supports multiple notification channels:
 *
 * ── CHANNEL 1: Telegram Bot (RECOMMENDED — Free, 100% reliable) ────────────
 *   Setup (5 minutes):
 *   1. Open Telegram → search @BotFather → send /newbot
 *   2. Follow prompts → get Bot Token (e.g. 7123456789:AAF...)
 *   3. Start a chat with your new bot (search its name, click Start)
 *   4. Get your Chat ID: open https://api.telegram.org/bot<TOKEN>/getUpdates
 *      after sending any message to the bot — look for "chat":{"id":XXXXXXXX}
 *   5. Enter Bot Token + Chat ID in Admin → Settings → Notifications
 *   No approval, no activation, no API key request — works instantly.
 *
 * ── CHANNEL 2: WhatsApp via UltraMsg (Paid — $10/month, very reliable) ─────
 *   Setup: https://ultramsg.com → Create Instance → get Instance ID + Token
 *
 * ── CHANNEL 3: WhatsApp via Green API (Free 1,000 msg/month) ──────────────
 *   Setup: https://green-api.com → Create Instance → get Instance ID + API token
 *   Connect your WhatsApp by scanning QR code in their dashboard.
 *
 * ── CHANNEL 4: CallMeBot (Legacy — kept for compatibility) ─────────────────
 *   Unreliable activation. Use Telegram instead.
 */

const NOTIF_CONFIG_KEY = 'bonoriya_notification_config';

export interface NotificationConfig {
  enabled: boolean;

  // ── Telegram (recommended) ──────────────────────────────────────────────
  telegramEnabled: boolean;
  telegramBotToken: string;   // from @BotFather, e.g. "7123456789:AAFxxx"
  telegramChatId1: string;    // admin 1 chat ID (numeric, e.g. "123456789")
  telegramChatId2: string;    // admin 2 chat ID

  // ── WhatsApp via UltraMsg ───────────────────────────────────────────────
  ultraMsgEnabled: boolean;
  ultraMsgInstanceId: string; // from ultramsg.com dashboard
  ultraMsgToken: string;      // instance token
  ultraMsgPhone1: string;     // +919864282966
  ultraMsgPhone2: string;     // +919508776404

  // ── WhatsApp via Green API ──────────────────────────────────────────────
  greenApiEnabled: boolean;
  greenApiInstanceId: string;
  greenApiToken: string;
  greenApiPhone1: string;
  greenApiPhone2: string;

  // ── CallMeBot (legacy) ──────────────────────────────────────────────────
  callMeBotEnabled: boolean;
  admin1Phone: string;
  admin1ApiKey: string;
  admin2Phone: string;
  admin2ApiKey: string;
}

const DEFAULTS: NotificationConfig = {
  enabled: false,
  telegramEnabled: false,
  telegramBotToken: '',
  telegramChatId1: '',
  telegramChatId2: '',
  ultraMsgEnabled: false,
  ultraMsgInstanceId: '',
  ultraMsgToken: '',
  ultraMsgPhone1: '+919864282966',
  ultraMsgPhone2: '+919508776404',
  greenApiEnabled: false,
  greenApiInstanceId: '',
  greenApiToken: '',
  greenApiPhone1: '+919864282966',
  greenApiPhone2: '+919508776404',
  callMeBotEnabled: false,
  admin1Phone: '+919864282966',
  admin1ApiKey: '',
  admin2Phone: '+919508776404',
  admin2ApiKey: '',
};

export const getWhatsAppConfig = (): NotificationConfig => {
  const stored = localStorage.getItem(NOTIF_CONFIG_KEY);
  // Also check old key for backward compat
  const oldStored = localStorage.getItem('bonoriya_whatsapp_config');
  if (stored) return { ...DEFAULTS, ...JSON.parse(stored) };
  if (oldStored) {
    const old = JSON.parse(oldStored);
    return {
      ...DEFAULTS,
      enabled: old.enabled ?? false,
      callMeBotEnabled: !!(old.admin1ApiKey || old.admin2ApiKey),
      admin1Phone: old.admin1Phone ?? DEFAULTS.admin1Phone,
      admin1ApiKey: old.admin1ApiKey ?? '',
      admin2Phone: old.admin2Phone ?? DEFAULTS.admin2Phone,
      admin2ApiKey: old.admin2ApiKey ?? '',
    };
  }
  return { ...DEFAULTS };
};

export const saveWhatsAppConfig = (cfg: NotificationConfig): void => {
  localStorage.setItem(NOTIF_CONFIG_KEY, JSON.stringify(cfg));
};

// ── Telegram ─────────────────────────────────────────────────────────────────

async function sendViaTelegram(token: string, chatId: string, message: string): Promise<boolean> {
  if (!token || !chatId) return false;
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' }),
      }
    );
    const json = await res.json();
    if (json.ok) { console.log(`[Telegram ✓ → ${chatId}]`); return true; }
    console.warn(`[Telegram ✗]`, json.description);
    return false;
  } catch (e) {
    console.warn(`[Telegram ERROR]`, e);
    return false;
  }
}

// ── UltraMsg (WhatsApp) ───────────────────────────────────────────────────────

async function sendViaUltraMsg(instanceId: string, token: string, phone: string, message: string): Promise<boolean> {
  if (!instanceId || !token || !phone) return false;
  try {
    const res = await fetch(
      `https://api.ultramsg.com/${instanceId}/messages/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ token, to: phone, body: message }).toString(),
      }
    );
    const json = await res.json();
    if (json.sent === 'true' || json.sent === true) { console.log(`[UltraMsg ✓ → ${phone}]`); return true; }
    console.warn(`[UltraMsg ✗]`, json);
    return false;
  } catch (e) {
    console.warn(`[UltraMsg ERROR]`, e);
    return false;
  }
}

// ── Green API (WhatsApp) ──────────────────────────────────────────────────────

async function sendViaGreenApi(instanceId: string, token: string, phone: string, message: string): Promise<boolean> {
  if (!instanceId || !token || !phone) return false;
  try {
    const chatId = phone.replace(/^\+/, '') + '@c.us';
    const res = await fetch(
      `https://api.green-api.com/waInstance${instanceId}/sendMessage/${token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, message }),
      }
    );
    const json = await res.json();
    if (json.idMessage) { console.log(`[GreenAPI ✓ → ${phone}]`); return true; }
    console.warn(`[GreenAPI ✗]`, json);
    return false;
  } catch (e) {
    console.warn(`[GreenAPI ERROR]`, e);
    return false;
  }
}

// ── CallMeBot (legacy) ────────────────────────────────────────────────────────

async function sendViaCallMeBot(phone: string, apiKey: string, message: string): Promise<boolean> {
  if (!phone || !apiKey) return false;
  try {
    await fetch(
      `https://api.callmebot.com/whatsapp.php?phone=${phone.replace('+', '')}&text=${encodeURIComponent(message)}&apikey=${apiKey}`,
      { mode: 'no-cors' }
    );
    console.log(`[CallMeBot ✓ → ${phone}]`);
    return true;
  } catch (e) {
    console.warn(`[CallMeBot ERROR]`, e);
    return false;
  }
}

// ── Master dispatcher ─────────────────────────────────────────────────────────

async function notifyAdmins(message: string): Promise<void> {
  const cfg = getWhatsAppConfig();
  if (!cfg.enabled) { console.log('[Notifications disabled]', message.slice(0, 60)); return; }

  const tasks: Promise<boolean>[] = [];

  // 1. Telegram (fastest + most reliable)
  if (cfg.telegramEnabled && cfg.telegramBotToken) {
    if (cfg.telegramChatId1) tasks.push(sendViaTelegram(cfg.telegramBotToken, cfg.telegramChatId1, message));
    if (cfg.telegramChatId2) tasks.push(sendViaTelegram(cfg.telegramBotToken, cfg.telegramChatId2, message));
  }

  // 2. UltraMsg WhatsApp
  if (cfg.ultraMsgEnabled && cfg.ultraMsgInstanceId && cfg.ultraMsgToken) {
    if (cfg.ultraMsgPhone1) tasks.push(sendViaUltraMsg(cfg.ultraMsgInstanceId, cfg.ultraMsgToken, cfg.ultraMsgPhone1, message));
    if (cfg.ultraMsgPhone2 && cfg.ultraMsgPhone2 !== cfg.ultraMsgPhone1)
      tasks.push(sendViaUltraMsg(cfg.ultraMsgInstanceId, cfg.ultraMsgToken, cfg.ultraMsgPhone2, message));
  }

  // 3. Green API WhatsApp
  if (cfg.greenApiEnabled && cfg.greenApiInstanceId && cfg.greenApiToken) {
    if (cfg.greenApiPhone1) tasks.push(sendViaGreenApi(cfg.greenApiInstanceId, cfg.greenApiToken, cfg.greenApiPhone1, message));
    if (cfg.greenApiPhone2 && cfg.greenApiPhone2 !== cfg.greenApiPhone1)
      tasks.push(sendViaGreenApi(cfg.greenApiInstanceId, cfg.greenApiToken, cfg.greenApiPhone2, message));
  }

  // 4. CallMeBot (legacy fallback)
  if (cfg.callMeBotEnabled) {
    if (cfg.admin1Phone && cfg.admin1ApiKey) tasks.push(sendViaCallMeBot(cfg.admin1Phone, cfg.admin1ApiKey, message));
    if (cfg.admin2Phone && cfg.admin2ApiKey) tasks.push(sendViaCallMeBot(cfg.admin2Phone, cfg.admin2ApiKey, message));
  }

  if (tasks.length > 0) await Promise.allSettled(tasks);
}

// ─── Notification message templates ──────────────────────────────────────────

export const WA = {
  newBooking: (b: { bookingRef: string; guestName: string; propertyName: string; roomType?: string; adults: number; children: number; checkIn: string; checkOut: string; totalAmount: number }) => {
    notifyAdmins(`🏨 NEW BOOKING ALERT\n\nID: ${b.bookingRef}\nGuest: ${b.guestName}\nProperty: ${b.propertyName}${b.roomType ? `\nRoom: ${b.roomType}` : ''}\nGuests: ${b.adults + b.children}\nCheck-in: ${b.checkIn}\nCheck-out: ${b.checkOut}\nAmount: ₹${b.totalAmount.toLocaleString()}\n\n— BONORIYA`);
  },
  bookingCancelled: (b: { bookingRef: string; guestName: string; propertyName: string; totalAmount: number }) => {
    notifyAdmins(`❌ BOOKING CANCELLED\n\nID: ${b.bookingRef}\nGuest: ${b.guestName}\nProperty: ${b.propertyName}\nAmount: ₹${b.totalAmount.toLocaleString()}\n\n— BONORIYA`);
  },
  newDayTrip: (b: { bookingRef: string; guestName: string; tripDate: string; adults: number; children: number; mealOption?: string; totalAmount: number }) => {
    notifyAdmins(`🌿 NEW DAY TRIP BOOKING\n\nID: ${b.bookingRef}\nGuest: ${b.guestName}\nDate: ${b.tripDate}\nGuests: ${b.adults + b.children}${b.mealOption ? `\nMeal: ${b.mealOption}` : ''}\nAmount: ₹${b.totalAmount.toLocaleString()}\n\n— BONORIYA`);
  },
  dayTripCancelled: (b: { bookingRef: string; guestName: string; tripDate: string }) => {
    notifyAdmins(`❌ DAY TRIP CANCELLED\n\nID: ${b.bookingRef}\nGuest: ${b.guestName}\nDate: ${b.tripDate}\n\n— BONORIYA`);
  },
  newPartner: (p: { name: string; businessName: string; email: string }) => {
    notifyAdmins(`👤 NEW PARTNER REGISTRATION\n\nName: ${p.name}\nBusiness: ${p.businessName}\nEmail: ${p.email}\n\nReview: Admin Panel → Approvals\n\n— BONORIYA`);
  },
  partnerApproved: (p: { name: string; businessName: string }) => {
    notifyAdmins(`✅ PARTNER APPROVED\n\n${p.name} (${p.businessName}) has been approved.\n\n— BONORIYA`);
  },
  newProperty: (p: { name: string; location: string; partnerName: string }) => {
    notifyAdmins(`🏡 NEW PROPERTY LISTED\n\nProperty: ${p.name}\nLocation: ${p.location}\nPartner: ${p.partnerName}\n\n— BONORIYA`);
  },
};
