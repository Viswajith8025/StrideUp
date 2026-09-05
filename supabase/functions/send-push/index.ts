import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, isAuthorized, jsonResponse } from "../_shared/auth.ts";
import { getServiceClient, sendPushToUsers, type PushCategory } from "../_shared/push.ts";

interface SendPushRequest {
  test?: boolean;
  user_ids?: string[];
  category?: PushCategory;
  title: string;
  body: string;
  url?: string;
  tag?: string;
  notification_type?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as SendPushRequest;

    if (body.test) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
      const authHeader = req.headers.get("Authorization");

      if (!supabaseUrl || !supabaseAnonKey || !authHeader) {
        return jsonResponse({ error: "Unauthorized" }, 401);
      }

      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: userError } = await userClient.auth.getUser();
      if (userError || !user) return jsonResponse({ error: "Unauthorized" }, 401);

      const supabase = getServiceClient();
      const result = await sendPushToUsers(supabase, {
        user_ids: [user.id],
        category: body.category ?? "push_daily_goal",
        title: body.title,
        body: body.body,
        url: body.url ?? "/home",
        tag: body.tag ?? "strideup-test",
        notification_type: "push:test",
        skipPreferenceCheck: true,
      });

      return jsonResponse({ ok: true, ...result });
    }

    if (!isAuthorized(req)) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    if (!body.user_ids?.length || !body.category) {
      return jsonResponse({ error: "user_ids and category are required" }, 400);
    }

    const supabase = getServiceClient();
    const result = await sendPushToUsers(supabase, {
      user_ids: body.user_ids,
      category: body.category,
      title: body.title,
      body: body.body,
      url: body.url ?? "/home",
      tag: body.tag,
      notification_type: body.notification_type,
    });

    return jsonResponse({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});
