# Affiliate Request Manager

A full-stack web application for managing affiliate link requests between buyers and affiliate marketers. Buyers submit product URLs, affiliates fill them with affiliate links, and buyers close requests once a purchase is made.

---

## Features

- **Role-based access control** — Buyer, Affiliate, and Admin roles with protected routes
- **Request lifecycle management** — NEW → FILLED → CLOSED with full audit trail
- **Affiliate queue** — Affiliates can claim, fill, and manage requests from a queue
- **Order ID tracking** — Required when closing a request with reason "Bought"
- **Duplicate detection** — Normalized URL comparison prevents duplicate requests
- **Bulk close** — Admins can bulk-close stale requests older than a configurable threshold
- **Audit logs** — Every state change is logged with actor, timestamp, old/new values
- **Account security** — Login attempt tracking, account lockout, password reset via email
- **Link preview** — Affiliate-provided links show product metadata preview
- **Configurable settings** — Supported platforms, stale thresholds, and duplicate windows via admin UI
- **Dark mode** — Full theme support via `next-themes`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.2 (App Router, Turbopack) |
| Language | TypeScript |
| Auth | Auth.js v5 (NextAuth) — Credentials + hybrid JWT/DB session |
| Database | PostgreSQL via [Neon](https://neon.tech) serverless |
| ORM | Prisma 7 with `@prisma/adapter-neon` |
| UI | Tailwind CSS v4 + shadcn/ui components |
| Validation | Zod v4 |
| Animations | Framer Motion |
| Data Fetching | SWR |
| Notifications | Sonner |
| CAPTCHA | Cloudflare Turnstile (`@marsidev/react-turnstile`) |
| App Integrity | Firebase App Check (reCAPTCHA v3 provider) |
| Deployment | Vercel (prod) + Netlify (UAT) via GitHub Actions |

---

## User Roles & Workflow

```
BUYER                        AFFILIATE                    ADMIN
  │                              │                           │
  ├─ Submit request (URL)        │                           ├─ Manage users
  │    └─ Status: NEW            │                           ├─ Configure settings
  │                              ├─ Browse queue             ├─ View audit logs
  │                              ├─ Claim request            └─ Bulk close stale requests
  │                              ├─ Fill affiliate link
  │                              │    └─ Status: FILLED
  │                              │
  ├─ View filled request         │
  ├─ Provide Order ID (if bought)│
  └─ Close request               │
       └─ Status: CLOSED         │
            Reasons: BOUGHT / NOT_BUYING / INVALID / STALE / OTHER
```

---

## Prerequisites

- Node.js >= 21
- Yarn
- A [Neon](https://neon.tech) PostgreSQL database (free tier works)
- A [Cloudflare](https://dash.cloudflare.com) account (free — for Turnstile)
- A [Firebase](https://console.firebase.google.com) project with App Check enabled

---

## Local Development Setup

### 1. Clone & install dependencies

```bash
git clone <repo-url>
cd affiliate-next
yarn install
```

### 2. Configure environment variables

Copy the example and fill in values:

```bash
cp .env.example .env.local
```

#### Server-side variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL pooled connection string |
| `AUTH_SECRET` | Random secret for Auth.js (`openssl rand -base64 32`) |
| `AUTH_URL` | Full public URL of your app (e.g. `http://localhost:3000`) |
| `ADMIN_EMAIL` | Email for the seeded admin account |
| `ADMIN_PASSWORD` | Password for the seeded admin account |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile **secret** key (server-side verify) |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Firebase service account client email |
| `FIREBASE_PRIVATE_KEY` | Firebase service account private key (newline-escaped) |
| `SECURITY_GUARD_DISABLED` | Set to `1` to bypass all security checks in non-production only |

#### Client-side variables (`NEXT_PUBLIC_*`)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare Turnstile **site** key (rendered in browser) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase Web app API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase Web app ID |
| `NEXT_PUBLIC_FIREBASE_RECAPTCHA_SITE_KEY` | reCAPTCHA v3 site key registered in Firebase App Check |
| `NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN` | App Check debug token for local dev (see below) |

### 3. Push schema & seed the database

```bash
yarn db:push    # sync Prisma schema to your Neon database
yarn db:seed    # create admin, buyer, and affiliate demo accounts
```

### 4. Start the development server

```bash
yarn dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Available Scripts

```bash
yarn dev          # start development server (Turbopack)
yarn build        # generate Prisma client + production build
yarn start        # start production server
yarn lint         # run ESLint

yarn db:push      # push Prisma schema changes to database (no migration history)
yarn db:migrate   # create and apply a migration (use in production workflows)
yarn db:seed      # seed demo/default data
yarn db:studio    # open Prisma Studio (GUI database browser)
```

---

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/          # Protected routes (layout with sidebar)
│   │   ├── admin/            # Admin: user management, config
│   │   ├── affiliate/        # Affiliate: request queue
│   │   └── buyer/            # Buyer: request list, submit, close
│   ├── api/                  # REST API routes
│   │   ├── affiliate/        # Queue, bulk-close, fill link
│   │   ├── auth/             # Auth.js handler
│   │   ├── config/           # App config CRUD
│   │   ├── requests/         # Request CRUD, claim, close, note
│   │   └── users/            # User management
│   ├── login/                # Public auth pages
│   ├── register/
│   ├── forgot-password/
│   └── reset-password/
├── components/
│   ├── layout/               # Sidebar, header, theme provider
│   └── ui/                   # shadcn/ui component library
├── lib/
│   ├── auth.ts               # NextAuth config (hybrid JWT + DB session)
│   ├── prisma.ts             # Prisma client singleton
│   ├── validations.ts        # Zod schemas for all API inputs
│   ├── audit.ts              # Audit log helper
│   ├── auth-utils.ts         # Server-side actor context helpers
│   ├── security-guard.ts     # Triple-layer POST guard (checksum + App Check + Turnstile)
│   ├── firebase-admin.ts     # Firebase Admin SDK singleton (server)
│   ├── firebase-client.ts    # Firebase Web SDK + App Check init (client)
│   └── secure-fetch.ts       # Client helper: signs requests with all 3 security headers
├── hooks/                    # React hooks
├── types/                    # TypeScript type extensions
└── middleware.ts             # Edge middleware: session cookie guard
```

---

## API Endpoints

| Method | Path | Role | Description |
|---|---|---|---|
| `POST` | `/api/requests` | BUYER | Submit a new request |
| `GET` | `/api/requests` | ANY | List requests (filtered by role) |
| `GET` | `/api/requests/[id]` | ANY | Get single request |
| `POST` | `/api/requests/[id]/close` | BUYER/ADMIN | Close a request |
| `POST` | `/api/requests/[id]/claim` | AFFILIATE | Claim a request |
| `POST` | `/api/requests/[id]/note` | AFFILIATE | Save note on request |
| `POST` | `/api/affiliate/[id]/fill` | AFFILIATE | Fill affiliate link |
| `GET` | `/api/affiliate/queue` | AFFILIATE | Get affiliate queue |
| `POST` | `/api/affiliate/bulk-close` | ADMIN | Bulk close stale requests |
| `GET/PUT` | `/api/config` | ADMIN | Read/update app config |
| `GET/POST` | `/api/users` | ADMIN | List/create users |
| `PATCH/DELETE` | `/api/users/[id]` | ADMIN | Update/delete user |
| `POST` | `/api/register` | PUBLIC | Self-registration ⁽¹⁾ |
| `POST` | `/api/forgot-password` | PUBLIC | Request password reset ⁽¹⁾ |
| `POST` | `/api/reset-password` | PUBLIC | Confirm password reset |

> ⁽¹⁾ Protected by the triple-layer security guard (SHA-256 checksum + Firebase App Check + Cloudflare Turnstile).

---

## Security Architecture

Public mutation endpoints (`/api/register`, `/api/forgot-password`) are protected by three stacked server-side checks in addition to rate limiting.

### Request flow

```
Client                              Server (Node.js runtime)
──────                              ──────────────────────────
1. Serialize body to JSON string
2. SHA-256(body) → X-Body-Checksum header
3. Firebase App Check token     →  X-Firebase-AppCheck header
4. Cloudflare Turnstile token   →  X-Turnstile-Token header
                                    │
                                    ├─ 1. Rate limit (in-memory sliding window)
                                    ├─ 2. X-Body-Checksum — constant-time SHA-256 compare
                                    ├─ 3. X-Firebase-AppCheck — Firebase Admin verifyToken()
                                    ├─ 4. X-Turnstile-Token — Cloudflare siteverify API
                                    └─ 5. Zod schema validation → Prisma / Neon DB
```

### Error codes

| HTTP | Code | Meaning |
|---|---|---|
| 429 | `RATE_LIMITED` | Too many requests from this IP |
| 400 | `BAD_REQUEST` | Missing or malformed required header / invalid JSON |
| 400 | `CHECKSUM_MISMATCH` | Body was tampered — SHA-256 does not match |
| 401 | `APPCHECK_INVALID` | Firebase App Check token missing or invalid |
| 401 | `TURNSTILE_INVALID` | Cloudflare Turnstile token missing or invalid |
| 500 | `SECURITY_CHECK_FAILED` | Unexpected error during a security check |

### Dev bypass

Set `SECURITY_GUARD_DISABLED=1` in `.env.local` to skip all three checks. **Never honoured when `NODE_ENV=production`.**

---

## Firebase App Check — Local Setup

Because `localhost` cannot pass reCAPTCHA normally, App Check uses a **debug token** in development:

1. Start the dev server and open the `/register` page in Chrome DevTools.
2. Firebase will print to the console:
   ```
   App Check debug token: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```
3. Register that UUID in Firebase Console:
   **App Check → Apps → your web app → ⋮ → Manage debug tokens → Add**
4. Save the UUID to `.env.local`:
   ```bash
   NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```
5. Restart `yarn dev`.

> **Do not commit the debug token.** Add `NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN` to `.gitignore` or keep it only in `.env.local` which is already gitignored.

---

## Cloudflare Turnstile Setup

| Environment | Widget | Note |
|---|---|---|
| Local dev | Use Cloudflare's **test keys** — always pass without a real CAPTCHA challenge | Site key: `1x00000000000000000000AA` / Secret: `1x0000000000000000000000000000000AA` |
| UAT | Create a dedicated widget in Cloudflare Dashboard, register your Netlify domain | Widget → Site Key → `NEXT_PUBLIC_TURNSTILE_SITE_KEY`; Widget → Secret Key → `TURNSTILE_SECRET_KEY` |
| Production | Create a separate widget, register your production domain | Same variables, different values |

---

## Deployment

This project deploys to two environments via GitHub Actions:

| Branch | Platform | Environment | Neon DB branch |
|---|---|---|---|
| `main` | **Vercel** (region `sin1` — Singapore) | Production | `main` |
| `uat` | **Netlify** | UAT / staging | `uat` |

> Both deploys run from GitHub Actions. **Disable native Git integration on both Vercel and Netlify** to avoid double deploys.

### GitHub Actions secrets

**Shared:**

| Secret | Value |
|---|---|
| `AUTH_SECRET` | Auth.js session secret |
| `ADMIN_EMAIL` | Admin account email |
| `ADMIN_PASSWORD` | Admin account password |

> `DATABASE_URL` and `AUTH_URL` are environment-specific — store the prod values in secrets used by the Vercel workflow and the UAT values in the Netlify workflow. Split into two GitHub Environments (`production` / `uat`) for clean separation.

**Vercel-only:**

| Secret | How to get |
|---|---|
| `VERCEL_TOKEN` | [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Run `vercel link` locally → `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | Same as above |

**Netlify-only:**

| Secret | How to get |
|---|---|
| `NETLIFY_AUTH_TOKEN` | [app.netlify.com/user/applications](https://app.netlify.com/user/applications) |
| `NETLIFY_SITE_ID` | Netlify site settings → Site ID |

**Security env vars (per environment):**

| Variable | Vercel (prod) | Netlify (UAT) |
|---|---|---|
| `TURNSTILE_SECRET_KEY` | Prod widget secret key | UAT widget secret key |
| `FIREBASE_PROJECT_ID` | Firebase project ID | Same project |
| `FIREBASE_CLIENT_EMAIL` | Service account email | Same service account |
| `FIREBASE_PRIVATE_KEY` | Service account private key | Same private key |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Prod widget site key | UAT widget site key |
| `NEXT_PUBLIC_FIREBASE_*` | Firebase Web config values | Same project, same values |
| `NEXT_PUBLIC_FIREBASE_RECAPTCHA_SITE_KEY` | reCAPTCHA v3 site key | Same key |

### Vercel project setup

1. Create the project on [vercel.com](https://vercel.com) or run `vercel link`.
2. **Disconnect** the GitHub Git integration (Settings → Git → Disconnect).
3. Region is pinned to `sin1` via [vercel.json](./vercel.json) — same region as Neon (`ap-southeast-1`).
4. **Settings → Functions → Fluid Compute**: enable to reduce cold starts.
5. **Settings → Environment Variables** (Production scope):

```
DATABASE_URL       = <Neon prod pooled connection string>
AUTH_SECRET        = <Auth.js secret>
AUTH_URL           = https://<your-vercel-domain>
ADMIN_EMAIL        = <admin email>
ADMIN_PASSWORD     = <admin password>
TURNSTILE_SECRET_KEY                     = <prod Turnstile secret>
FIREBASE_PROJECT_ID                      = <project id>
FIREBASE_CLIENT_EMAIL                    = <service account email>
FIREBASE_PRIVATE_KEY                     = <service account private key>
NEXT_PUBLIC_TURNSTILE_SITE_KEY           = <prod Turnstile site key>
NEXT_PUBLIC_FIREBASE_API_KEY             = <web app api key>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN         = <project>.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID          = <project id>
NEXT_PUBLIC_FIREBASE_APP_ID              = <web app id>
NEXT_PUBLIC_FIREBASE_RECAPTCHA_SITE_KEY  = <recaptcha v3 site key>
```

### Netlify project setup

1. Create the site on Netlify and disable auto-builds (Settings → Build & deploy → Continuous deployment → **Stop builds**).
2. **Site configuration → Environment variables** — same list as Vercel but with UAT values.

### Neon database branches

Both environments share one Neon project with two branches:

- `main` branch → Vercel (production)
- `uat` branch → Netlify (staging) — create from Neon Dashboard: **Branches → New branch from `main`**

Always use the **pooled** connection string (host contains `-pooler`).

### Why `sin1` matters

Serverless functions default to US regions. With Neon hosted in Singapore (`ap-southeast-1`), every DB round-trip previously crossed the Pacific (~10 s latency). Pinning Vercel to `sin1` co-locates functions with the database, dropping warm-path latency to <500 ms.

---

## Database Schema Overview

```
User ──< Session              (auth — hybrid JWT + DB sessions)
User ──< PasswordResetToken   (password reset flow)
User ──< Request (createdBy)  (buyer submits requests)
User ──< Request (closedBy)   (who closed it)
User ──< Request (affiliateOwner) (affiliate who owns it)
Request ──< AuditLog          (full change history)
AppConfig                     (key/value config table)
```

**Request statuses:** `NEW` → `FILLED` → `CLOSED`

**Close reasons:** `BOUGHT` | `NOT_BUYING` | `INVALID` | `STALE` | `OTHER`

> When closing with `BOUGHT`, an Order ID is required.

---

## Security Notes

- Passwords hashed with **bcrypt** (12 rounds)
- Sessions validated against the database on every request (hybrid JWT + DB strategy)
- Accounts locked after repeated failed login attempts
- All sensitive operations check role + ownership server-side
- Optimistic locking on request updates prevents conflicting writes
- Password reset tokens hashed before storage (SHA-256)
- Public POST endpoints protected by a triple-layer guard: SHA-256 body checksum + Firebase App Check + Cloudflare Turnstile
- Content Security Policy headers set on all routes; Turnstile and reCAPTCHA domains explicitly allowlisted
- All security check failures return generic messages — no internal detail leakage to the client

