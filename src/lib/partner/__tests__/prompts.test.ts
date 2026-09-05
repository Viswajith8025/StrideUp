import { describe, it, expect } from "vitest";
import { PARTNER_NAME, PARTNER_SYSTEM_PROMPT } from "@/lib/partner/constants";
import { buildSystemMessage } from "@/lib/partner/groq";

describe("partner prompts", () => {
  it("includes partner name in system prompt", () => {
    expect(PARTNER_SYSTEM_PROMPT).toContain(PARTNER_NAME);
  });

  it("buildSystemMessage appends optional context", () => {
    const msg = buildSystemMessage("Name: Jithu");
    expect(msg.role).toBe("system");
    expect(msg.content).toContain("Name: Jithu");
    expect(msg.content).toContain(PARTNER_NAME);
  });
});
