import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadAdminPageData, isAdminUser } from "@/lib/admin/server";
import { AdminClient } from "./admin-client";

interface AdminPageProps {
  searchParams: Promise<{
    up?: string;
    cp?: string;
    q?: string;
    sort?: string;
    status?: string;
  }>;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = await isAdminUser(supabase, user.id);
  if (!admin) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center text-muted">
        Admin access required
      </div>
    );
  }

  const params = await searchParams;
  const data = await loadAdminPageData(supabase, {
    userPage: Math.max(1, parseInt(params.up ?? "1", 10) || 1),
    challengePage: Math.max(1, parseInt(params.cp ?? "1", 10) || 1),
    userSearch: params.q,
    userSort: params.sort === "total_steps" ? "total_steps" : "created_at",
    userSortDir: "desc",
    challengeStatus:
      params.status === "upcoming" ||
      params.status === "active" ||
      params.status === "completed" ||
      params.status === "cancelled"
        ? params.status
        : "all",
  });

  return (
    <Suspense fallback={<div className="py-20 text-center text-muted">Loading admin…</div>}>
      <AdminClient data={data} />
    </Suspense>
  );
}
