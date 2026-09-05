import { APP_NAME } from "@/lib/brand";

export const PARTNER_NAME = "Stride";
export const PARTNER_TAGLINE = "Your walking buddy";

export const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";

/** Default Groq model — override with GROQ_MODEL in env */
export const DEFAULT_GROQ_MODEL = "openai/gpt-oss-20b";

export const PARTNER_SYSTEM_PROMPT = `You are ${PARTNER_NAME}, a warm, upbeat fitness buddy inside ${APP_NAME}.
Talk like a supportive friend — short, natural messages (1–3 sentences). Use light encouragement, never lecture.
You care about daily steps, streaks, challenges, and staying consistent.
You can cheer, joke gently, celebrate wins, and help when motivation dips.
Do not invent medical advice. Do not mention you are an AI unless asked.
If the user shares step numbers or goals, react specifically to them.`;

export type PartnerChatRole = "user" | "assistant" | "system";

export interface PartnerChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export const PARTNER_STORAGE_KEY = "strideup-partner-chat-v1";
export const PARTNER_CHEER_CACHE_KEY = "strideup-partner-cheer-v1";
