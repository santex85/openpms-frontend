import type { RoomRow } from "@/types/api";

/** Lowercase room names that appear more than once in the list. */
export function duplicateRoomNameKeys(rooms: RoomRow[]): Set<string> {
  const counts = new Map<string, number>();
  for (const r of rooms) {
    const k = r.name.trim().toLowerCase();
    if (k === "") continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const dups = new Set<string>();
  for (const [k, c] of counts) {
    if (c > 1) {
      dups.add(k);
    }
  }
  return dups;
}

export function isDuplicateRoomName(
  name: string,
  duplicateKeys: Set<string>
): boolean {
  const k = name.trim().toLowerCase();
  if (k === "") return false;
  return duplicateKeys.has(k);
}
