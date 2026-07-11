# GigaPlug

A mobile-first web app for buying mobile data/airtime and renting OTP verification numbers in Nigeria. Built with **Next.js 16 + TypeScript + Tailwind CSS + Supabase**.

## Features

- Passwordless email-OTP login (via Brevo)
- Unified login for users and one hardcoded admin
- Squad virtual accounts + webhook wallet funding (no BVN/NIN collected from users)
- 5sim OTP number store with dynamic pricing and profit rules
- ClubKonnect data bundle and airtime sales
- Admin dashboard for price tiers, users, data plans, OTP rules, API keys, wallet adjustments, and API logs
- Dark neon UI, responsive like a native app

## Setup

1. Copy `.env.example` to `.env` and fill in your keys.
2. Run the SQL in `supabase/migrations/00000000000000_schema.sql` in your Supabase SQL editor.
3. Install and run:

```bash
npm install
npm run dev
```

## Deploy

```bash
npm run build
npm start
```

Configure the same environment variables on your hosting platform.

## Important Notes

- **No BVN/NIN collection**: Users never enter a BVN or NIN. Squad virtual accounts are created through the dynamic virtual account endpoint, which does not require BVN in the request.
- **API keys**: You can set API keys via environment variables or add/override them from the admin dashboard (stored in `api_keys` table).
- **OTP pricing**: Admin configures price tiers and country profit rules. The backend queries 5sim live and only sells numbers that satisfy the profit rule.
