import type { SupabaseClient } from "@supabase/supabase-js";
import type { Challenge, ChallengeStatus } from "@/types/database";
import {
  ADMIN_PAGE_SIZE,
  type AdminChallengesQuery,
  type AdminChallengesResult,
  type AdminMetrics,
  type AdminPageData,
  type AdminUserRow,
  type AdminUsersQuery,
  type AdminUsersResult,
} from "./types";

export async function loadAdminMetrics(supabase: SupabaseClient): Promise<AdminMetrics> {
  const { data, error } = await supabase.from("admin_metrics").select("*").single();
  if (error) throw error;
  return {
    dau_30d: Number(data.dau_30d ?? 0),
    total_steps_this_week: Number(data.total_steps_this_week ?? 0),
    active_challenges: Number(data.active_challenges ?? 0),
    new_signups_this_week: Number(data.new_signups_this_week ?? 0),
    push_subscription_count: Number(data.push_subscription_count ?? 0),
  };
}

export async function loadAdminUsers(
  supabase: SupabaseClient,
  { page, search, sort, sortDir }: AdminUsersQuery
): Promise<AdminUsersResult> {
  const from = (page - 1) * ADMIN_PAGE_SIZE;
  const to = from + ADMIN_PAGE_SIZE - 1;

  let query = supabase.from("admin_user_list").select("*", { count: "exact" });

  if (search?.trim()) {
    query = query.ilike("display_name", `%${search.trim()}%`);
  }

  query = query.order(sort, { ascending: sortDir === "asc" }).range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;

  return {
    users: (data ?? []) as AdminUserRow[],
    total: count ?? 0,
    page,
    pageSize: ADMIN_PAGE_SIZE,
  };
}

export async function loadAdminChallenges(
  supabase: SupabaseClient,
  { page, status = "all" }: AdminChallengesQuery
): Promise<AdminChallengesResult> {
  const from = (page - 1) * ADMIN_PAGE_SIZE;
  const to = from + ADMIN_PAGE_SIZE - 1;

  let query = supabase.from("challenges").select("*", { count: "exact" });

  if (status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);
  if (error) throw error;

  return {
    challenges: (data ?? []) as Challenge[],
    total: count ?? 0,
    page,
    pageSize: ADMIN_PAGE_SIZE,
  };
}

export interface AdminPageQuery {
  userPage?: number;
  userSearch?: string;
  userSort?: AdminUsersQuery["sort"];
  userSortDir?: AdminUsersQuery["sortDir"];
  challengePage?: number;
  challengeStatus?: ChallengeStatus | "all";
}

export async function loadAdminPageData(
  supabase: SupabaseClient,
  query: AdminPageQuery = {}
): Promise<AdminPageData> {
  const [metrics, users, challenges] = await Promise.all([
    loadAdminMetrics(supabase),
    loadAdminUsers(supabase, {
      page: query.userPage ?? 1,
      search: query.userSearch,
      sort: query.userSort ?? "created_at",
      sortDir: query.userSortDir ?? "desc",
    }),
    loadAdminChallenges(supabase, {
      page: query.challengePage ?? 1,
      status: query.challengeStatus ?? "all",
    }),
  ]);

  return { metrics, users, challenges };
}

export async function isAdminUser(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data } = await supabase.from("profiles").select("role").eq("user_id", userId).single();
  return data?.role === "admin";
}
