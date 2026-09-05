import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildSystemMessage, callGroqChat, PartnerConfigError } from "@/lib/partner/groq";
import { PARTNER_NAME } from "@/lib/partner/constants";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    displayName?: string;
    steps?: number;
    goal?: number;
    streak?: number;
  } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const name = body.displayName?.trim() || "friend";
  const steps = typeof body.steps === "number" ? body.steps : null;
  const goal = typeof body.goal === "number" ? body.goal : null;
  const streak = typeof body.streak === "number" ? body.streak : null;

  const prompt = [
    `Write one short cheering message as ${PARTNER_NAME} to ${name}.`,
    "Sound like a real friend texting — warm, specific, under 35 words.",
    "No hashtags. No bullet points. One or two sentences only.",
    steps != null ? `Today's steps so far: ${steps}.` : "",
    goal != null ? `Daily goal: ${goal}.` : "",
    streak != null && streak > 0 ? `Current streak: ${streak} days.` : "",
  ]
    .filter(Boolean)
    .join(" ");

  try {
    const message = await callGroqChat({
      messages: [
        buildSystemMessage("You are writing a single cheer / pep-talk message."),
        { role: "user", content: prompt },
      ],
      temperature: 0.9,
      maxTokens: 80,
    });
    return NextResponse.json({ message });
  } catch (error) {
    if (error instanceof PartnerConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    const fallback = steps != null && goal != null && steps >= goal
      ? `Crushing it, ${name} — goal already in the bag. Proud of you!`
      : `Hey ${name} — every step counts. I'm right here with you. Let's keep moving.`;
    return NextResponse.json({
      message: fallback,
      fallback: true,
      error: error instanceof Error ? error.message : undefined,
    });
  }
}
