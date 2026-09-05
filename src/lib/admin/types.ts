import type { ChallengeStatus } from "@/types/database";

export const ADMIN_PAGE_SIZE = 25;

export type AdminUserSort = "created_at" | "total_steps";
export type AdminSortDir = "asc" | "desc";

export interface AdminUserRow {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  role: string;
  is_active: boolean;
  daily_step_goal: number;
  created_at: string;
  total_steps: number;
}

export interface AdminMetrics {
  dau_30d: number;
  total_steps_this_week: number;
  active_challenges: number;
  new_signups_this_week: number;
  push_subscription_count: number;
}

export interface AdminUsersQuery {
  page: number;
  search?: string;
  sort: AdminUserSort;
  sortDir: AdminSortDir;
}

export interface AdminUsersResult {
  users: AdminUserRow[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminChallengesQuery {
  page: number;
  status?: ChallengeStatus | "all";
}

export interface AdminChallengesResult {
  challenges: import("@/types/database").Challenge[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminPageData {
  metrics: AdminMetrics;
  users: AdminUsersResult;
  challenges: AdminChallengesResult;
}
