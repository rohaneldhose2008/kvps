# kvpsons.com setup on GoDaddy: website + free Zoho email

Do this once you've bought **kvpsons.com** on GoDaddy.
Go to **GoDaddy → My Products → kvpsons.com → DNS → Manage DNS**.

---

## Step 0: Remove GoDaddy's default records

GoDaddy adds these to every new domain. Delete or replace them first:

- the **A** record `@` → `Parked` (or any WebsiteBuilder/forwarding IP)
- the **CNAME** `www` → `@` (you'll replace it below)
- any **MX** records GoDaddy added (only if you did *not* buy GoDaddy email)

Leave the **NS** (nameserver) and **SOA** records alone.

---

## Part A: Website (GitHub Pages)

### A1. Records to add in GoDaddy

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `@` | `185.199.108.153` | 1 hour |
| A | `@` | `185.199.109.153` | 1 hour |
| A | `@` | `185.199.110.153` | 1 hour |
| A | `@` | `185.199.111.153` | 1 hour |
| AAAA | `@` | `2606:50c0:8000::153` | 1 hour |
| AAAA | `@` | `2606:50c0:8001::153` | 1 hour |
| AAAA | `@` | `2606:50c0:8002::153` | 1 hour |
| AAAA | `@` | `2606:50c0:8003::153` | 1 hour |
| CNAME | `www` | `rohaneldhose2008.github.io` | 1 hour |

### A2. Tell GitHub about the domain

1. Open https://github.com/rohaneldhose2008/kvps → **Settings → Pages**.
2. Under **Custom domain**, type `kvpsons.com` and click **Save**.
3. Wait until the DNS check turns green (from a few minutes up to 24 h), then tick **Enforce HTTPS**.

### A3. Tell Claude

Once it works, ask Claude to switch the site's links (canonical URL, sitemap, Google data) from `rohaneldhose2008.github.io/kvps` to `https://kvpsons.com`.

---

## Part B: Email (Zoho Mail, Forever Free plan)

### B1. Sign up

1. Go to https://www.zoho.com/mail/zohomail-pricing.html and choose **Forever Free** (scroll down to find it).
2. Choose **"Sign up with a domain I already own"** and enter `kvpsons.com`.
3. Zoho shows a **verification TXT record**. Add it in GoDaddy (B2), then click **Verify** in Zoho.
4. Create the mailboxes: `info@kvpsons.com`, plus any others (up to 5 users on the free plan).

### B2. Records to add in GoDaddy

> **Important:** the values below are for Zoho's **India** data centre (`zoho.in`).
> Indian accounts normally land there. If your Zoho admin page shows `zoho.com` addresses
> instead, use `mx.zoho.com`, `mx2.zoho.com`, `mx3.zoho.com` and `include:zoho.com`.
> **Always copy the exact values Zoho shows you.**

| Type | Name | Value | Priority | TTL |
|---|---|---|---|---|
| TXT | `@` | `zoho-verification=zbXXXXXXXX.zmverify.zoho.in` *(copy it from Zoho)* | — | 1 hour |
| MX | `@` | `mx.zoho.in` | 10 | 1 hour |
| MX | `@` | `mx2.zoho.in` | 20 | 1 hour |
| MX | `@` | `mx3.zoho.in` | 50 | 1 hour |
| TXT | `@` | `v=spf1 include:zoho.in ~all` | — | 1 hour |
| TXT | `zmail._domainkey` | `v=DKIM1; k=rsa; p=MIGf...` *(copy it from Zoho → Admin Console → Domains → Email Configuration → DKIM)* | — | 1 hour |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:info@kvpsons.com` | — | 1 hour |

- **SPF, DKIM and DMARC** stop your emails from landing in spam. Don't skip them.
- Keep **only one** SPF record (`v=spf1 ...`). If you later add another sending service, merge it into the same line.
- After adding the records, click **Verify** next to MX, SPF and DKIM in the Zoho Admin Console.

### B3. Use it

- On the web: https://mail.zoho.in
- On your phone: the **Zoho Mail** app (Android/iOS).
- The free plan doesn't work in the Gmail or Outlook apps (no IMAP/POP). You'd need a paid Zoho plan (about ₹59 per user per month) for that.

---

## Part C: Forward managingdirector@kvpsons.com to an existing inbox (free, ImprovMX)

Use this instead of Part B if you just want mail sent to **managingdirector@kvpsons.com**
to land in an inbox you already have (e.g. a Gmail). **Pick B or C, not both**: a domain can only have one set of MX records.

### C1. Sign up

1. Go to https://improvmx.com, type `kvpsons.com` and the inbox the mail should go to (e.g. your Gmail), and create the free account.
2. Under **Aliases**, add `managingdirector` → your Gmail. Optionally add `*` (catch-all) → same Gmail, so any address @kvpsons.com reaches you.

### C2. Records to add in GoDaddy (DNS → Manage DNS)

First delete any other **MX** records on `@` (GoDaddy's defaults, or Zoho's from Part B).

| Type | Name | Value | Priority | TTL |
|---|---|---|---|---|
| MX | `@` | `mx1.improvmx.com` | 10 | 1 hour |
| MX | `@` | `mx2.improvmx.com` | 20 | 1 hour |
| TXT | `@` | `v=spf1 include:spf.improvmx.com ~all` | — | 1 hour |

- Keep only **one** SPF (`v=spf1 …`) TXT record.
- Don't touch the A/AAAA/CNAME records for the website.
- Back in ImprovMX, click **Check again** until both records turn green (minutes to a few hours).

### C3. Test

Send an email from a different account to managingdirector@kvpsons.com and check it arrives in the Gmail (look in Spam the first time).

### C4. Optional: reply *as* managingdirector@kvpsons.com from Gmail

The free plan only forwards. To send from the address, ImprovMX's paid plan gives SMTP details for
Gmail → Settings → Accounts → **Send mail as**. Or use Zoho Mail (Part B) for a full free mailbox instead.

---

## Part D: Forward managingdirector@kvpsons.com with Cloudflare Email Routing (free)

Alternative to Part C (ImprovMX). Cloudflare forwards for free with no alias limits, but it **only works if Cloudflare runs
the domain's DNS**: you move the nameservers from GoDaddy to Cloudflare. You still own and renew the domain at GoDaddy.
**Use C or D, not both.**

### D1. Add the domain to Cloudflare

1. Sign up at https://dash.cloudflare.com → **Add a domain** → `kvpsons.com` → choose the **Free** plan.
2. Cloudflare copies your existing DNS records. Check the list has the website records, and add any that are missing:

   | Type | Name | Value | Proxy status |
   |---|---|---|---|
   | A | `@` | `185.199.108.153` | **DNS only** (grey cloud) |
   | A | `@` | `185.199.109.153` | **DNS only** |
   | A | `@` | `185.199.110.153` | **DNS only** |
   | A | `@` | `185.199.111.153` | **DNS only** |
   | CNAME | `www` | `rohaneldhose2008.github.io` | **DNS only** |

   > **Important:** click each orange cloud so it turns **grey (DNS only)**. With the orange proxy on,
   > GitHub Pages can't renew the site's HTTPS certificate.

3. Delete any old **MX** records in the list (GoDaddy, Zoho or ImprovMX). Cloudflare adds its own in D3.

### D2. Point GoDaddy at Cloudflare

1. Cloudflare shows **two nameservers** (e.g. `xxx.ns.cloudflare.com` and `yyy.ns.cloudflare.com`).
2. In GoDaddy: **My Products → kvpsons.com → DNS → Nameservers → Change nameservers → "I'll use my own nameservers"**.
   Enter the two Cloudflare names and save. If GoDaddy shows **DNSSEC** as on, turn it off first.
3. Wait until Cloudflare emails you that the site is **Active** (usually under an hour, at most 24 h).
   The website keeps working throughout.

### D3. Turn on Email Routing

1. In Cloudflare: **kvpsons.com → Email → Email Routing → Get started**.
2. **Destination address:** enter the Gmail the mail should go to, then click the verification link Cloudflare emails to it.
3. **Custom address:** `managingdirector` → that Gmail. Save.
4. Cloudflare asks to add its records (3 MX `route1/route2/route3.mx.cloudflare.net` and an SPF TXT). Click **Add records and enable**.
5. Optional: **Catch-all address** → the same Gmail, so any name @kvpsons.com reaches you.

### D4. Test

From a different email account, send a message to managingdirector@kvpsons.com and check the Gmail (and Spam the first time).

### D5. Optional: reply as managingdirector@kvpsons.com from Gmail

Cloudflare only receives and forwards. To send from the address: Google account → turn on 2-Step Verification →
create an **App password**. Then Gmail → Settings → Accounts → **Send mail as → Add another address**:
`managingdirector@kvpsons.com`, SMTP server `smtp.gmail.com`, port 587, your Gmail address and the app password.
In Cloudflare DNS, edit the SPF TXT so it reads `v=spf1 include:_spf.mx.cloudflare.net include:_spf.google.com ~all`.

---

## Quick checklist

- [ ] Bought kvpsons.com
- [ ] Deleted GoDaddy's parked A record and the old `www` CNAME
- [ ] Added 4 A + 4 AAAA + 1 CNAME for the website
- [ ] Set the custom domain in GitHub → Settings → Pages, and enabled HTTPS
- [ ] Signed up for Zoho Mail Forever Free, added the verification TXT and verified it
- [ ] Added the 3 MX, SPF, DKIM and DMARC records, and verified them in Zoho
- [ ] Created info@kvpsons.com and sent a test email to and from Gmail
- [ ] Asked Claude to switch the website's links to kvpsons.com
