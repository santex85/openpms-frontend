/** Display-friendly capitalization; does not mutate API payloads. */
export function capitalizeGuestName(raw: string | null | undefined): string {
  if (raw === null || raw === undefined) {
    return "";
  }
  const t = raw.trim();
  if (t === "") {
    return "";
  }
  return t
    .split(/\s+/u)
    .map((part) => {
      if (part.length === 0) {
        return part;
      }
      const first = part.charAt(0).toUpperCase();
      const rest = part.slice(1).toLowerCase();
      return `${first}${rest}`;
    })
    .join(" ");
}
