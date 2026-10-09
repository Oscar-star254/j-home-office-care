# J Home & Office Care — website

Next.js (frontend + API routes) deployed on **Vercel**, with **Supabase** as the backend
(database, login, file storage, realtime chat). Payments use **M-Pesa (Daraja STK push)**.

Three kinds of users, each with their own area and icon:

| User | Icon | Area | What they do |
|------|------|------|--------------|
| Admin | shield | `/admin` | Approve employees (sees ID photos), add/delete **Our Work** pictures, edit services & prices, see every booking, payment and user, suspend users, change deposit rules |
| Customer | person | `/customer` | Home dashboard (large House Hunting + Cleaning cards), detailed booking, choose a provider by rating, pay deposit, chat, rate |
| Employee | briefcase | `/employee` | Sign up with ID number, phone, confirmed email, then upload ID front/back + photo; after admin approval accept/decline/start/complete jobs and chat |

**Deposit rule** (enforced in the database, cannot be changed from the browser):
service price KSh 1,000 or more → 10%; below KSh 1,000 → KSh 100.
Chat between customer and provider is blocked by the database until the deposit is paid.

---
## 1. Backend (Supabase) — about 10 minutes
1. Create a free project at https://supabase.com.
2. **SQL Editor → New query**, paste all of `supabase/schema.sql`, press **Run**.
   This creates every table, security rule, storage bucket and your service prices.
3. **Authentication → Providers → Email**: keep "Confirm email" **ON** (this gives you confirmed emails).
4. **Authentication → URL Configuration**: set *Site URL* to your Vercel URL
   (and add `http://localhost:3000` and `https://YOUR-SITE.vercel.app/**` to *Redirect URLs*).
5. **Project Settings → API**: copy the Project URL, the `anon` key and the `service_role` key.

## 2. Deploy on Vercel
1. Push this folder to a GitHub repository.
2. On https://vercel.com → **Add New → Project** → import the repo (framework: Next.js, nothing else to set).
3. Add these **Environment Variables**, then Deploy:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service_role key (secret) |
| `NEXT_PUBLIC_SITE_URL` | your Vercel URL, e.g. `https://j-home-office-care.vercel.app` |
| `MPESA_ENV`, `MPESA_CONSUMER_KEY`, `MPESA_CONSUMER_SECRET`, `MPESA_SHORTCODE`, `MPESA_PASSKEY`, `MPESA_CALLBACK_SECRET` | from Safaricom Daraja (see below). **Leave the M-Pesa ones out to run in test mode.** |

## 3. Make yourself the admin
1. Open your site and sign up as a normal customer with your own email, confirm it.
2. In Supabase SQL Editor run (use your email):
```sql
update public.profiles set role = 'admin', status = 'approved' where email = 'you@example.com';
```
3. Sign in again — you land on `/admin`.

## 4. M-Pesa
Without M-Pesa keys the deposit window shows **Test mode** with a "Simulate payment" button, so you can try the whole flow.
For real money, create a Daraja app at https://developer.safaricom.co.ke, get a Paybill/Till with STK Push (Lipa na M-Pesa Online),
fill in the `MPESA_*` variables, set `MPESA_ENV=production`, and redeploy. Safaricom calls
`/api/pay/callback?token=MPESA_CALLBACK_SECRET` on your site when the customer pays.

## Run locally
```bash
cp .env.example .env.local   # fill in the values
npm install
npm run dev                  # http://localhost:3000
```

## Notes
- Prices on the landing page, the booking flow and deposits all come from the `services` table — change them in **Admin → Services**.
- House Hunting has no price on your flyer. It is seeded at KSh 1,000 — set the real fee in **Admin → Services**.
- The first flyer lists "Couch Cleaning" twice; it is included once.
