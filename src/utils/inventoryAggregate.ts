import type { AvailabilityCell } from "@/types/inventory";

function normalizeDateKey(raw: string): string {
  return raw.length >= 10 ? raw.slice(0, 10) : raw;
}

/** Sum available_rooms per ISO date for dates in the set (inclusive grid month only). */
export function sumAvailableByDate(
  cells: AvailabilityCell[],
  dayIsoSet: ReadonlySet<string>
): Map<string, number> {
  const map = new Map<string, number>();
  for (const iso of dayIsoSet) {
    map.set(iso, 0);
  }
  for (const c of cells) {
    const d = normalizeDateKey(c.date);
    if (map.has(d)) {
      map.set(d, (map.get(d) ?? 0) + c.available_rooms);
    }
  }
  return map;
}

/** Max total_rooms per room_type_id seen in the grid (stable across days for one type). */
export function maxTotalRoomsByTypeId(
  cells: AvailabilityCell[]
): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of cells) {
    const prev = m.get(c.room_type_id) ?? 0;
    m.set(c.room_type_id, Math.max(prev, c.total_rooms));
  }
  return m;
}
