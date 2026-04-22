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

/** Booked and total room capacity summed per calendar day (same aggregation as occupancy ratio). */
export function occupancyAggByDate(
  cells: AvailabilityCell[]
): Map<string, { booked: number; total: number }> {
  const agg = new Map<string, { booked: number; total: number }>();
  for (const c of cells) {
    const d = normalizeDateKey(c.date);
    const cur = agg.get(d) ?? { booked: 0, total: 0 };
    cur.booked += c.booked_rooms;
    cur.total += c.total_rooms;
    agg.set(d, cur);
  }
  return agg;
}

/** Aggregated booked / total rooms per date → occupancy ratio 0..1. */
export function occupancyRatioByDate(
  cells: AvailabilityCell[]
): Map<string, number> {
  const agg = occupancyAggByDate(cells);
  const out = new Map<string, number>();
  for (const [d, v] of agg) {
    out.set(d, v.total > 0 ? v.booked / v.total : 0);
  }
  return out;
}
