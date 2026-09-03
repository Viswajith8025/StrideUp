import { openDB } from "idb";

const DB_NAME = "strideup-offline";
const STORE = "pending-activity";

interface PendingUpdate {
  id?: number;
  userId: string;
  date: string;
  steps: number;
  source: string;
  createdAt: string;
}

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
      }
    },
  });
}

export async function queueActivityUpdate(update: Omit<PendingUpdate, "id" | "createdAt">) {
  const db = await getDB();
  await db.add(STORE, { ...update, createdAt: new Date().toISOString() });
}

export async function getPendingUpdates(): Promise<PendingUpdate[]> {
  const db = await getDB();
  return db.getAll(STORE);
}

export async function clearPendingUpdate(id: number) {
  const db = await getDB();
  await db.delete(STORE, id);
}
