import { openDB } from "idb";

const DB_NAME = "strideup-offline";
const READS_STORE = "pending-notification-reads";

interface PendingRead {
  id?: number;
  userId: string;
  notificationId: string | null;
  markAll: boolean;
  createdAt: string;
}

async function getDB() {
  return openDB(DB_NAME, 2, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1 && !db.objectStoreNames.contains("pending-activity")) {
        db.createObjectStore("pending-activity", { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(READS_STORE)) {
        db.createObjectStore(READS_STORE, { keyPath: "id", autoIncrement: true });
      }
    },
  });
}

export async function queueMarkRead(userId: string, notificationId: string) {
  const db = await getDB();
  await db.add(READS_STORE, {
    userId,
    notificationId,
    markAll: false,
    createdAt: new Date().toISOString(),
  });
}

export async function queueMarkAllRead(userId: string) {
  const db = await getDB();
  await db.add(READS_STORE, {
    userId,
    notificationId: null,
    markAll: true,
    createdAt: new Date().toISOString(),
  });
}

export async function getPendingReads(): Promise<PendingRead[]> {
  const db = await getDB();
  return db.getAll(READS_STORE);
}

export async function clearPendingRead(id: number) {
  const db = await getDB();
  await db.delete(READS_STORE, id);
}
