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
| Deployment | Netlify (with `@netlify/plugin-nextjs`) |

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

- Node.js >= 20
- Yarn
- A [Neon](https://neon.tech) PostgreSQL database (free tier works)

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
cp .env.example .env
```

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string | `postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require` |
| `AUTH_SECRET` | Random secret for Auth.js session encryption (min 32 chars) | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Full public URL of your app | `http://localhost:3000` |
| `ADMIN_EMAIL` | Email for the seeded admin account | `admin@yoursite.com` |
| `ADMIN_PASSWORD` | Password for the seeded admin account | `Admin@123` |

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
│   └── auth-utils.ts         # Server-side actor context helpers
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
| `POST` | `/api/register` | PUBLIC | Self-registration |
| `POST` | `/api/forgot-password` | PUBLIC | Request password reset |
| `POST` | `/api/reset-password` | PUBLIC | Confirm password reset |

---

## Deployment

This project deploys to **two environments via GitHub Actions**:

| Branch | Workflow | Platform | Environment | Neon DB branch |
|---|---|---|---|---|
| `main` | [.github/workflows/deploy-vercel.yml](./.github/workflows/deploy-vercel.yml) | **Vercel** (region `sin1` — Singapore) | Production | `prod` |
| `uat` | [.github/workflows/deploy-netlify.yml](./.github/workflows/deploy-netlify.yml) | **Netlify** | UAT / staging | `uat` |

> Both deploys run from GitHub Actions using the platform CLIs (`vercel` / `netlify-cli`). **Disable native Git integration on both Vercel and Netlify** to avoid double deploys.

### GitHub Actions secrets

Add these under **GitHub → Settings → Environments → `secret`**:

**Shared (used by both workflows):**

| Secret | Value |
|---|---|
| `AUTH_SECRET` | Auth.js secret |
| `ADMIN_EMAIL` | Admin email |
| `ADMIN_PASSWORD` | Admin password |

> `DATABASE_URL` and `AUTH_URL` are environment-specific: store the **prod** values in the secrets used by the Vercel workflow, and the **uat** values in the secrets used by the Netlify workflow. The simplest setup is to keep them as plain repo secrets per the workflow file (or split into two GitHub Environments — one called `production`, one `uat`).

**Vercel-only:**

| Secret | Value | How to get |
|---|---|---|
| `VERCEL_TOKEN` | Personal access token | [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | Organization / team ID | Run `vercel link` locally, then read `.vercel/project.json` |
| `VERCEL_PROJECT_ID` | Project ID | Same as above |

**Netlify-only:**

| Secret | Value |
|---|---|
| `NETLIFY_AUTH_TOKEN` | Personal access token from [app.netlify.com/user/applications](https://app.netlify.com/user/applications) |
| `NETLIFY_SITE_ID` | Site ID from Netlify site settings |

### Vercel project setup

1. Create the project on [vercel.com](https://vercel.com) (or run `vercel link` locally).
2. **Disconnect** the GitHub Git integration if Vercel auto-connected the repo (Settings → Git → Disconnect). The GitHub Actions workflow handles deploys.
3. Region pinning to `sin1` is enforced via [vercel.json](./vercel.json) — same region as Neon (`ap-southeast-1`).
4. **Settings → Functions → Fluid Compute**: enable to reduce cold starts.
5. **Settings → Environment Variables** (Production scope) — set the same values that GitHub Actions injects at build time, so the runtime can read them:

```
DATABASE_URL       = <Neon prod branch pooled connection string>
AUTH_SECRET        = <Auth.js secret>
AUTH_URL           = https://<your-vercel-domain>
ADMIN_EMAIL        = <admin email>
ADMIN_PASSWORD     = <admin password>
```

> Use the **pooled** Neon connection string (host contains `-pooler`).

### Netlify project setup

1. Create the site on Netlify (link it to the repo for env management, but disable auto-build — Actions handles it).
2. **Site configuration → Build & deploy → Continuous deployment**: set **Stop builds** or set the production branch to a non-existent branch so Netlify doesn't auto-build on push.
3. **Site configuration → Environment variables**:

```
DATABASE_URL       = <Neon uat branch pooled connection string>
AUTH_SECRET        = <Auth.js secret>
AUTH_URL           = https://<your-netlify-domain>.netlify.app
ADMIN_EMAIL        = <admin email>
ADMIN_PASSWORD     = <admin password>
```

### Neon database branches

Both environments share one Neon project with two branches:

- `main` Neon branch → used by Vercel (production)
- `uat` Neon branch → used by Netlify (staging)

Create the `uat` branch from the Neon dashboard (Branches → New branch from `main`) and copy its **pooled** connection string into the Netlify workflow's `DATABASE_URL` secret.

### Why `sin1` matters

The previous Netlify-only setup ran serverless functions in the US, while Neon lives in Singapore — every DB round-trip crossed the Pacific, causing API latency of ~10s. Pinning Vercel functions to `sin1` puts the function in the same region as the database, dropping warm-path latency to <500ms.

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

- Passwords are hashed with **bcrypt** (12 rounds)
- Sessions are validated against the database on every request (hybrid JWT + DB session strategy)
- Accounts are locked after repeated failed login attempts
- All sensitive operations check role + ownership server-side
- Optimistic locking on request updates prevents conflicting writes
- Password reset tokens are hashed before storage
