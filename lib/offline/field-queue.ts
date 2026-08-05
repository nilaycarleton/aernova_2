/**
 * Retries when the signal comes back.
 *
 * The whole offline strategy in one sentence, chosen over a full sync engine
 * because a crew member on a roof needs "it'll go through when I have bars
 * again," not local-first conflict resolution — that's a different product,
 * see PLAN-CRM.md item 32. No service worker, no background sync API: both
 * need a registration lifecycle this app has never had (see AGNOSTIC: nothing
 * in this repo touches `serviceWorker` today). A plain IndexedDB queue plus an
 * `online` listener does the same job for the one screen that needs it.
 *
 * A photo is the thing most likely to fail on a bad connection, so it's kept
 * as a `Blob` rather than re-read from a `<input type=file>` a second time —
 * the file picker's selection doesn't survive a page reload either way, but it
 * does survive going in and out of range while the tab stays open.
 */

const DB_NAME = "aernova-field-queue";
const STORE = "pending";

export type QueuedItem =
  | { type: "photo"; jobId: string; visitId: string; blob: Blob; fileName: string; contentType: string; caption: string }
  | { type: "note"; jobId: string; visitId: string; note: string }
  | { type: "complete"; jobId: string; visitId: string };

export type StoredItem = QueuedItem & { id: number; queuedAt: number };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueue(item: QueuedItem): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add({ ...item, queuedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function listPending(): Promise<StoredItem[]> {
  const db = await openDb();
  const items = await new Promise<StoredItem[]>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result as StoredItem[]);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return items.sort((a, b) => a.queuedAt - b.queuedAt);
}

export async function remove(id: number): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export type QueueRunners = {
  uploadPhoto(item: Extract<QueuedItem, { type: "photo" }>): Promise<void>;
  saveNote(item: Extract<QueuedItem, { type: "note" }>): Promise<void>;
  complete(item: Extract<QueuedItem, { type: "complete" }>): Promise<void>;
};

/**
 * Replays the queue oldest-first, stopping at the first failure rather than
 * skipping past it — a photo out of order is a minor confusion, but silently
 * dropping one because the item behind it in the queue happened to succeed is
 * a worse one. Whatever called this just tries again next time the signal
 * comes back (`online` event or the panel's own poll).
 */
export async function flushQueue(runners: QueueRunners): Promise<number> {
  const items = await listPending();
  let flushed = 0;
  for (const item of items) {
    try {
      if (item.type === "photo") await runners.uploadPhoto(item);
      else if (item.type === "note") await runners.saveNote(item);
      else await runners.complete(item);
      await remove(item.id);
      flushed += 1;
    } catch {
      break;
    }
  }
  return flushed;
}
