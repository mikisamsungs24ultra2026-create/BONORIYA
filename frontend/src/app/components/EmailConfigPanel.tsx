import { useState } from 'react';
import {
  CheckCircle, AlertCircle, Mail, ExternalLink,
  Eye, EyeOff, Copy, Check, Settings2, Send
} from 'lucide-react';
import { getEmailConfig, saveEmailConfig, type EmailConfig } from '../utils/auth';

// ─── Template variable reference ─────────────────────────────────────────────

const TEMPLATE_VARS = [
  { code: 'to_email',      template: '{{to_email}}',      desc: 'Recipient email address' },
  { code: 'from_name',     template: '{{from_name}}',     desc: 'Sender display name (BONORIYA)' },
  { code: 'reply_to',      template: '{{reply_to}}',      desc: 'Reply-to address (admin@bonoriya.com)' },
  { code: 'subject',       template: '{{subject}}',       desc: 'Email subject line' },
  { code: 'html_message',  template: '{{{html_message}}}', desc: 'Full HTML email body (triple braces = raw HTML)' },
  { code: 'plain_message', template: '{{plain_message}}', desc: 'Plain text fallback content' },
];

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text).catch(() => {}); setOk(true); setTimeout(() => setOk(false), 2000); }}
      className="p-1.5 rounded hover:bg-white/20 transition-colors flex-shrink-0"
      title="Copy to clipboard"
    >
      {ok ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
    </button>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function EmailConfigPanel() {
  const [form, setForm]       = useState<EmailConfig>(() => getEmailConfig());
  const [showKey, setShowKey] = useState(false);
  const [msg, setMsg]         = useState('');
  const [isErr, setIsErr]     = useState(false);
  const [saving, setSaving]   = useState(false);
  const [testing, setTesting] = useState(false);

  const flash = (text: string, err = false) => {
    setMsg(text); setIsErr(err);
    setTimeout(() => setMsg(''), 4500);
  };

  const handleSave = () => {
    if (!form.serviceId || !form.templateId || !form.publicKey) {
      flash('Please fill in all three fields (Service ID, Template ID, Public Key).', true);
      return;
    }
    setSaving(true);
    saveEmailConfig(form);
    setTimeout(() => setSaving(false), 800);
    flash('Email configuration saved successfully!');
  };

  const handleTest = async () => {
    if (!form.serviceId || !form.templateId || !form.publicKey) {
      flash('Fill in all three fields before testing.', true);
      return;
    }
    setTesting(true);
    try {
      const ejs = await import('@emailjs/browser');
      await ejs.send(
        form.serviceId,
        form.templateId,
        {
          to_email:      'info@bonoriya.com',
          from_name:     'BONORIYA',
          reply_to:      'admin@bonoriya.com',
          subject:       'BONORIYA — Email System Test ✅',
          html_message:  `<div style="font-family:Arial,sans-serif;padding:24px;background:#f0fdf4;border-radius:8px">
                           <h2 style="color:#166534">✅ Email System Working!</h2>
                           <p style="color:#444">This test confirms BONORIYA email delivery is configured correctly via EmailJS.</p>
                           <p style="color:#888;font-size:13px">Sent from: admin@bonoriya.com</p>
                         </div>`,
          plain_message: 'BONORIYA email system test — delivery is working correctly!',
        },
        { publicKey: form.publicKey }
      );
      flash('✅ Test email sent to info@bonoriya.com — check your inbox!');
    } catch (e: any) {
      flash(`❌ Test failed: ${e?.text || e?.message || JSON.stringify(e)}`, true);
    } finally {
      setTesting(false);
    }
  };

  const isActive = form.enabled && form.serviceId && form.templateId && form.publicKey;

  return (
    <div className="space-y-6">

      {/* ── Live status banner ── */}
      <div className={`flex items-start gap-3 p-4 rounded-xl border ${isActive ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
        {isActive
          ? <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          : <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />}
        <div>
          <p className={`font-semibold text-sm ${isActive ? 'text-green-800' : 'text-amber-800'}`}>
            {isActive
              ? 'Email delivery is ACTIVE — all emails sent via EmailJS from admin@bonoriya.com'
              : 'Email delivery NOT configured — emails are only logged locally'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isActive
              ? 'Welcome emails, OTPs, booking confirmations and status updates are delivered to real inboxes.'
              : 'Complete the setup below to enable real email delivery to guests and partners.'}
          </p>
        </div>
      </div>

      {/* ── Credentials form ── */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
          <h3 className="font-semibold flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            EmailJS Configuration
          </h3>
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <div
              onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))}
              className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer ${form.enabled ? 'bg-primary' : 'bg-gray-300'}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${form.enabled ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-sm font-medium">{form.enabled ? 'Enabled' : 'Disabled'}</span>
          </label>
        </div>

        <div className="p-6 space-y-5">
          {/* Service ID */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Service ID <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full px-3.5 py-2.5 border border-border rounded-lg bg-input-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
              placeholder="service_xxxxxxx"
              value={form.serviceId}
              onChange={e => setForm(f => ({ ...f, serviceId: e.target.value.trim() }))}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Get from <a href="https://dashboard.emailjs.com/admin" target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">EmailJS Dashboard → Email Services <ExternalLink className="h-3 w-3" /></a>
            </p>
          </div>

          {/* Template ID */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Template ID <span className="text-red-500">*</span>
            </label>
            <input
              className="w-full px-3.5 py-2.5 border border-border rounded-lg bg-input-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
              placeholder="template_xxxxxxx"
              value={form.templateId}
              onChange={e => setForm(f => ({ ...f, templateId: e.target.value.trim() }))}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Get from <a href="https://dashboard.emailjs.com/admin/templates" target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">EmailJS Dashboard → Email Templates <ExternalLink className="h-3 w-3" /></a>
            </p>
          </div>

          {/* Public Key */}
          <div>
            <label className="block text-sm font-medium mb-1.5">
              Public Key <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                className="w-full px-3.5 py-2.5 pr-11 border border-border rounded-lg bg-input-background font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                placeholder="Your EmailJS public key"
                value={form.publicKey}
                onChange={e => setForm(f => ({ ...f, publicKey: e.target.value.trim() }))}
              />
              <button
                type="button"
                onClick={() => setShowKey(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Get from <a href="https://dashboard.emailjs.com/admin/account" target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">EmailJS Dashboard → Account → API Keys <ExternalLink className="h-3 w-3" /></a>
            </p>
          </div>

          {/* Feedback message */}
          {msg && (
            <div className={`flex items-start gap-2 p-3.5 rounded-lg text-sm border ${isErr ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-800'}`}>
              {isErr ? <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" /> : <CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />}
              {msg}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 text-sm font-medium disabled:opacity-70 transition-opacity"
            >
              {saving ? <><CheckCircle className="h-4 w-4 animate-pulse" /> Saving…</> : 'Save Configuration'}
            </button>
            <button
              onClick={handleTest}
              disabled={testing}
              className="flex items-center gap-2 px-6 py-2.5 border border-border rounded-lg hover:bg-muted text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {testing
                ? <><Mail className="h-4 w-4 animate-pulse" /> Sending…</>
                : <><Send className="h-4 w-4" /> Send Test Email</>}
            </button>
          </div>
        </div>
      </div>

      {/* ── Template variable codes ── */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border bg-muted/20">
          <h3 className="font-semibold flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            EmailJS Template Variable Codes
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            These variable codes must be present in your EmailJS email template. Copy each and paste into your template on{' '}
            <a href="https://dashboard.emailjs.com/admin/templates" target="_blank" rel="noreferrer" className="text-primary hover:underline">emailjs.com</a>.
          </p>
        </div>

        {/* Variables table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-border">
                <th className="text-left py-3 px-5 font-semibold text-muted-foreground w-[160px]">Variable Name</th>
                <th className="text-left py-3 px-5 font-semibold text-muted-foreground w-[220px]">Template Code</th>
                <th className="text-left py-3 px-5 font-semibold text-muted-foreground">Description</th>
              </tr>
            </thead>
            <tbody>
              {TEMPLATE_VARS.map((v, i) => (
                <tr key={v.code} className={`border-b border-border last:border-0 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                  <td className="py-3.5 px-5">
                    <code className="font-mono text-xs bg-slate-800 text-emerald-300 px-2.5 py-1.5 rounded-md">{v.code}</code>
                  </td>
                  <td className="py-3.5 px-5">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-xs bg-slate-800 text-amber-300 px-2.5 py-1.5 rounded-md">{v.template}</code>
                      <CopyBtn text={v.template} />
                    </div>
                  </td>
                  <td className="py-3.5 px-5 text-muted-foreground text-xs leading-relaxed">{v.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Code snippet */}
        <div className="p-5 border-t border-border space-y-3">
          <p className="text-sm font-medium">Minimal EmailJS Template — paste into your template HTML body:</p>
          <div className="bg-forest-900 rounded-xl p-5 font-mono text-xs space-y-1.5 overflow-x-auto">
            <p><span className="text-slate-500">{'<!-- Recipient -->'}</span></p>
            <p><span className="text-blue-300">{'Subject: '}</span><span className="text-amber-300">{'{{subject}}'}</span></p>
            <p><span className="text-blue-300">{'To: '}</span><span className="text-amber-300">{'{{to_email}}'}</span></p>
            <p><span className="text-blue-300">{'From: '}</span><span className="text-amber-300">{'{{from_name}}'}</span></p>
            <p><span className="text-blue-300">{'Reply-To: '}</span><span className="text-amber-300">{'{{reply_to}}'}</span></p>
            <p className="mt-2"><span className="text-slate-500">{'<!-- HTML email body (triple braces = raw HTML rendering) -->'}</span></p>
            <p><span className="text-emerald-400">{'{{{html_message}}}'}</span></p>
            <p className="mt-2"><span className="text-slate-500">{'<!-- Plain text fallback -->'}</span></p>
            <p><span className="text-emerald-400">{'{{plain_message}}'}</span></p>
          </div>
          <div className="flex items-start gap-2 p-3.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5 text-blue-500" />
            <span>
              <strong>Important:</strong> Use <code className="bg-blue-100 px-1 py-0.5 rounded font-mono">{'{{{html_message}}}'}</code> with <strong>triple braces</strong> for the HTML body so EmailJS renders HTML instead of escaping it. All other variables use double braces.
            </span>
          </div>
        </div>
      </div>

      {/* ── Email delivery log ── */}
      <EmailLog />
    </div>
  );
}

// ─── Email log ────────────────────────────────────────────────────────────────

function EmailLog() {
  const raw = localStorage.getItem('bonoriya_email_logs');
  const logs: any[] = raw ? JSON.parse(raw).reverse().slice(0, 20) : [];
  if (!logs.length) return null;

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden">
      <div className="px-6 py-4 border-b border-border bg-muted/20 flex items-center justify-between">
        <h3 className="font-semibold">Recent Email Log</h3>
        <span className="text-xs text-muted-foreground">Last {logs.length} entries</span>
      </div>
      <div className="divide-y divide-border max-h-72 overflow-y-auto">
        {logs.map((l, i) => (
          <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/20 transition-colors">
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${l.delivered ? 'bg-green-500' : 'bg-amber-400'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{l.subject}</p>
              <p className="text-xs text-muted-foreground">
                To: <span className="font-mono">{l.to}</span> · {new Date(l.sentAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${l.delivered ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
              {l.delivered ? '✓ Sent' : 'Logged'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
