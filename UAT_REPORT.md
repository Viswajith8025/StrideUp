# StrideUp — UAT Audit Report

## 1. Run metadata

| Field | Value |
|-------|-------|
| **Date** | 2026-09-05 |
| **Project** | StrideUp |
| **Context doc** | `STRIDEUP.md` |
| **Branch** | `main` |
| **Commit SHA** | `5b7ebf39355a2326ca2373145319bd7f562eafa3` |
| **Auditor mode** | Read-only (only this file created/modified) |
| **Total gate runtime** | ~183 seconds (`typecheck` + `lint` + `test` + `build` sequential) |

### Commands executed

| Command | Result |
|---------|--------|
| `npm run typecheck` | **PASS** (exit 0, no output) |
| `npm run lint` | **FAIL** — 31 problems (16 errors, 15 warnings); see Phase B |
| `npm test` | **PASS** — 89 tests, 18 files, 12.62s |
| `npm run build` | **PASS** — Next.js 16.3.4 production build succeeded (~26.4s compile) |
| `node scripts/verify-migrations.mjs` | **PASS** — `OK: 9 migrations reproduce setup.sql.` |
| `npm run test:e2e` | **FAIL** — immediate `ENOENT` on `e2e/.auth/inactive.json` (see Blocked) |

### Git status at audit end

```
?? UAT_REPORT.md
(+ extensive pre-existing modified/untracked files from P1–P8 work — see NOTE-08)
```

The working tree at audit start already contained dozens of modified and untracked files relative to `5b7ebf3`. This audit added **only** `UAT_REPORT.md`.

---

## 2. Verdict

**Not shippable as-is.** The single most serious finding is that **P4 social features (activity feed and cheer controls) are implemented as components and services but are not mounted on any page**, while documentation marks P4 complete. Second: **challenge invite links likely cannot load challenge data for non-members under current RLS** (`challenges_select` has no `invite_token` path), breaking a core multi-user journey. Third: **`backfill_challenge_steps` is `SECURITY DEFINER` with `GRANT … TO authenticated` and no in-function authorization**, allowing any logged-in user to trigger expensive backfills on arbitrary challenge IDs. The E2E suite does not run in this environment (missing auth state files and Supabase secrets), and CI does not run `eslint` despite 16 lint errors. Production build and 89 unit tests pass, but test coverage is concentrated in `lib/` with zero page, hook, or successfully executed E2E coverage.

---

## 3. Findings table

| ID | Severity | Area | Finding | Evidence | Confidence |
|----|----------|------|---------|----------|------------|
| F-01 | **BLOCKER** | P4 / UI | `ChallengeActivityFeed` and `CheerControl` are never imported outside their own files; `getChallengeActivity` / `sendCheer` unused in pages | `Grep` — only definitions in `activity-feed.tsx`, `cheer-control.tsx`, `service.ts`; challenge detail `page.tsx` has leaderboard only (lines 110–121) | **VERIFIED** |
| F-02 | **BLOCKER** | RLS / Invites | Invite flow cannot read challenges by `invite_token` for non-members; RLS `challenges_select` allows only creator, member, or admin | `supabase/migrations/20260101000000_base_schema.sql:277-281`; `getChallengeByToken` at `lib/challenges/service.ts:121-128` | **STATIC** |
| F-03 | **BLOCKER** | E2E | Playwright suite crashes before setup: `blocked.spec.ts` reads `e2e/.auth/inactive.json` at load time when file absent | `npm run test:e2e` → `ENOENT: e2e/.auth/inactive.json` at `blocked.spec.ts:7` | **VERIFIED** |
| F-04 | **MAJOR** | Security / RPC | `backfill_challenge_steps` is `SECURITY DEFINER`, granted to `authenticated`, no caller authorization inside function | `20260102000000_p1_challenge_step_aggregation.sql:62-92,117`; called from `joinChallenge` `service.ts:76-78` | **VERIFIED** |
| F-05 | **MAJOR** | Security / RLS | Any authenticated user can insert themselves into any challenge (`challenge_members_insert` checks only `user_id = auth.uid()`) | `base_schema.sql:297` | **STATIC** |
| F-06 | **MAJOR** | Settings | Profile save shows success toast without checking Supabase error | `settings/profile/page.tsx:31-35` — no `error` destructuring | **VERIFIED** |
| F-07 | **MAJOR** | CI | GitHub Actions runs typecheck + unit tests but **not** `npm run lint`; 16 ESLint errors exist | `.github/workflows/ci.yml:18-21`; `npm run lint` output | **VERIFIED** |
| F-08 | **MAJOR** | Release | `STRIDEUP.md` claims P1–P8 complete; working tree has extensive uncommitted changes not on `5b7ebf3` | `git status` at audit start | **VERIFIED** |
| F-09 | **MINOR** | Challenges | Leave challenge has no confirmation dialog | `challenges/[id]/page.tsx:107` — `onClick={handleLeave}` direct | **VERIFIED** |
| F-10 | **MINOR** | Challenges | Create challenge has no loading/disabled state or error surfacing on `handleCreate` | `challenges/page.tsx:50-67` | **VERIFIED** |
| F-11 | **MINOR** | Settings | “Import from Google Fit” and “Rate App” are stubs (toast only) | `settings/page.tsx:192,205`; `google-fit.ts:7-9` | **VERIFIED** |
| F-12 | **MINOR** | UX | Invite share fallback uses `alert()` | `challenges/[id]/page.tsx:72` | **VERIFIED** |
| F-13 | **MINOR** | Schema | `ALTER PUBLICATION supabase_realtime ADD TABLE` not idempotent on re-run | `base_schema.sql:348`, `p3_notification_center.sql:31` | **STATIC** |
| F-14 | **NOTE** | Hygiene | Duplicate legacy SQL file `supabase/migrations-p1-p6-append.sql` alongside `migrations/` | `git status` untracked list | **VERIFIED** |
| F-15 | **NOTE** | Tests | 89 tests in 18 files — all under `src/lib/`, `src/utils/`, `src/components/ui/`; **zero** tests for `src/app/`, `src/hooks/`, `src/lib/challenges/`, `src/lib/cheers/` | `Glob **/__tests__/**` | **VERIFIED** |
| F-16 | **NOTE** | Lint | `home-client.tsx:91` — ref read during render (ESLint error) | `npm run lint` output | **VERIFIED** |
| F-17 | **NOTE** | Observability | `console.error` in production paths (`useSteps.ts:46`, `challenges/service.ts:80`, `usePushNotifications.ts:46`) | `Grep console.error src` | **VERIFIED** |
| F-18 | **NOTE** | Docs vs code | `STRIDEUP.md` documents P4 activity feed; not rendered on any route | F-01 + `STRIDEUP.md:34` | **VERIFIED** |
| F-19 | **NOTE** | FCP | Authenticated `/home` FCP **not measured** | E2E `fcp.spec.ts` not run; no Lighthouse output | **UNKNOWN** |
| F-20 | **NOTE** | Admin | `/admin` gated in page component only, not middleware; non-admins see “Admin access required” | `admin/page.tsx:25-31`; middleware has no admin check | **STATIC** |

---

## 4. Per-phase detail

### Phase A — Orient

#### Stack and versions (from `package.json`)

| Layer | Version |
|-------|---------|
| Next.js | 16.3.4 |
| React | 19.2.8 |
| TypeScript | ^5 |
| Tailwind | ^4 |
| Supabase JS | ^2.114.0 |
| Vitest | ^4.1.11 |
| Playwright | ^1.63.0 |
| Serwist PWA | ^9.5.12 |

#### Routes and auth (from `STRIDEUP.md`, `middleware.ts`, `next build` output)

| Route | Auth (middleware) | Notes |
|-------|-------------------|-------|
| `/` | Redirect | → `/home` or `/login` |
| `/login`, `/signup`, `/forgot-password` | Public | |
| `/invite/[token]` | Public prefix | `/invite` in `PUBLIC_ROUTES` |
| `/privacy`, `/terms`, `/support`, `/blocked` | Public | |
| `/home`, `/challenges`, `/challenges/[id]`, `/chats`, `/chats/[roomId]`, `/results`, `/notifications`, `/settings/*` | Authenticated | Not in `PUBLIC_ROUTES` |
| `/admin` | Authenticated only | **No admin role check in middleware** |

Onboarding: `OnboardingGuard` redirects incomplete setup to `/settings/step-counter` (`onboarding-guard.tsx:17-22`).

#### Database tables (from migrations)

`profiles`, `daily_activity`, `step_events`, `challenges`, `challenge_members`, `challenge_daily_steps`, `chat_rooms`, `chat_members`, `messages`, `notifications`, `app_settings`, `push_subscriptions`, `challenge_cheers`

**Views:** `challenge_leaderboard`, `challenge_activity`, `admin_user_list`, `admin_metrics`

**Storage:** `avatars` bucket (P7 migration)

#### Background jobs / edge functions

| Function | Purpose |
|----------|---------|
| `daily-nudge` | Push nudge window |
| `send-push` | Push delivery |
| `notify-chat-message` | Chat notifications |
| `notify-cheer` | Cheer notifications |

#### External services

- Supabase (Auth, Postgres, Realtime, Storage)
- Web Push (VAPID — `NEXT_PUBLIC_VAPID_PUBLIC_KEY` in `.env.example`)

#### Documentation vs code gaps

| Documented | Found in code? |
|------------|----------------|
| P4 activity feed on challenge | **No** — component exists, not used (F-01) |
| P4 cheer on leaderboard | **No** — component exists, not used (F-01) |
| Invite link join flow | Code exists; **RLS may block** token lookup (F-02) |
| P8 E2E green in CI | Suite exists; **failed to start** here (F-03) |
| `npm run db:verify-migrations` | Script exists; **PASS** |

**Undocumented in STRIDEUP.md:** `chart-placeholder.tsx`, `timezone-sync.tsx`, `migrations-p1-p6-append.sql`, full `UPGRADE_PROMPTS.md` history.

---

### Phase B — Automated gates

#### Typecheck
```
npm run typecheck → exit 0
```

#### Lint
```
npm run lint → 31 problems (16 errors, 15 warnings)
```
Representative errors:
- `home-client.tsx:91` — ref accessed during render
- `notifications/page.tsx:38-48` — component created during render (`getCategoryIcon`)
- Multiple `react-hooks/set-state-in-effect` in settings pages and hooks

**CI does not run lint** (`.github/workflows/ci.yml`).

#### Unit tests
```
Test Files  18 passed (18)
Tests       89 passed (89)
Duration    12.62s
```

**Coverage concentration (modules with zero `__tests__`):**
- All `src/app/**` pages (23 routes)
- All `src/hooks/**` (`useAuth`, `useChallenge`, `useSteps`, `useNotifications`, `useRealtimeChat`, `usePushNotifications`, `useUnread`, `useTheme`, `useFocusTrap`)
- `src/lib/challenges/service.ts`
- `src/lib/cheers/service.ts`
- `src/lib/avatars/compress.ts`, `storage.ts` (partial — hash tests exist)
- `src/lib/offline/sync.ts` (queue tested, flush path not)
- `src/lib/import-export/admin-export.ts`
- Most `src/components/**` except `ui/avatar`

#### Production build
```
✓ Compiled successfully in 26.4s
- Environments: .env.local
⚠ middleware file convention deprecated (Next.js 16)
23 app routes generated
```
Build **PASS**. FCP **not measured**.

#### E2E
```
Error: ENOENT: no such file or directory, open '.../e2e/.auth/inactive.json'
```
**Blocked** — requires global setup + Supabase service role (see Section 6).

#### Migrations verify
```
OK: 9 migrations reproduce setup.sql.
```

---

### Phase C — Interactive surface audit

Summary by area. Handler = where click/submit goes.

#### Auth pages
| Control | Handler | Status |
|---------|---------|--------|
| Login submit | `supabase.auth.signInWithPassword` → redirect | Implemented; error shown |
| Signup submit | `signUp` → `/settings/step-counter` | Implemented |
| Forgot password | `resetPasswordForEmail` | Implemented |

#### Home (`home-client.tsx`)
| Control | Handler | Status |
|---------|---------|--------|
| Period toggle | `setPeriod` | OK |
| Day prev/next | `setSelectedDate` | OK |
| Add steps FAB | Opens Sheet | OK |
| Add steps submit | `addManualSteps` → `flushSteps` | OK; **no user error toast on failure** (queues offline) |
| Leaderboard link | `LeaderboardPreview` → challenge detail | OK; **no cheer controls** |

#### Challenges
| Control | Handler | Status |
|---------|---------|--------|
| Create (+) | Modal → `createChallenge` | **No loading/error UI** (F-10) |
| Join | `joinChallenge` | OK; no invite enforcement (F-05) |
| Leave | `leaveChallenge` | **No confirm** (F-09) |
| Share invite | `navigator.share` / clipboard + `alert` | OK (F-12) |

#### Settings hub
| Control | Handler | Status |
|---------|---------|--------|
| Theme/accent | `setTheme` / `setAccentColor` | OK |
| Import CSV/JSON | `previewImport` → `executeImport` | OK |
| Export | `getActivityRange` → download | OK |
| Google Fit | `toast(description)` only | **Stub** (F-11) |
| Rate App | `toast("Thank you...")` | **Stub** (F-11) |

#### Admin (`admin-client.tsx`)
| Control | Handler | Status |
|---------|---------|--------|
| Promote/demote/deactivate/cancel | Server actions + `ConfirmDialog` | OK |
| Repair leaderboards | `repairLeaderboards` RPC | OK; confirmed |
| CSV export | `exportUsersCsvAction` | OK |

#### Dead / unwired UI components
- `ChallengeActivityFeed` — **dead** (F-01)
- `CheerControl` — **dead** (F-01)

---

### Phase D — Workflow traces

#### D1 Signup → onboarding → home
`signup/page.tsx` → `auth.signUp` → redirect `/settings/step-counter` → `handleComplete` updates `profiles` + `app_settings.step_counter_setup_complete` → `/home`.  
`OnboardingGuard` enforces flag. **Confidence: STATIC** (not browser-tested).

#### D2 Login → manual steps → dashboard
`login` → middleware session → `/home` server `loadHomePageData` → `HomeClient` → FAB → `useSteps.addManualSteps` → `addSteps` + `recordStepEvent` (`useSteps.ts:37-56`). On failure → `queueActivityUpdate` (`useSteps.ts:47-52`). **Flush on online:** `flushPendingUpdates` (`sync.ts:6-18`). **Confidence: STATIC**.

#### D3 Create challenge → invite → second user joins
Create: `createChallenge` → `joinChallenge` (creator auto-joins).  
Invite: `getChallengeByToken` — **likely fails RLS for invitee** (F-02).  
Join: `joinChallenge` inserts `challenge_members`. **Confidence: STATIC for RLS failure; VERIFIED for code path.**

#### D4 Chat realtime
`useRealtimeChat` → `messages` select + Realtime channel; profiles batch-fetched. **Not E2E verified.**

#### D5 Settings persist
Profile save: **optimistic toast without error check** (F-06).  
Theme: `useTheme.updateSetting` → `app_settings` update. **STATIC.**

#### D6 Admin mutations
`admin/actions.ts` → `requireAdmin()` (checks `profiles.role`) → Supabase mutation. RLS also uses `is_admin()` on profiles/challenges updates. **Server action gate is UI-layer; DB RLS is backstop. Confidence: VERIFIED (code read).**

#### D7 Deactivated user
Middleware reads `profiles.is_active` → redirect `/blocked` (`middleware.ts:51-64`). **Not E2E verified** (F-03).

#### D8 Offline steps
Fail sync → queue IDB → `online` event → `flushPendingUpdates`. **Partial failure stops flush loop** (`sync.ts:15-17` `break` on error). **STATIC.**

---

### Phase E — Data and access integrity

#### Schema vs `types/database.ts`

| Area | Drift |
|------|-------|
| Core tables | **Aligned** — `Profile`, `AppSettings`, `Notification`, etc. match migrations |
| `PushSubscription` in types | Table exists in P2 migration — **aligned** |
| Views | `LeaderboardEntry`, `ChallengeActivityEvent` — used in code, defined in SQL |

No critical column drift found in read-through.

#### RLS summary

| Client write | Policy | Gap |
|--------------|--------|-----|
| `profiles` update own | `profiles_update` | OK |
| `profiles` role change by non-admin | RLS blocks others' rows | OK |
| `challenge_members` insert | `user_id = auth.uid()` | **Any challenge ID** (F-05) |
| `challenges` select by invite | No token policy | **F-02** |
| `backfill_challenge_steps` RPC | Granted to `authenticated`, no internal auth | **F-04** |
| `reconcile_all_challenge_steps` | Checks `is_admin()` inside | OK |
| `challenge_cheers` insert | Member checks in policy | OK (unused in UI) |
| `storage.objects` avatars | Path prefix = `auth.uid()` | OK (P7 migration) |

#### UI-only authorization
- Admin page render: non-admin sees message, not redirect (`admin/page.tsx:26-31`) — **F-20**
- Admin server actions: `requireAdmin()` — bypassable only if caller invokes action directly; RLS must hold

#### Secrets
- `.env.example` uses placeholders only — **VERIFIED**
- `NEXT_PUBLIC_*` keys are client-exposed by design — **NOTE**
- No committed `.env.local` in repo — **VERIFIED** (`.gitignore` excludes `.env*`)

#### Duplicate definitions (migrations)
Post-P7 split: **no duplicate** `get_users_at_local_nudge_hour` or `profiles_update` within `migrations/` (grep). Legacy `migrations-p1-p6-append.sql` still present (F-14).

---

### Phase F — Rot and loose ends

| Item | Location |
|------|----------|
| No `TODO`/`FIXME` in `src/` | `Grep` — none |
| `alert("Invite link copied!")` | `challenges/[id]/page.tsx:72` |
| Google Fit stub | `google-fit.ts:7-9` |
| `console.error` in user paths | `useSteps.ts:46`, etc. (F-17) |
| `STRIDEUP.md` P1–P8 complete vs unwired P4 UI | F-01, F-18 |
| README `cd StrideUp` | Fixed per P8 (not re-verified against old name in other docs) |

---

## 5. Coverage gaps

| Gap | What is needed |
|-----|----------------|
| E2E suite | `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_*`, run `auth.setup` first; fix `blocked.spec.ts` top-level `readFileSync` |
| Invite flow | Manual test with fresh user + invite URL; likely needs RLS policy for `invite_token` |
| P4 features | Wire `ChallengeActivityFeed` + `CheerControl` to challenge detail or home leaderboard |
| FCP | `MEASURE_FCP=1` + production server + Playwright `fcp` project with auth state |
| Browser axe | `e2e/a11y.spec.ts` requires running Playwright with auth |
| Lint gate | Add `npm run lint` to CI; fix 16 errors |
| Real device PWA / push | Physical device + VAPID + Supabase edge deploy |

---

## 6. Blocked — requires operator

| Item | Action |
|------|--------|
| E2E full run | Set secrets in CI or `.env.local`; `npx playwright install chromium`; `npm run test:e2e` |
| E2E auth bootstrap | Run setup project first; ensure `e2e/.auth/*.json` exist before `blocked.spec.ts` loads |
| FCP number | `npm run build && npm run start` + `MEASURE_FCP=1 npm run test:e2e -- --project=fcp` |
| Invite RLS verification | As non-member, open `/invite/{token}` in browser; check Network tab for Supabase error |
| Remote SQL | Apply migrations to Supabase project if not already applied |
| Commit / release | Commit P1–P8 working tree or cut release branch from verified state |

---

## 7. Recommended fix order

1. **F-02** — Add RLS policy (or security-definer RPC) allowing `SELECT` on `challenges` by `invite_token` for authenticated and/or anon users. *Blocks invite E2E and real invites.*
2. **F-01** — Wire `ChallengeActivityFeed` + `CheerControl` into `challenges/[id]/page.tsx` (or documented surface). *Restores documented P4.*
3. **F-04** — Restrict `backfill_challenge_steps` to challenge members or service role. *Security.*
4. **F-03** — Defer `readFileSync(inactiveAuthFile)` until test body or use `storageState` from setup project only. *Unblocks E2E.*
5. **F-07** — Add lint to CI; fix **F-16** and other errors. *Prevents regressions.*
6. **F-06** — Profile save error handling. *Quick UX fix.*
7. **F-05** — Optional: require invite token or membership precondition for `challenge_members` insert.
8. **F-08** — Commit, tag, and run full CI with secrets.
9. **F-19** — Measure FCP after auth E2E works.

---

## Finding counts

| Severity | Count |
|----------|-------|
| BLOCKER | 3 |
| MAJOR | 5 |
| MINOR | 4 |
| NOTE | 8 |
| **Total** | **20** |
