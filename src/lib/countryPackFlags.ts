/** Map country-pack `code` (often ISO 3166-1 alpha-2) to flag emoji for the selector. */
const FLAG_BY_ALPHA2: Record<string, string> = {
  TH: "🇹🇭",
  RU: "🇷🇺",
  US: "🇺🇸",
  GB: "🇬🇧",
  DE: "🇩🇪",
  FR: "🇫🇷",
  ES: "🇪🇸",
  ID: "🇮🇩",
  VN: "🇻🇳",
  KH: "🇰🇭",
  MY: "🇲🇾",
  JP: "🇯🇵",
  CN: "🇨🇳",
  IN: "🇮🇳",
  AU: "🇦🇺",
  NZ: "🇳🇿",
};

export function countryPackFlagEmoji(code: string): string {
  const trimmed = code.trim().toUpperCase();
  if (trimmed.length >= 2) {
    const two = trimmed.slice(0, 2);
    if (FLAG_BY_ALPHA2[two] !== undefined) {
      return FLAG_BY_ALPHA2[two];
    }
  }
  return "🏳️";
}
