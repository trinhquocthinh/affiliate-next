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

## Demo Accounts (after seeding)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@affiliate.local` | `Admin@123` |
| Buyer | `buyer@affiliate.local` | `Buyer@123` |
| Affiliate | `affiliate@affiliate.local` | `Affiliate@123` |

> Passwords are set via `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars for admin. Buyer and affiliate accounts use the values above by default.

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

This project is deployed on **Netlify** with automatic deploys from the `main` branch via GitHub Actions.

### One-time Netlify setup

1. Create a new site on [netlify.com](https://app.netlify.com)
2. **Do not** connect the GitHub repo directly — GitHub Actions handles the deploy
3. Go to **Site settings → Environment variables** and add:

```
DATABASE_URL       = <your Neon connection string>
AUTH_SECRET        = <same value as local .env>
NEXTAUTH_URL       = https://<your-netlify-domain>.netlify.app
ADMIN_EMAIL        = <your admin email>
ADMIN_PASSWORD     = <your admin password>
```

4. Go to **Site settings → General** and copy the **Site ID**
5. Go to [app.netlify.com/user/applications](https://app.netlify.com/user/applications) and create a **Personal access token**

### GitHub Secrets required

Add these in **GitHub → Settings → Secrets and variables → Actions**:

| Secret | Value |
|---|---|
| `NETLIFY_AUTH_TOKEN` | Your Netlify personal access token |
| `NETLIFY_SITE_ID` | Your Netlify site ID |
| `DATABASE_URL` | Neon connection string (for build-time Prisma generate) |
| `AUTH_SECRET` | Auth.js secret |
| `NEXTAUTH_URL` | Production URL |

### Deploy triggers

- Every push to `main` → automatic production deploy
- The workflow builds locally in GitHub Actions (secrets available at build time) then deploys the output to Netlify

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

