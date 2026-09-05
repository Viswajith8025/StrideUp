import type { LeaderboardEntry } from "@/types/database";
import type { AdminUserRow } from "@/lib/admin/types";

function escapeCsv(value: string | number | boolean | null | undefined): string {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportUsersToCSV(users: AdminUserRow[]): string {
  const header = "user_id,display_name,role,is_active,total_steps,created_at";
  const lines = users.map((user) =>
    [
      escapeCsv(user.user_id),
      escapeCsv(user.display_name),
      escapeCsv(user.role),
      escapeCsv(user.is_active),
      escapeCsv(user.total_steps),
      escapeCsv(user.created_at),
    ].join(",")
  );
  return [header, ...lines].join("\n");
}

export function exportLeaderboardToCSV(entries: LeaderboardEntry[]): string {
  const header = "rank,user_id,display_name,total_steps";
  const lines = entries.map((entry) =>
    [
      escapeCsv(entry.rank),
      escapeCsv(entry.user_id),
      escapeCsv(entry.display_name),
      escapeCsv(entry.total_steps),
    ].join(",")
  );
  return [header, ...lines].join("\n");
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
