# DriveCompare

Car insurance comparison platform. Enter vehicle details once, get quotes from multiple providers simultaneously, and receive proactive rate alerts every 6 months.

## Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React 18, TypeScript, Vite, Tailwind CSS |
| State     | Zustand (auth), TanStack Query (server state) |
| Backend   | Node.js 18, Express                 |
| Database  | Supabase (Postgres + Row Level Security) |
| Auth      | JWT (bcrypt cost 12 for passwords)  |
| Email     | Resend                              |
| Hosting   | Vercel (frontend), Render (backend) |

---

## Local Development

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier is fine)
- A [Resend](https://resend.com) account (free tier: 3,000 emails/month)

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/drivecompare.git
cd drivecompare
npm install
cd frontend && npm install
cd ../backend && npm install
cd ..
```

### 2. Set up the database

1. Open your [Supabase dashboard](https://supabase.com/dashboard)
2. Go to **SQL Editor → New query**
3. Paste the contents of `supabase-schema.sql` and run it
4. Go to **Settings → API** and copy:
   - `Project URL` → `SUPABASE_URL`
   - `service_role` secret key → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Configure environment variables

**Backend** — copy and fill in:
```bash
cp backend/.env.example backend/.env
```

```env
PORT=3001
NODE_ENV=development
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
JWT_SECRET=<run: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
JWT_EXPIRES_IN=7d
RESEND_API_KEY=re_xxxx
EMAIL_FROM=noreply@yourdomain.com
FRONTEND_URL=http://localhost:5173
```

**Frontend** — copy and fill in:
```bash
cp frontend/.env.example frontend/.env
```

```env
VITE_API_URL=http://localhost:3001
```

### 4. Run locally

```bash
# From project root — starts both frontend (5173) and backend (3001)
npm run dev
```

Open http://localhost:5173

---

## Deployment

### Frontend → Vercel (free)

1. Push your repo to GitHub
2. Go to [vercel.com](https://vercel.com) → **New Project** → import your repo
3. Set **Root Directory** to `frontend`
4. Add environment variable:
   - `VITE_API_URL` = your Render backend URL (e.g. `https://drivecompare-api.onrender.com`)
5. Deploy — Vercel auto-deploys on every push to `main`

### Backend → Render (free tier)

1. Go to [render.com](https://render.com) → **New Web Service** → connect your repo
2. Set **Root Directory** to `backend`
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variables in the Render dashboard (never commit secrets):
   - `NODE_ENV=production`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SECRET`
   - `RESEND_API_KEY`
   - `EMAIL_FROM`
   - `FRONTEND_URL` = your Vercel URL (e.g. `https://drivecompare.vercel.app`)

> **Note:** The free Render tier spins down after 15 minutes of inactivity. First request after inactivity takes ~30s to cold-start. Upgrade to the $7/mo Starter plan for always-on when sharing with friends.

### Custom domain (optional, ~$12/yr)

1. Buy a domain on [Namecheap](https://namecheap.com) or [Cloudflare Registrar](https://cloudflare.com)
2. In Vercel: **Project Settings → Domains** → add your domain
3. Follow Vercel's DNS instructions — SSL is provisioned automatically

---

## Project Structure

```
drivecompare/
├── frontend/
│   ├── src/
│   │   ├── components/       # Reusable UI (Layout, AddVehicleModal)
│   │   ├── hooks/            # TanStack Query hooks (useApi.ts)
│   │   ├── lib/              # Axios client (api.ts)
│   │   ├── pages/            # Route-level pages
│   │   ├── store/            # Zustand stores (authStore.ts)
│   │   ├── types/            # Shared TypeScript types
│   │   ├── App.tsx           # Router + providers
│   │   └── main.tsx          # Entry point
│   ├── vercel.json
│   └── vite.config.ts
│
├── backend/
│   ├── src/
│   │   ├── lib/              # Supabase client
│   │   ├── middleware/        # JWT auth middleware
│   │   ├── routes/           # auth, vehicles, quotes, alerts
│   │   ├── services/         # quoteAggregator, email, cron
│   │   └── index.js          # Express entry point
│   └── render.yaml
│
├── supabase-schema.sql       # Run once in Supabase SQL editor
└── package.json              # Root monorepo scripts
```

---

## Adding Real Insurance Providers

The quote aggregator in `backend/src/services/quoteAggregator.js` is designed for easy provider integration:

```js
{
  id: 'my_provider',
  name: 'My Provider',
  async fetchQuote(vehicle, user) {
    const { data } = await axios.post('https://api.myprovider.com/quote', {
      vin: vehicle.vin,
      year: vehicle.year,
      // ... map to their schema
    }, {
      headers: { Authorization: `Bearer ${process.env.PROVIDER_MY_PROVIDER_KEY}` }
    });
    return {
      providerId: this.id,
      providerName: this.name,
      annualPremium: data.annual_rate,
      monthlyPremium: Math.round(data.annual_rate / 12),
      coverageType: 'comprehensive',
      deductible: data.deductible,
      providerUrl: data.quote_url,
      coverageDetails: { ... },
      exclusions: [],
      retrievedAt: new Date().toISOString(),
    };
  }
}
```

Add the provider to the `PROVIDERS` array — the aggregator handles concurrency and timeouts automatically.

---

## Security

- Passwords hashed with bcrypt at cost 12
- JWT tokens with 7-day expiry
- Auth endpoints rate-limited (20 req/15 min)
- All routes rate-limited (100 req/15 min)
- Supabase service role key used only server-side
- CORS restricted to configured frontend URL
- Helmet.js security headers
- Soft-deletes preserve quote history; hard deletes on GDPR request within 30 days
