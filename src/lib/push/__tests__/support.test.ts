import { describe, it, expect } from "vitest";
import { urlBase64ToUint8Array, getPushSupportState } from "@/lib/push/support";

describe("urlBase64ToUint8Array", () => {
  it("decodes a URL-safe base64 VAPID key fragment", () => {
    const encoded = btoa("test-key-bytes");
    const urlSafe = encoded.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const bytes = urlBase64ToUint8Array(urlSafe);
    expect(bytes.length).toBeGreaterThan(0);
    expect(bytes[0]).toBe("test-key-bytes".charCodeAt(0));
  });
});

describe("getPushSupportState", () => {
  it("reports unsupported outside browser contexts used by tests", () => {
    const state = getPushSupportState();
    expect(state.permission).toBe("unsupported");
  });
});
