import type { Guest, Household, SocialCircle } from '@/types/guest';
import type { VenueConfig, VenueTemplate } from '@/types/venue';
import type { Constraint } from '@/types/constraint';

const DB_NAME = 'auto-seater';
const DB_VERSION = 1;
const STORE_NAME = 'state';

export interface EventMeta {
  id: string;
  name: string;
  updatedAt: number;
}

export interface EventSnapshot {
  guests: Guest[];
  households: Household[];
  socialCircles: SocialCircle[];
  venue: VenueConfig;
  constraints: Constraint[];
  templates: VenueTemplate[];
  meta: EventMeta;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function eventKey(id: string): string {
  return `event:${id}`;
}

export async function listEvents(): Promise<EventMeta[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAllKeys();
    const keys: IDBValidKey[] = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const eventKeys = keys.filter(
      (k) => typeof k === 'string' && k.startsWith('event:')
    ) as string[];

    const metas: EventMeta[] = [];
    for (const key of eventKeys) {
      const getReq = store.get(key);
      const data: EventSnapshot | undefined = await new Promise((resolve, reject) => {
        getReq.onsuccess = () => resolve(getReq.result);
        getReq.onerror = () => reject(getReq.error);
      });
      if (data?.meta) {
        metas.push(data.meta);
      }
    }

    // Sort by most recently updated first
    metas.sort((a, b) => b.updatedAt - a.updatedAt);
    return metas;
  } catch {
    console.warn('Failed to list events from IndexedDB');
    return [];
  }
}

export async function saveEvent(
  id: string,
  name: string,
  snapshot: Omit<EventSnapshot, 'meta'>
): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const data: EventSnapshot = {
      ...snapshot,
      meta: { id, name, updatedAt: Date.now() },
    };
    store.put(data, eventKey(id));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    console.warn('Failed to save event to IndexedDB');
  }
}

export async function loadEvent(id: string): Promise<EventSnapshot | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(eventKey(id));
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result ?? null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

export async function deleteEvent(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(eventKey(id));
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    console.warn('Failed to delete event from IndexedDB');
  }
}
