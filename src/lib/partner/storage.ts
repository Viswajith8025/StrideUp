import {
  PARTNER_STORAGE_KEY,
  PARTNER_CHEER_CACHE_KEY,
  type PartnerChatMessage,
} from "./constants";

const MAX_STORED = 80;

export function loadPartnerMessages(userId: string): PartnerChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`${PARTNER_STORAGE_KEY}:${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PartnerChatMessage[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePartnerMessages(userId: string, messages: PartnerChatMessage[]) {
  if (typeof window === "undefined") return;
  const trimmed = messages.slice(-MAX_STORED);
  localStorage.setItem(`${PARTNER_STORAGE_KEY}:${userId}`, JSON.stringify(trimmed));
}

export function clearPartnerMessages(userId: string) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(`${PARTNER_STORAGE_KEY}:${userId}`);
}

interface CheerCache {
  date: string;
  message: string;
}

export function loadCachedCheer(userId: string, date: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${PARTNER_CHEER_CACHE_KEY}:${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CheerCache;
    if (parsed.date === date && parsed.message) return parsed.message;
    return null;
  } catch {
    return null;
  }
}

export function saveCachedCheer(userId: string, date: string, message: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    `${PARTNER_CHEER_CACHE_KEY}:${userId}`,
    JSON.stringify({ date, message })
  );
}
