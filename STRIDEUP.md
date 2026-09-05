# StrideUp — Project Reference

Mobile-first step tracking and fitness challenge PWA. **P1–P8 complete** on the web track.

## Routes

| Route | Auth | Description |
|-------|------|-------------|
| `/login`, `/signup`, `/forgot-password` | Public | Authentication |
| `/home` | User | Dashboard (server-rendered) |
| `/challenges`, `/challenges/[id]` | User | Challenges and leaderboard |
| `/invite/[token]` | Public | Challenge invite join |
| `/chats`, `/chats/[roomId]` | User | Realtime challenge chat |
| `/results` | User | Statistics |
| `/notifications` | User | In-app notification center |
| `/settings/*` | User | Profile, body, theme, notifications |
| `/admin` | Admin | Paginated admin panel |
| `/blocked` | Public | Deactivated account landing |
| `/privacy`, `/terms`, `/support` | Public | Legal / support |

## Schema (key tables & views)

| Object | Phase | Notes |
|--------|-------|-------|
| `profiles` | base | `avatar_url`, `timezone`, `is_active`, `role` |
| `daily_activity`, `step_events` | base | Step storage |
| `challenges`, `challenge_members`, `challenge_daily_steps` | base | Challenges |
| `chat_rooms`, `chat_members`, `messages` | base | Realtime chat |
| `notifications` | base+P3 | `category`, `local_date`, `url` |
| `app_settings` | base+P2 | Theme, push prefs, onboarding flag |
| `push_subscriptions` | P2 | Web Push endpoints |
| `challenge_cheers` | P4 | Social cheers |
| `challenge_leaderboard` | base | View |
| `challenge_activity` | P4 | View — activity feed |
| `admin_user_list`, `admin_metrics` | P6 | Admin views |
| `storage.buckets: avatars` | P7 | Profile photos |

## Migrations

SQL lives in `supabase/migrations/` (one file per phase). `supabase/setup.sql` is **generated**:

```bash
node scripts/generate-setup-sql.mjs   # regenerate setup.sql
node scripts/verify-migrations.mjs    # verify concat matches setup.sql
```

## Testing

```bash
npm test              # Vitest unit tests
npm run test:e2e      # Playwright (requires Supabase env + service role)
npm run db:verify-migrations
```

E2E uses Playwright global setup (`e2e/auth.setup.ts`) to seed users and save auth state. Runs on mobile (390×844) and desktop viewports in CI.

## Accent contrast (P8)

These **raw** accent values failed WCAG AA UI contrast on **light** backgrounds before P8 light-mode overrides:

- **yellow** `#eab308`
- **green** `#22c55e`
- **cyan** `#22d3ee`

Light mode uses darker variants via `resolveAccentPalette()` in `lib/theme/constants.ts`.

## Phase status

| Phase | Status |
|-------|--------|
| P1 — Challenge step sync | ✅ |
| P2 — Web Push | ✅ |
| P3 — Notification center | ✅ |
| P4 — Streaks & social | ✅ |
| P5 — Dashboard performance | ✅ |
| P6 — Admin panel v2 | ✅ |
| P7 — Profile avatars | ✅ |
| P8 — E2E, a11y, housekeeping | ✅ |
