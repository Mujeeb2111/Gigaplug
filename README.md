# Gigaplug Backend

Node.js / Express + SQLite (via Sequelize) backend for the Gigaplug frontend
(data bundles + virtual number OTP rentals).

## ⚠️ Read this first

1. **Your uploaded frontend had a credential-exfiltration form.** The login/signup
   form's `action` pointed at `https://submit.tented-pages.com/submit` and silently
   POSTed every user's email + password there, and also stored the raw password in
   `localStorage`. This has been **removed** in `public/index.html` — auth now goes
   straight to your own `/api/auth/*` routes and only a JWT is stored client-side.
   If you have this file deployed anywhere already, take it down and rotate any
   passwords that were entered into it.
2. **Your ClubKonnect and 5SIM keys were pasted in plaintext in our chat.** They're
   wired into this project via environment variables (never hardcoded), but since
   they've already been exposed, rotate them in your ClubKonnect/5SIM dashboards
   once you're set up, then drop the new values into `.env`.
3. This uses **SQLite**, not MongoDB, so you don't need to stand up a separate
   database server. If you'd rather use MongoDB, see "Switching to MongoDB" below.

## 1. Install

```bash
cd gigaplug-backend
npm install
cp .env.example .env
```

`sqlite3` compiles a native module on install — this needs normal internet
access (it wasn't available in the sandbox that built this, but will work on
your machine/server).

Fill in `.env`:

```
JWT_SECRET=<generate a long random string>
MONNIFY_API_KEY=...
MONNIFY_SECRET_KEY=...
MONNIFY_CONTRACT_CODE=...
CLUBKONNECT_USER_ID=CK101283053
CLUBKONNECT_API_KEY=<rotate this, then paste the new key>
FIVESIM_API_KEY=<rotate this, then paste the new key>
```

Monnify sandbox credentials come from your Monnify dashboard (Settings →
Developers). Note: live reserved accounts now require a customer **BVN or
NIN** per CBN rules for full transaction limits — the register endpoint
accepts an optional `bvn` field for this.

## 2. Run

```bash
npm start          # production
npm run dev         # nodemon, auto-restart
```

Server boots on `http://localhost:5000`. It serves the patched frontend
directly from `/public`, so opening `http://localhost:5000` in a browser
gets you the full site already wired to the API. Health check:
`GET /api/health`.

## 3. How the frontend fetch() calls map to backend routes

`public/index.html` is your original file with two changes: the malicious
form action removed, and real `fetch()` calls added. Reference:

| Frontend action | Method | Route |
|---|---|---|
| Sign up | POST | `/api/auth/register` `{fullName, email, password, phone?, bvn?}` |
| Log in | POST | `/api/auth/login` `{email, password}` |
| Check session | GET | `/api/auth/me` (Bearer token) |
| Wallet balance | GET | `/api/wallet/balance` |
| Funding account details | GET | `/api/wallet/account` |
| Transaction history | GET | `/api/wallet/transactions` |
| Monnify deposit webhook | POST | `/api/wallet/webhook/monnify` (register this URL in Monnify dashboard) |
| Live data plans | GET | `/api/data/plans?network=MTN` |
| Buy data | POST | `/api/data/purchase` `{network, planCode, phone}` |
| OTP countries | GET | `/api/otp/countries` |
| OTP products/prices for a country | GET | `/api/otp/products?country=germany&operator=any` |
| Rent a number | POST | `/api/otp/buy` `{country, operator?, product}` |
| Poll for SMS code | GET | `/api/otp/status/:orderId` |
| Cancel a rental | POST | `/api/otp/cancel/:orderId` |
| Admin: view/update pricing rules | GET/PUT | `/api/admin/settings` |
| Admin: dashboard stats | GET | `/api/admin/overview` |
| Admin: all users | GET | `/api/admin/users` |
| Admin: all transactions | GET | `/api/admin/transactions` |

All routes except register/login/webhook require `Authorization: Bearer <token>`.
The frontend's `apiFetch()` helper (added near the auth code) attaches this
automatically once you're logged in.

## 4. Important limitation to fix before going live: static pricing table

Your original frontend renders its data-plan grid and prices from a
**hardcoded JS object** (`const RAW = {...}`) baked into the HTML — not from
ClubKonnect. I wired the "Buy Data Now" button to actually purchase using
`RAW[network][planIndex].n` as the plan identifier, but ClubKonnect expects
its own `planCode`, which only exists in the *live* `/api/data/plans`
response. For a real launch you should replace the `RAW` object and the
`renderPlans()` / `dFillPlans()` functions with calls to
`GET /api/data/plans` so the UI always shows live ClubKonnect prices (with
your markup already applied) and uses real plan codes. I left the marketing
page's static grid alone for now since rewriting all the plan-rendering
JS was out of scope for the initial wiring pass — happy to do that next if
you want.

The same applies to the OTP tier logic (`otpSell()`) — it's currently a
fake pricing function for the marketing page. `/api/otp/products` returns
real 5SIM-backed prices with your margin applied; swap the homepage/dashboard
country-and-app pickers over to that endpoint when you're ready.

## 5. Admin access

Register with email `admin@swiftverify.com` (matches `ADMIN_EMAIL` in
`.env`) and that account gets `role: "admin"` automatically, unlocking
`/api/admin/*`. Update the flat data markup (₦20 default) or OTP margin via:

```bash
curl -X PUT http://localhost:5000/api/admin/settings \
  -H "Authorization: Bearer <admin token>" \
  -H "Content-Type: application/json" \
  -d '{"dataMarkup": 25, "otpMarginType": "flat", "otpMarginValue": 1800}'
```

`otpMarginType` can be `"flat"` (₦ added) or `"percent"` (% added to 5SIM
cost).

## 6. Monnify webhook

Register `https://yourdomain.com/api/wallet/webhook/monnify` in your Monnify
dashboard. The route verifies the `monnify-signature` header (HMAC-SHA512
over the raw body, using your secret key) before crediting any wallet — this
matters, don't skip it, or anyone could POST fake "payment" events at you.

## 7. 5SIM currency note

5SIM prices come back in the currency tied to your account (commonly RUB).
`FIVESIM_FX_TO_NGN` in `.env` is a placeholder multiplier — wire it to a real,
regularly-updated FX rate before going live, or your OTP margins will be
wrong.

## 8. Switching to MongoDB instead of SQLite

If you'd prefer MongoDB: swap `config/db.js` for a `mongoose.connect()` call,
convert each file in `models/` to a Mongoose schema, and replace
`sequelize.transaction()` usage in `routes/data.routes.js` and
`routes/otp.routes.js` with Mongo sessions/transactions (requires a replica
set). The route/service logic (ClubKonnect, 5SIM, Monnify, JWT, admin
middleware) doesn't need to change either way.

## Project structure

```
gigaplug-backend/
  server.js
  config/db.js
  models/            User, Wallet, Transaction, OtpOrder, Settings
  middleware/auth.js protect + adminOnly
  routes/            auth, wallet, data, otp, admin
  services/          monnify, clubkonnect, fivesim API wrappers
  public/index.html  your frontend, patched
  .env.example
```
