/** Short display id for headers (compact, human-facing). */
export function bookingDisplayHash(bookingId: string): string {
  const compact = bookingId.replace(/-/g, "");
  if (compact.length <= 6) {
    return compact;
  }
  return compact.slice(0, 6);
}
