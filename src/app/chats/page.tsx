import { redirect } from "next/navigation";

/** Challenge chat lives on challenge detail. Keep /chats/[roomId] for deep links. */
export default function ChatsIndexPage() {
  redirect("/challenges");
}
