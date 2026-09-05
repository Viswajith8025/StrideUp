import { corsHeaders, isAuthorized, jsonResponse } from "../_shared/auth.ts";
import { getServiceClient, alreadySentScheduled, sendPushToUsers } from "../_shared/push.ts";
import { subtractDaysFromDateString, streakThroughYesterday } from "../_shared/date.ts";

interface NudgeCandidate {
  user_id: string;
  timezone: string;
  local_date: string;
  daily_step_goal: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!isAuthorized(req)) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  try {
    const supabase = getServiceClient();
    const todayUtc = new Date().toISOString().slice(0, 10);

    const { data: candidates, error: candidatesError } = await supabase.rpc(
      "get_users_at_local_nudge_hour"
    );
    if (candidatesError) throw candidatesError;

    let sent = 0;
    let persisted = 0;

    for (const row of (candidates ?? []) as NudgeCandidate[]) {
      const userId = row.user_id;
      const localDate = row.local_date;
      const goal = row.daily_step_goal ?? 6000;

      const { data: settings } = await supabase
        .from("app_settings")
        .select("push_daily_goal, push_streak")
        .eq("user_id", userId)
        .single();

      const { data: todayActivity } = await supabase
        .from("daily_activity")
        .select("steps")
        .eq("user_id", userId)
        .eq("date", localDate)
        .maybeSingle();

      const todaySteps = todayActivity?.steps ?? 0;

      if (
        settings?.push_daily_goal &&
        todaySteps < goal &&
        !(await alreadySentScheduled(supabase, userId, "push_daily_goal", localDate))
      ) {
        const result = await sendPushToUsers(supabase, {
          user_ids: [userId],
          category: "push_daily_goal",
          title: "Keep moving!",
          body: `You are at ${todaySteps.toLocaleString()} / ${goal.toLocaleString()} steps today.`,
          url: "/home",
          tag: `push:daily_goal:${localDate}`,
          notification_type: `push:daily_goal:${localDate}`,
          local_date: localDate,
        });
        sent += result.sent;
        persisted += result.persisted;
      }

      if (
        settings?.push_streak &&
        todaySteps === 0 &&
        !(await alreadySentScheduled(supabase, userId, "push_streak", localDate))
      ) {
        const rangeStart = subtractDaysFromDateString(localDate, 30);
        const { data: activities } = await supabase
          .from("daily_activity")
          .select("date, steps")
          .eq("user_id", userId)
          .gte("date", rangeStart)
          .lte("date", localDate);

        const streak = streakThroughYesterday(activities ?? [], goal, localDate);
        if (streak >= 3) {
          const result = await sendPushToUsers(supabase, {
            user_ids: [userId],
            category: "push_streak",
            title: "Don't break your streak",
            body: `You are on a ${streak}-day streak. Log some steps before the day ends.`,
            url: "/home",
            tag: `push:streak:${localDate}`,
            notification_type: `push:streak:${localDate}`,
            local_date: localDate,
          });
          sent += result.sent;
          persisted += result.persisted;
        }
      }
    }

    const { data: startingChallenges } = await supabase
      .from("challenges")
      .select("id, name, start_date")
      .eq("start_date", todayUtc)
      .eq("status", "active");

    for (const challenge of startingChallenges ?? []) {
      const challengeDate = challenge.start_date as string;
      const { data: members } = await supabase
        .from("challenge_members")
        .select("user_id")
        .eq("challenge_id", challenge.id);

      for (const member of members ?? []) {
        const userId = member.user_id as string;
        if (await alreadySentScheduled(supabase, userId, "push_challenge", challengeDate)) continue;

        const result = await sendPushToUsers(supabase, {
          user_ids: [userId],
          category: "push_challenge",
          title: "Challenge started",
          body: `${challenge.name} is now active. Good luck!`,
          url: `/challenges/${challenge.id}`,
          tag: `push:challenge_start:${challenge.id}:${challengeDate}`,
          notification_type: `push:challenge_start:${challenge.id}:${challengeDate}`,
          local_date: challengeDate,
        });
        sent += result.sent;
        persisted += result.persisted;
      }
    }

    const { data: endingChallenges } = await supabase
      .from("challenges")
      .select("id, name, end_date")
      .eq("end_date", todayUtc)
      .eq("status", "completed");

    for (const challenge of endingChallenges ?? []) {
      const challengeDate = challenge.end_date as string;
      const { data: members } = await supabase
        .from("challenge_members")
        .select("user_id")
        .eq("challenge_id", challenge.id);

      for (const member of members ?? []) {
        const userId = member.user_id as string;
        if (await alreadySentScheduled(supabase, userId, "push_challenge", challengeDate)) continue;

        const { data: rankRow } = await supabase
          .from("challenge_leaderboard")
          .select("rank, total_steps")
          .eq("challenge_id", challenge.id)
          .eq("user_id", userId)
          .maybeSingle();

        const rank = rankRow?.rank ?? "?";
        const totalSteps = rankRow?.total_steps ?? 0;

        const result = await sendPushToUsers(supabase, {
          user_ids: [userId],
          category: "push_challenge",
          title: "Challenge complete",
          body: `${challenge.name} ended. You finished #${rank} with ${totalSteps.toLocaleString()} steps.`,
          url: `/challenges/${challenge.id}`,
          tag: `push:challenge_end:${challenge.id}:${challengeDate}`,
          notification_type: `push:challenge_end:${challenge.id}:${challengeDate}`,
          local_date: challengeDate,
        });
        sent += result.sent;
        persisted += result.persisted;
      }
    }

    return jsonResponse({ ok: true, sent, persisted, candidates: (candidates ?? []).length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});
