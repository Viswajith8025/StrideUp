# StrideUp

**Every Step. One Level Up.**

StrideUp is a mobile-first step tracking and fitness challenge PWA that helps users track their daily steps, set goals, monitor progress, maintain streaks, compete in challenges, view leaderboards, and stay connected with their group.

## Features

- User authentication (signup, login, password reset)
- Daily step tracking with motion sensor support + manual entry + CSV import
- Day / Week / Month statistics with charts
- Challenges with leaderboards and invite links
- Realtime challenge chat (Supabase Realtime)
- Results and statistics
- Theme switching (system/dark/light) and accent colors
- Body measurements, units, notifications settings
- CSV/JSON data import and export
- Installable PWA with offline app shell
- Admin panel for limited user base
- Row Level Security on all tables

## Prerequisites

- Node.js 18+
- A Supabase project

## Setup

### 1. Clone and install

```bash
cd stride-tracker
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_APP_NAME=StrideUp
```

### 3. Database setup

1. Open your Supabase project → **SQL Editor**
2. Paste and run `supabase/setup.sql`
3. (Optional) Run `supabase/seed.sql` after creating test users

### 4. Enable Realtime

In Supabase Dashboard → Database → Replication, ensure `messages` table is enabled for Realtime.

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 6. Run tests

```bash
npm test
```

## PWA Testing

1. Build for production: `npm run build && npm start`
2. Open in Chrome on Android or Safari on iOS
3. Use "Add to Home Screen" / "Install App"
4. Verify offline app shell loads when disconnected

## Admin Access

After creating a user, promote them in Supabase SQL Editor:

```sql
UPDATE public.profiles SET role = 'admin' WHERE user_id = 'YOUR_USER_UUID';
```

## Project Structure

```
src/
  app/           # Next.js App Router pages
  components/    # UI components
  hooks/         # React hooks
  lib/           # Business logic & services
  types/         # TypeScript types
  utils/         # Date, formatting utilities
supabase/
  setup.sql      # Database schema + RLS
  seed.sql       # Development seed data
```

## Step Tracking Notes

Browser-based step counting uses `DeviceMotionEvent` when available. Due to OS/browser restrictions, background pedometer access is limited in PWAs. The app always supports:

- **Manual step entry**
- **CSV import**
- **Motion sensor** (when permitted)

Architecture is designed for future Health Connect / native integration.

## What's Ready Without Supabase

The app builds and runs locally. All UI, PWA shell, offline queue, import/export parsing, calculations, and tests work without a database. Auth, data persistence, challenges, and chat require Supabase credentials.

## Deployment

Deploy to Vercel, Netlify, or any Next.js-compatible host. Set environment variables in your hosting dashboard. Ensure `NEXT_PUBLIC_APP_URL` matches your production URL.

## License

Private — for limited user base.
