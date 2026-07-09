import { useState } from 'react';
import { CheckCircle, AlertCircle, ExternalLink, Send, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';
import { getWhatsAppConfig, saveWhatsAppConfig, type NotificationConfig } from '../utils/whatsapp';

type Tab = 'telegram' | 'ultramsg' | 'greenapi' | 'callmebot';

export default function WhatsAppConfigPanel() {
  const [form, setForm]       = useState<NotificationConfig>(getWhatsAppConfig);
  const [saved, setSaved]     = useState(false);
  const [testing, setTesting] = useState<Tab | null>(null);
  const [testResult, setTestResult] = useState('');
  const [activeTab, setActiveTab]   = useState<Tab>('telegram');

  const upd = (patch: Partial<NotificationConfig>) => setForm(f => ({ ...f, ...patch }));

  const save = () => { saveWhatsAppConfig(form); setSaved(true); setTimeout(() => setSaved(false), 2500); };

  const hasAnyChannel = form.enabled && (
    (form.telegramEnabled && form.telegramBotToken && form.telegramChatId1) ||
    (form.ultraMsgEnabled && form.ultraMsgInstanceId && form.ultraMsgToken && form.ultraMsgPhone1) ||
    (form.greenApiEnabled && form.greenApiInstanceId && form.greenApiToken && form.greenApiPhone1) ||
    (form.callMeBotEnabled && form.admin1ApiKey)
  );

  const sendTest = async (tab: Tab) => {
    setTesting(tab); setTestResult('');
    const msg = '✅ BONORIYA notification test — this channel is working!';

    try {
      if (tab === 'telegram') {
        if (!form.telegramBotToken || !form.telegramChatId1) { setTestResult('❌ Enter Bot Token and Chat ID first.'); return; }
        const res = await fetch(`https://api.telegram.org/bot${form.telegramBotToken}/sendMessage`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: form.telegramChatId1, text: msg }),
        });
        const json = await res.json();
        setTestResult(json.ok ? '✅ Telegram message delivered! Check your Telegram.' : `❌ Telegram error: ${json.description}`);
      }

      if (tab === 'ultramsg') {
        if (!form.ultraMsgInstanceId || !form.ultraMsgToken || !form.ultraMsgPhone1) { setTestResult('❌ Fill in all UltraMsg fields first.'); return; }
        const res = await fetch(`https://api.ultramsg.com/${form.ultraMsgInstanceId}/messages/chat`, {
          method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ token: form.ultraMsgToken, to: form.ultraMsgPhone1, body: msg }).toString(),
        });
        const json = await res.json();
        setTestResult(json.sent === 'true' || json.sent === true ? '✅ WhatsApp message sent via UltraMsg!' : `❌ UltraMsg error: ${JSON.stringify(json)}`);
      }

      if (tab === 'greenapi') {
        if (!form.greenApiInstanceId || !form.greenApiToken || !form.greenApiPhone1) { setTestResult('❌ Fill in all Green API fields first.'); return; }
        const chatId = form.greenApiPhone1.replace(/^\+/, '') + '@c.us';
        const res = await fetch(`https://api.green-api.com/waInstance${form.greenApiInstanceId}/sendMessage/${form.greenApiToken}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chatId, message: msg }),
        });
        const json = await res.json();
        setTestResult(json.idMessage ? '✅ WhatsApp message sent via Green API!' : `❌ Green API error: ${JSON.stringify(json)}`);
      }

      if (tab === 'callmebot') {
        if (!form.admin1Phone || !form.admin1ApiKey) { setTestResult('❌ Enter phone and API key first.'); return; }
        await fetch(`https://api.callmebot.com/whatsapp.php?phone=${form.admin1Phone.replace('+','')}&text=${encodeURIComponent(msg)}&apikey=${form.admin1ApiKey}`, { mode: 'no-cors' });
        setTestResult('✅ Sent to CallMeBot (no-cors — check your WhatsApp)');
      }
    } catch (e) {
      setTestResult(`❌ Error: ${String(e)}`);
    } finally {
      setTesting(null);
    }
  };

  const TabBtn = ({ id, label, badge }: { id: Tab; label: string; badge?: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all whitespace-nowrap ${
        activeTab === id
          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
          : 'bg-white border-border text-muted-foreground hover:text-foreground hover:border-primary/30'
      }`}
    >
      {label}
      {badge && <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === id ? 'bg-white/20' : 'bg-green-100 text-green-700'}`}>{badge}</span>}
    </button>
  );

  const Field = ({ label, value, onChange, placeholder, type = 'text', hint }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; hint?: string }) => (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1">{label}</label>
      <input type={type} className="w-full px-3 py-2.5 border border-border rounded-lg bg-input-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={value} onChange={e => onChange(e.target.value.trim())} placeholder={placeholder} />
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
    </div>
  );

  return (
    <div className="space-y-5">

      {/* Status banner */}
      <div className={`p-4 rounded-xl border flex items-start gap-3 ${hasAnyChannel ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        {hasAnyChannel
          ? <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          : <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
        }
        <div className="flex-1">
          <p className={`font-semibold text-sm ${hasAnyChannel ? 'text-green-800' : 'text-amber-800'}`}>
            {hasAnyChannel ? 'Notifications ACTIVE' : 'No notification channel configured'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {hasAnyChannel
              ? 'BONORIYA will send instant alerts for bookings, partners and cancellations.'
              : 'Set up Telegram (free, instant) or WhatsApp below to receive real-time alerts.'}
          </p>
        </div>
        <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
          <div onClick={() => upd({ enabled: !form.enabled })}
            className={`relative w-11 h-6 rounded-full transition-colors ${form.enabled ? 'bg-primary' : 'bg-gray-300'}`}>
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.enabled ? 'translate-x-5' : ''}`} />
          </div>
          <span className="text-sm text-muted-foreground">{form.enabled ? 'On' : 'Off'}</span>
        </label>
      </div>

      {/* Channel tabs */}
      <div className="flex flex-wrap gap-2">
        <TabBtn id="telegram" label="📱 Telegram" badge="FREE" />
        <TabBtn id="ultramsg" label="💬 UltraMsg (WhatsApp)" />
        <TabBtn id="greenapi" label="🟢 Green API (WhatsApp)" badge="Free tier" />
        <TabBtn id="callmebot" label="📟 CallMeBot (Legacy)" />
      </div>

      {/* ── TELEGRAM ── */}
      {activeTab === 'telegram' && (
        <div className="bg-white rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold flex items-center gap-2">
                <span className="text-lg">📱</span> Telegram Bot
                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">Recommended — 100% Free</span>
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">Instant, reliable, no activation needed. Much better than WhatsApp for automated alerts.</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
              <div onClick={() => upd({ telegramEnabled: !form.telegramEnabled })}
                className={`relative w-10 h-6 rounded-full transition-colors ${form.telegramEnabled ? 'bg-primary' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.telegramEnabled ? 'translate-x-4' : ''}`} />
              </div>
            </label>
          </div>

          {/* Setup guide */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-blue-800 mb-2">⚡ 5-Minute Setup</p>
            <ol className="text-sm text-blue-700 space-y-1.5 list-decimal list-inside">
              <li>Open Telegram → search <strong>@BotFather</strong> → send <code className="bg-blue-100 px-1 rounded text-xs">/newbot</code></li>
              <li>Choose a name and username → BotFather gives you a <strong>Bot Token</strong></li>
              <li>Search for your new bot in Telegram → click <strong>Start</strong></li>
              <li>Get your Chat ID: visit<br/>
                <code className="bg-blue-100 px-1 rounded text-xs break-all">https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code><br/>
                Send any message to the bot first, then visit this URL. Find <code className="bg-blue-100 px-1 rounded text-xs">"id"</code> inside <code className="bg-blue-100 px-1 rounded text-xs">"chat"</code>
              </li>
              <li>Paste Token + Chat ID below</li>
            </ol>
            <a href="https://core.telegram.org/bots#botfather" target="_blank" rel="noreferrer"
              className="text-xs text-blue-600 underline mt-2 inline-flex items-center gap-0.5">
              Telegram Bot docs <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <Field label="Bot Token (from @BotFather)"
            value={form.telegramBotToken}
            onChange={v => upd({ telegramBotToken: v })}
            placeholder="7123456789:AAFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            hint="Keep this secret — it controls your bot" />
          <Field label="Admin 1 Chat ID"
            value={form.telegramChatId1}
            onChange={v => upd({ telegramChatId1: v })}
            placeholder="123456789"
            hint="Numeric ID from getUpdates API" />
          <Field label="Admin 2 Chat ID (optional)"
            value={form.telegramChatId2}
            onChange={v => upd({ telegramChatId2: v })}
            placeholder="987654321" />

          {testResult && activeTab === 'telegram' && (
            <div className={`p-3 rounded-lg text-sm ${testResult.startsWith('✅') ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>{testResult}</div>
          )}
          <div className="flex gap-3">
            <button onClick={save} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90">
              {saved ? <><CheckCircle className="h-4 w-4" /> Saved!</> : 'Save'}
            </button>
            <button onClick={() => sendTest('telegram')} disabled={testing === 'telegram'} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted disabled:opacity-50">
              <Send className="h-4 w-4" /> {testing === 'telegram' ? 'Sending…' : 'Test Telegram'}
            </button>
          </div>
        </div>
      )}

      {/* ── ULTRAMSG ── */}
      {activeTab === 'ultramsg' && (
        <div className="bg-white rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold flex items-center gap-2"><span className="text-lg">💬</span> UltraMsg — WhatsApp</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Very reliable WhatsApp API. $10/month. No WhatsApp Business account needed.</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
              <div onClick={() => upd({ ultraMsgEnabled: !form.ultraMsgEnabled })}
                className={`relative w-10 h-6 rounded-full transition-colors ${form.ultraMsgEnabled ? 'bg-primary' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.ultraMsgEnabled ? 'translate-x-4' : ''}`} />
              </div>
            </label>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-orange-800 mb-2">Setup</p>
            <ol className="text-sm text-orange-700 space-y-1 list-decimal list-inside">
              <li>Go to <a href="https://ultramsg.com" target="_blank" rel="noreferrer" className="underline font-medium">ultramsg.com</a> → Create account</li>
              <li>Create new Instance → Scan QR code with your WhatsApp</li>
              <li>Copy Instance ID (e.g. <code className="bg-orange-100 px-1 rounded text-xs">instance12345</code>) and Token</li>
            </ol>
          </div>

          <Field label="Instance ID" value={form.ultraMsgInstanceId} onChange={v => upd({ ultraMsgInstanceId: v })} placeholder="instance12345" />
          <Field label="Token" value={form.ultraMsgToken} onChange={v => upd({ ultraMsgToken: v })} type="password" placeholder="Your UltraMsg token" />
          <Field label="Admin 1 Phone" value={form.ultraMsgPhone1} onChange={v => upd({ ultraMsgPhone1: v })} placeholder="+919864282966" hint="Must be WhatsApp number with country code" />
          <Field label="Admin 2 Phone (optional)" value={form.ultraMsgPhone2} onChange={v => upd({ ultraMsgPhone2: v })} placeholder="+919508776404" />

          {testResult && activeTab === 'ultramsg' && (
            <div className={`p-3 rounded-lg text-sm ${testResult.startsWith('✅') ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>{testResult}</div>
          )}
          <div className="flex gap-3">
            <button onClick={save} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90">
              {saved ? <><CheckCircle className="h-4 w-4" /> Saved!</> : 'Save'}
            </button>
            <button onClick={() => sendTest('ultramsg')} disabled={testing === 'ultramsg'} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted disabled:opacity-50">
              <Send className="h-4 w-4" /> {testing === 'ultramsg' ? 'Sending…' : 'Test UltraMsg'}
            </button>
          </div>
        </div>
      )}

      {/* ── GREEN API ── */}
      {activeTab === 'greenapi' && (
        <div className="bg-white rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold flex items-center gap-2">
                <span className="text-lg">🟢</span> Green API — WhatsApp
                <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">1,000 msg/month free</span>
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">Free tier for personal WhatsApp number. No Business account needed.</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
              <div onClick={() => upd({ greenApiEnabled: !form.greenApiEnabled })}
                className={`relative w-10 h-6 rounded-full transition-colors ${form.greenApiEnabled ? 'bg-primary' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.greenApiEnabled ? 'translate-x-4' : ''}`} />
              </div>
            </label>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-green-800 mb-2">Setup</p>
            <ol className="text-sm text-green-700 space-y-1 list-decimal list-inside">
              <li>Go to <a href="https://green-api.com" target="_blank" rel="noreferrer" className="underline font-medium">green-api.com</a> → Register free</li>
              <li>Create Instance → Scan QR code with WhatsApp</li>
              <li>Copy <strong>idInstance</strong> and <strong>apiTokenInstance</strong></li>
            </ol>
          </div>

          <Field label="Instance ID (idInstance)" value={form.greenApiInstanceId} onChange={v => upd({ greenApiInstanceId: v })} placeholder="1101234567" />
          <Field label="API Token (apiTokenInstance)" value={form.greenApiToken} onChange={v => upd({ greenApiToken: v })} type="password" placeholder="Your Green API token" />
          <Field label="Admin 1 Phone" value={form.greenApiPhone1} onChange={v => upd({ greenApiPhone1: v })} placeholder="+919864282966" hint="With country code, no spaces" />
          <Field label="Admin 2 Phone (optional)" value={form.greenApiPhone2} onChange={v => upd({ greenApiPhone2: v })} placeholder="+919508776404" />

          {testResult && activeTab === 'greenapi' && (
            <div className={`p-3 rounded-lg text-sm ${testResult.startsWith('✅') ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>{testResult}</div>
          )}
          <div className="flex gap-3">
            <button onClick={save} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90">
              {saved ? <><CheckCircle className="h-4 w-4" /> Saved!</> : 'Save'}
            </button>
            <button onClick={() => sendTest('greenapi')} disabled={testing === 'greenapi'} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted disabled:opacity-50">
              <Send className="h-4 w-4" /> {testing === 'greenapi' ? 'Sending…' : 'Test Green API'}
            </button>
          </div>
        </div>
      )}

      {/* ── CALLMEBOT (Legacy) ── */}
      {activeTab === 'callmebot' && (
        <div className="bg-white rounded-xl border border-border p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold flex items-center gap-2">
                <span className="text-lg">📟</span> CallMeBot
                <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">Unreliable — use Telegram instead</span>
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">Free but frequently fails. Kept for backward compatibility only.</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
              <div onClick={() => upd({ callMeBotEnabled: !form.callMeBotEnabled })}
                className={`relative w-10 h-6 rounded-full transition-colors ${form.callMeBotEnabled ? 'bg-primary' : 'bg-gray-300'}`}>
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.callMeBotEnabled ? 'translate-x-4' : ''}`} />
              </div>
            </label>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-yellow-800 mb-1">⚠ Known Issues</p>
            <p className="text-sm text-yellow-700">CallMeBot's activation process often fails or never sends the API key. Their servers go down frequently. We recommend switching to <button onClick={() => setActiveTab('telegram')} className="underline font-medium">Telegram</button> instead.</p>
          </div>

          <div className="p-4 bg-muted/20 rounded-xl border border-border space-y-3">
            <p className="text-sm font-medium">Admin 1</p>
            <Field label="WhatsApp Number" value={form.admin1Phone} onChange={v => upd({ admin1Phone: v })} placeholder="+919864282966" />
            <Field label="CallMeBot API Key" value={form.admin1ApiKey} onChange={v => upd({ admin1ApiKey: v })} type="password" placeholder="API key from CallMeBot" />
          </div>
          <div className="p-4 bg-muted/20 rounded-xl border border-border space-y-3">
            <p className="text-sm font-medium">Admin 2</p>
            <Field label="WhatsApp Number" value={form.admin2Phone} onChange={v => upd({ admin2Phone: v })} placeholder="+919508776404" />
            <Field label="CallMeBot API Key" value={form.admin2ApiKey} onChange={v => upd({ admin2ApiKey: v })} type="password" placeholder="API key from CallMeBot" />
          </div>

          {testResult && activeTab === 'callmebot' && (
            <div className={`p-3 rounded-lg text-sm ${testResult.startsWith('✅') ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>{testResult}</div>
          )}
          <div className="flex gap-3">
            <button onClick={save} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:opacity-90">
              {saved ? <><CheckCircle className="h-4 w-4" /> Saved!</> : 'Save'}
            </button>
            <button onClick={() => sendTest('callmebot')} disabled={testing === 'callmebot'} className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted disabled:opacity-50">
              <Send className="h-4 w-4" /> {testing === 'callmebot' ? 'Sending…' : 'Test CallMeBot'}
            </button>
          </div>
        </div>
      )}

      {/* Event list */}
      <div className="bg-white rounded-xl border border-border p-5">
        <h4 className="font-medium mb-3 flex items-center gap-2"><MessageCircle className="h-4 w-4 text-primary" /> Notification Events</h4>
        <div className="grid md:grid-cols-2 gap-2">
          {['🏨 New stay booking','❌ Booking cancelled','🌿 New day trip booking','❌ Day trip cancelled','👤 New partner registration','✅ Partner approved','🏡 New property listed'].map(e => (
            <div key={e} className="flex items-center gap-2 p-2 bg-muted/20 rounded-lg text-xs text-muted-foreground">{e}</div>
          ))}
        </div>
      </div>

    </div>
  );
}
