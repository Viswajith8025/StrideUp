import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loadHomePageData } from "@/lib/home/server";
import { HomeClient } from "./home-client";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const initialData = await loadHomePageData(supabase, user.id);

  return <HomeClient initialData={initialData} />;
}
