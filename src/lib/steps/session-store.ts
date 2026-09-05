import { openDB, type IDBPDatabase } from "idb";

const DB_NAME = "strideup-motion";
const STORE = "walk-session";
const DB_VERSION = 1;

export interface WalkSessionRecord {
  userId: string;
  sessionId: string;
  /** Steps detected this walk session (total). */
  accumulatedSteps: number;
  /** Steps already flushed to the activity service. */
  flushedSteps: number;
  startedAt: number;
  updatedAt: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "userId" });
        }
      },
    });
  }
  return dbPromise;
}

export async function loadWalkSession(userId: string): Promise<WalkSessionRecord | null> {
  const db = await getDB();
  return (await db.get(STORE, userId)) ?? null;
}

export async function saveWalkSession(record: WalkSessionRecord): Promise<void> {
  const db = await getDB();
  await db.put(STORE, record);
}

export async function clearWalkSession(userId: string): Promise<void> {
  const db = await getDB();
  await db.delete(STORE, userId);
}

/** Unflushed steps that should be reconciled on next load. */
export function unflushedSteps(record: WalkSessionRecord | null): number {
  if (!record) return 0;
  return Math.max(0, record.accumulatedSteps - record.flushedSteps);
}
