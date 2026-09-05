# StrideUp — Upgrade Prompt Pack (Cursor Composer)

**Run in order.** Each phase is self-contained, ships independently, and assumes the previous phase is merged.
Global rules for every prompt: minimal diffs, match existing patterns, keep `types/database.ts` and Zod schemas in sync, all SQL additive-only, mobile-first at 375px, `npm run typecheck && npm test` must pass before you declare done.

Phases 1–8 are the web track. Phase 9 is a separate platform track — do not start it until 1–8 are stable.

**Status:** P1 + P1.1 + P2 + P2.1 + P3 merged locally.

---

## P1 — Challenge step aggregation integrity (data correctness) ✅

See `supabase/setup.sql` migration section and README Maintenance.

---

## P1.1 — Challenge sync trigger hardening (patch) ✅

```
Read the P1 section at the bottom of supabase/setup.sql before writing anything. All changes are
additive — append a new P1.1 section, do not edit the P1 statements.

P1 moved challenge aggregation into the database but left three paths that reintroduce drift.

1. DELETE on daily_activity
   The existing trigger fires only on INSERT OR UPDATE OF steps, so the delete branch inside
   sync_challenge_steps_for_day is unreachable. Add:

   trigger trg_daily_activity_challenge_sync_delete
   AFTER DELETE ON daily_activity FOR EACH ROW
   EXECUTE sync_challenge_steps_for_day(OLD.user_id, OLD.date)

   Confirm the function handles the "no daily_activity row" case by deleting matching
   challenge_daily_steps rows rather than upserting zero. Zero rows and absent rows must not be
   conflated — the leaderboard view should not count a deleted day as a logged zero.

2. Challenge status transition
   sync_challenge_steps_for_day skips challenges where status = 'upcoming'. When
   update_challenge_status transitions a challenge to 'active', steps already logged inside the
   date range are never replayed, so day-one leaderboards read zero.

   Add a trigger on challenges AFTER UPDATE OF status, WHEN (OLD.status IS DISTINCT FROM NEW.status
   AND NEW.status = 'active'), that calls backfill_challenge_steps(NEW.id).
   Make backfill_challenge_steps idempotent — it must be safe to call repeatedly.

3. Leaving a challenge
   Add trigger on challenge_members AFTER DELETE that removes that user's challenge_daily_steps rows
   for that challenge. Verify challenge_leaderboard reflects the removal immediately.

4. Verification
   Add a SQL block to the README Maintenance section that a maintainer can run to detect drift:
   a query returning any (challenge_id, user_id, date) where challenge_daily_steps.steps differs from
   the corresponding daily_activity.steps, plus any challenge_daily_steps row with no matching
   daily_activity row or no matching challenge_members row. It should return zero rows on a healthy DB.

5. Tests
   Vitest cases asserting the client still has no write path to challenge_daily_steps after these
   changes. Trigger behaviour itself is DB-level — document the manual verification steps in README
   rather than mocking Postgres.

ACCEPTANCE
- Deleting a day's activity removes it from the leaderboard.
- A challenge flipping upcoming -> active shows correct totals for steps logged before the flip.
- Leaving a challenge removes the user from the leaderboard.
- The drift query returns zero rows after running reconcile_all_challenge_steps().
```

Implemented in `supabase/setup.sql` (P1.1 section), `README.md` Maintenance, `src/lib/__tests__/challenge-sync-client.test.ts`.

---

## P2 — Web Push notifications ✅

Implemented: `push_subscriptions` schema, `src/app/sw.ts` push handlers, `src/hooks/usePushNotifications.ts`, settings UI, edge functions (`send-push`, `daily-nudge`, `notify-chat-message`). See README **Web Push (P2)**.

---

## P2.1 — Push timing and persistence (patch) ✅

Implemented: `profiles.timezone`, `get_users_at_local_nudge_hour()` SQL, hourly nudge cron, notification `category`/`local_date` dedup, persist-before-push in `send-push`, chat `last_read_at` filter. See README Web Push section and `supabase/setup.sql` P2.1.

---

## P2.1 — Push timing and persistence (reference prompt)

```
Read the P2 section of supabase/setup.sql, supabase/functions/daily-nudge, supabase/functions/send-push,
supabase/functions/notify-chat-message, and src/utils/date.ts before writing anything. Additive SQL only —
append a P2.1 section.

P2 ships nudges on a fixed 19:00 UTC cron with no per-user timezone, and the delivery path may not be
persisting notifications rows. Three fixes.

1. Per-user timezone
   - Add profiles.timezone text, default 'UTC', IANA zone names only.
   - Capture it client-side on login and on app load from
     Intl.DateTimeFormat().resolvedOptions().timeZone, writing only when it differs from the stored
     value. Do not prompt the user; make it silent with an override select in settings/profile.
   - Backfill existing rows to 'UTC'.

2. Timezone-correct nudge scheduling
   - Change the daily-nudge cron to hourly: 0 * * * *.
   - Each run selects only users whose LOCAL hour is 19, computed as
     (now() AT TIME ZONE profiles.timezone). Do the filtering in SQL, not in TypeScript, so the
     function never loads the full user table.
   - "Today" for the goal and streak checks must be the user's local date in their timezone, matching
     the date strings the client writes via utils/date. Verify against a user in Asia/Kolkata and one
     in America/Los_Angeles — a UTC date comparison reads the wrong daily_activity row for both.
   - Challenge start/end notices use the challenge's own date fields, unchanged.
   - Add Vitest coverage for the local-date resolution helper, including a DST boundary in a zone that
     observes it.

3. Persist every send
   - send-push must insert a notifications row for each recipient in the same invocation, before or
     alongside the push attempt, so an in-app record exists even when the push fails or the user has
     no subscription. This is the table P3 reads.
   - Idempotency: unique constraint on (user_id, category, local_date) for the scheduled categories so
     a cron retry cannot double-send. daily-nudge checks for an existing row and skips rather than
     erroring. Chat and cheer notifications are exempt from this constraint.
   - notify-chat-message must exclude the message sender from recipients, and should skip users whose
     last_read_at on that room is newer than the message.

ACCEPTANCE
- A user in Asia/Kolkata receives the goal nudge at 19:00 IST, not 00:30.
- The goal check reads the same daily_activity row the client wrote for that local day.
- Running daily-nudge twice in the same hour sends once.
- Every push has a matching notifications row; a user with push disabled still gets the row.
- Sending a chat message does not notify yourself.
```

---

## P2 — Web Push notifications (reference prompt)

```
Read src/app/sw.ts, next.config.ts, src/app/settings/notifications, supabase/setup.sql, and the Serwist 9 docs in node_modules/@serwist before starting. Next.js 16 — do not assume older App Router APIs.

GOAL
Deliver real push notifications for: daily goal not yet met (evening nudge), streak about to break,
challenge started, challenge ended with final rank, and new chat message when the app is closed.

1. Schema (additive, append to setup.sql):
   - Table push_subscriptions: id, user_id fk auth.users, endpoint text unique, p256dh text, auth text,
     user_agent text, created_at, last_seen_at. RLS: users manage only their own rows; service_role full.
   - Extend app_settings with granular boolean columns if not present:
     push_daily_goal, push_streak, push_challenge, push_chat. Default true except push_chat default false.

2. Service worker (src/app/sw.ts): add push and notificationclick handlers alongside the Serwist setup.
   Payload shape { title, body, url, tag }. notificationclick focuses an existing client on that URL or
   opens a new one. Use tag to collapse duplicate nudges.

3. Client (src/hooks/usePushNotifications.ts, new):
   - Feature-detect Notification and PushManager; iOS requires the PWA be installed to home screen —
     detect standalone mode and surface an explanatory state instead of a dead button.
   - requestPermission -> subscribe with NEXT_PUBLIC_VAPID_PUBLIC_KEY -> persist to push_subscriptions.
   - unsubscribe removes the row. Re-validate the subscription on app load and refresh last_seen_at.

4. Settings UI (src/app/settings/notifications): master enable toggle wired to the hook plus the four
   category toggles persisted to app_settings. Show permission state clearly (default / granted / denied)
   and, when denied, instructions to re-enable in browser settings. Reuse components/ui primitives.

5. Edge Function supabase/functions/send-push/index.ts:
   - Uses npm:web-push with VAPID keys from env.
   - Accepts { user_ids, category, title, body, url } from a trusted caller (verify service-role key or
     a shared secret header). Filters recipients by their app_settings category flag.
   - Deletes subscriptions that return 404 or 410.

6. Edge Function supabase/functions/daily-nudge/index.ts, invoked by a Supabase scheduled cron:
   - 19:00 local-equivalent run: users with push_daily_goal true whose today steps < daily_goal.
   - Streak check: users whose streak >= 3 and today steps = 0.
   - Challenge lifecycle: challenges transitioning to active or completed today, notify members;
     for completed, include final rank from challenge_leaderboard.
   - Idempotent per user per day — record sends in the existing notifications table and skip duplicates.

7. Env: add NEXT_PUBLIC_VAPID_PUBLIC_KEY to .env.example and document generating a VAPID pair
   (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY as Edge Function secrets) in README.

ACCEPTANCE
- Installed PWA on Android and desktop Chrome receives a test push.
- Denied permission never crashes the settings page.
- Disabling a category stops that category only.
- No auth-sensitive route caching is introduced into the service worker.
```

---

## P3 — In-app notification center ✅

Implemented: `lib/notifications/service.ts`, `hooks/useNotifications.tsx`, `/notifications` page, AppShell bell (combined header badge), offline cache + mark-read queue, `notifications.url` column, Realtime enabled. Carry-over: nudge hour window 19–22, per-row `ignoreDuplicates` insert.

---

## P3 — In-app notification center (reference prompt)

---

## P4 — Streaks and social layer ✅

**Shipped:** timezone-aware streak UI (`StreakBadge` on `/home`), `challenge_cheers` with RLS, leaderboard cheer controls, `challenge_activity` view + feed on challenge detail, `notify-cheer` edge function (category `challenge` notifications, `push_challenge` delivery, rate limit **20** cheer notifications per sender→recipient per day).

**P3 test backfill:** `lib/notifications/__tests__/service.test.ts` (keyset pagination), `lib/offline/__tests__/notification-queue.test.ts`, `lib/notifications/__tests__/offline-sync.test.ts`.

**Deploy:** Run P4 section in `supabase/setup.sql`; deploy `notify-cheer` edge function.

---

## P5 — Dashboard performance pass ✅

**Shipped:** Server-rendered `/home` (`loadHomePageData` parallel fetch), `home-client.tsx` for interactions, `loading.tsx` skeleton (includes streak row), SWR for post-write step revalidation only (`revalidateOnFocus: false`), session period cache (D/W/M prefetched), dynamic Recharts import, cheer notify moved to DB webhook on `challenge_cheers` INSERT.

**Build size (`.next/static/chunks` total):** before P5 **1,942,152 bytes** → after P5 **1,898,706 bytes** (−43,446 bytes / ~2.2%).

**Deploy:** Add `challenge_cheers` INSERT webhook → `notify-cheer` (see README).

---

## P6 — Admin panel v2 ✅

**Shipped:** Server-rendered `/admin` with paginated users/challenges (25/page, `range()`), `admin_metrics` + `admin_user_list` views, RLS admin UPDATE on profiles/challenges, `is_active` + `/blocked` middleware, mutations via server actions + confirm dialogs, CSV export, `reconcile_all_challenge_steps` repair button, challenge date edits call `backfill_challenge_steps`.

**Carry-over:** Restored P1–P4 SQL append to `setup.sql` from stash snapshot (`stash@{0}` preserved). Added `lib/home/__tests__/server.test.ts`.

**FCP (/home):** P5 eliminated 4–6 post-hydration client fetches (profile, settings, activity ranges, streak, leaderboard); streak badge now in initial HTML. Estimated **~400–900ms FCP improvement** on mid-tier mobile vs client waterfall (architectural; no lab trace in CI).

---

## P7 — Profile avatars ✅

**Shipped:** `avatars` storage bucket + path-prefix RLS, profile upload with square crop/zoom, WebP compression via OffscreenCanvas + worker fallback, orphan cleanup on replace, shared `Avatar` component across leaderboard/chat/activity feed/admin/settings.

**Carry-over:** Deduplicated `get_users_at_local_nudge_hour` (removed stale P2 `= 19` copy) and redundant P6 `profiles_update` recreate. FCP unmeasured (no Lighthouse production trace in CI).

**Tests:** 62 total (+9): avatar Zod validation, storage policy SQL, Avatar initials.

---

## P8 — E2E, accessibility, housekeeping ✅

**Shipped:** Playwright suite (mobile + desktop CI), axe scans, focus-trap Sheet, chart data table toggle, contrast fixes for yellow/green/cyan on light, migrations split + verify script, STRIDEUP.md, avatar content-hash paths.

**FCP:** Measured via Playwright Performance API on authenticated `/home` in CI (`e2e/fcp.spec.ts`). No pre-P5 baseline available.

---

## Post-web track

---

## P9 — Native step counting (separate platform track)

```
Do not start until P1–P8 are merged and stable. This changes the distribution model.

CONTEXT
BrowserMotionProvider using DeviceMotionEvent cannot count steps in the background, which is the single
largest functional gap in the product. The step provider pattern in lib/steps/providers/base.ts was
designed for this swap.

1. Wrap the existing Next.js app with Capacitor rather than rewriting in React Native. Keep the web
   build as the canonical app; the native shell loads the same routes.

2. New providers implementing the base interface:
   - health-connect.ts (Android): Health Connect steps aggregation, permission request flow,
     read historical steps for backfill on first grant.
   - healthkit.ts (iOS): HealthKit step count, permission flow, background delivery observer.
   Both write into the same daily_activity path with source 'motion' and let P1's trigger handle
   challenge aggregation.

3. Provider selection: capability detection at runtime — native provider if available, else browser
   motion, else manual. The step-counter setup page in settings must explain which is active and
   what each can and cannot do, including that browser motion stops when the app is backgrounded.

4. Reconciliation: native health data is authoritative over browser motion. Update the priority chain
   in lib/calculations to import > native > manual > motion, with tests.

5. Document the native build, signing, and store submission steps in a new NATIVE.md. Do not commit
   any signing material.

ACCEPTANCE
- Steps accumulate with the app closed on both platforms.
- Web-only users are entirely unaffected.
- Permission denial degrades to manual entry with a clear explanation, never a broken screen.
```

---

## Sequencing rationale

P1 first because every leaderboard number is currently suspect and P4/P6 build on it. P2 and P3 ship together as the retention layer. P5 before P6 so the Server Component pattern is established before the admin rewrite. P9 last because it changes how the app is distributed, not just what it does.
