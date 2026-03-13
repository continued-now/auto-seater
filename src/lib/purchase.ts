// Purchase token management (client-side)

const PURCHASE_KEY = 'autoseater_purchase';

export interface PurchaseRecord {
  sessionId: string;
  email: string;
  purchasedAt: number;
  verified: boolean;
}

export function getPurchase(): PurchaseRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PURCHASE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PurchaseRecord;
  } catch {
    return null;
  }
}

export function savePurchase(record: PurchaseRecord): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PURCHASE_KEY, JSON.stringify(record));
}

export function clearPurchase(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PURCHASE_KEY);
}

export function isPro(): boolean {
  const purchase = getPurchase();
  return purchase !== null && purchase.verified;
}

// Free tier limits
export const FREE_GUEST_LIMIT = 50;
export const FREE_ROOM_LIMIT = 1;
