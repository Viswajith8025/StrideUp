import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildSystemMessage, callGroqChat, PartnerConfigError } from "@/lib/partner/groq";

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { messages?: IncomingMessage[]; context?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const history = (body.messages ?? [])
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .map((m) => ({ role: m.role, content: m.content.trim() }))
    .filter((m) => m.content.length > 0)
    .slice(-20);

  if (history.length === 0 || history[history.length - 1]?.role !== "user") {
    return NextResponse.json({ error: "Send a user message" }, { status: 400 });
  }

  const lastUser = history[history.length - 1].content;
  if (lastUser.length > 2000) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  try {
    const contextLine =
      typeof body.context === "string" && body.context.trim()
        ? `User context: ${body.context.trim().slice(0, 500)}`
        : undefined;

    const reply = await callGroqChat({
      messages: [buildSystemMessage(contextLine), ...history],
    });

    return NextResponse.json({ reply });
  } catch (error) {
    if (error instanceof PartnerConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    const message = error instanceof Error ? error.message : "Partner unavailable";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
