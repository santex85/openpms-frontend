import type { FolioTransactionRead } from "@/api/folio";

function parseAmt(s: string): number {
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export interface FolioComputedTotals {
  chargesGross: number;
  roomCharges: number;
  extrasCharges: number;
  paymentsTotal: number;
}

const ROOM_CATEGORIES = new Set([
  "room",
  "room_charge",
  "accommodation",
  "lodging",
  "stay",
]);

export function isRoomLikeFolioCategory(category: string): boolean {
  const c = category.trim().toLowerCase();
  if (ROOM_CATEGORIES.has(c)) {
    return true;
  }
  return c.includes("room") && !c.includes("service");
}

export function computeFolioTotals(
  transactions: FolioTransactionRead[]
): FolioComputedTotals {
  let chargesGross = 0;
  let roomCharges = 0;
  let extrasCharges = 0;
  let paymentsTotal = 0;

  for (const t of transactions) {
    const typ = t.transaction_type.trim().toLowerCase();
    const amt = parseAmt(t.amount);
    if (typ === "payment") {
      paymentsTotal += Math.abs(amt);
      continue;
    }
    if (typ === "charge") {
      chargesGross += amt;
      if (isRoomLikeFolioCategory(t.category)) {
        roomCharges += amt;
      } else {
        extrasCharges += amt;
      }
    }
  }

  return { chargesGross, roomCharges, extrasCharges, paymentsTotal };
}
