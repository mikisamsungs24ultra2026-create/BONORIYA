# BONORIYA Email Deliverability Fix
## Root Cause: EmailJS sends from their servers — SPF/DKIM/DMARC fail for bonoriya.com

---

## IMMEDIATE DNS FIX (Do this RIGHT NOW — 5 minutes)

### Step 1: Update SPF Record
Login to your DNS provider (MilesWeb cPanel → Zone Editor → bonoriya.com)

Find your existing TXT record for bonoriya.com that starts with `v=spf1`

**Replace it with:**
```
v=spf1 include:milesweb.in include:emailjs.com include:resend.com ~all
```

> If you don't have a SPF record yet, add this TXT record:
> - Name: bonoriya.com (or @)
> - Type: TXT
> - Value: v=spf1 include:milesweb.in include:emailjs.com include:resend.com ~all
> - TTL: 3600

### Step 2: Soften DMARC While You Fix
Add/update this TXT record:
```
Name: _dmarc.bonoriya.com
Type: TXT
Value: v=DMARC1; p=none; rua=mailto:info@bonoriya.com; ruf=mailto:info@bonoriya.com; fo=1; adkim=r; aspf=r
TTL: 3600
```

---

## PERMANENT FIX — Resend (30-60 minutes setup)

### Step 1: Create Resend Account
1. Go to https://resend.com
2. Sign up free (3,000 emails/month free forever)
3. Go to **Domains** → **Add Domain** → Enter: `bonoriya.com`

### Step 2: Add Resend DNS Records
Resend will show you 3 DNS records to add. Example (YOUR values will differ):

```
# DKIM Record (Resend provides exact value):
Name:  resend._domainkey.bonoriya.com
Type:  TXT
Value: v=DKIM1; p=MIGfMA0GCSqGSIb3DQEBA... (Resend generates this)

# SPF: already included above (include:resend.com)

# DMARC: already set above
```

Add all records Resend shows you in MilesWeb cPanel → Zone Editor.

### Step 3: Deploy Supabase Edge Function
```bash
# In your project terminal:
supabase functions deploy send-email

# Set the secret:
supabase secrets set RESEND_API_KEY=re_your_key_here
```

### Step 4: Get Resend API Key
1. resend.com → API Keys → Create API Key
2. Name: "BONORIYA Production"
3. Permission: Sending access only
4. Copy the key (starts with re_)

### Step 5: Add to Supabase
1. Supabase Dashboard → Edge Functions → send-email → Secrets
2. Add secret: `RESEND_API_KEY` = your key from Step 4

### Step 6: Verify Domain in Resend
After adding DNS records, click "Verify" in Resend dashboard.
Wait 5-10 minutes for DNS propagation.
Once verified: ✓ DKIM Active ✓ SPF Active

---

## After Setup: Upgrade DMARC to Enforce
Once Resend is working and emails land in inbox:

```
# Update _dmarc.bonoriya.com TXT record to:
v=DMARC1; p=quarantine; rua=mailto:info@bonoriya.com; pct=100; adkim=s; aspf=s
```

Then after 2 weeks of clean reports: change `p=quarantine` to `p=reject`

---

## Verify Everything Works
Test at: https://www.mail-tester.com
- Send a test email to the address shown
- You should score 9-10/10

Also check:
- https://mxtoolbox.com/blacklists.aspx → Enter your server IP → Should be 0/90
- https://postmaster.google.com → Register bonoriya.com → Monitor reputation
- https://sendersupport.olc.protection.outlook.com → Hotmail deliverability

---

## What Was Changed in Code
- `supabase/functions/send-email/index.ts` — New Edge Function using Resend
- `src/app/utils/auth.ts` `_dispatch()` — Now tries Resend first, EmailJS as fallback
- All emails now send from `noreply@bonoriya.com` (Reply-To: info@bonoriya.com)
