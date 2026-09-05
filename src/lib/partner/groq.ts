import {
  DEFAULT_GROQ_MODEL,
  GROQ_CHAT_URL,
  PARTNER_SYSTEM_PROMPT,
} from "./constants";

export class PartnerConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PartnerConfigError";
  }
}

export async function callGroqChat(params: {
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  let apiKey = process.env.GROQ_API_KEY?.trim() ?? "";
  if (
    (apiKey.startsWith('"') && apiKey.endsWith('"')) ||
    (apiKey.startsWith("'") && apiKey.endsWith("'"))
  ) {
    apiKey = apiKey.slice(1, -1).trim();
  }

  if (!apiKey || apiKey === "your-groq-api-key") {
    throw new PartnerConfigError(
      "GROQ_API_KEY is not set. Add your Groq key to .env.local and restart the app."
    );
  }

  const model = (process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL).trim();

  const response = await fetch(GROQ_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: params.temperature ?? 0.8,
      max_tokens: params.maxTokens ?? 220,
      messages: params.messages,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    if (response.status === 401) {
      throw new PartnerConfigError(
        "Groq rejected the API key (401). Check GROQ_API_KEY in .env.local — no quotes/spaces — then fully restart npm run dev."
      );
    }
    throw new Error(`Groq request failed (${response.status}): ${body.slice(0, 200)}`);
  }

  const data = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("Empty response from Groq");
  return content;
}

export function buildSystemMessage(extra?: string) {
  return {
    role: "system" as const,
    content: extra ? `${PARTNER_SYSTEM_PROMPT}\n\n${extra}` : PARTNER_SYSTEM_PROMPT,
  };
}
