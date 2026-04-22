import type { TFunction } from "i18next";

/** Turn `tax_mode` into `Tax mode` when no i18n key exists. */
export function humanizeAuditFieldKey(key: string): string {
  const s = key.trim();
  if (s === "") {
    return "";
  }
  return s
    .split("_")
    .map((part) =>
      part.length === 0 ? "" : part[0].toUpperCase() + part.slice(1).toLowerCase()
    )
    .join(" ");
}

function formatAuditScalar(raw: unknown): string {
  if (raw === undefined || raw === null) {
    return "—";
  }
  if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
    return String(raw);
  }
  if (Array.isArray(raw)) {
    try {
      return JSON.stringify(raw);
    } catch {
      return "…";
    }
  }
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const keys = Object.keys(o);
    if (keys.length === 0) {
      return "{}";
    }
    if (
      keys.length <= 4 &&
      keys.every((k) => {
        const val = o[k];
        return (
          val === null ||
          typeof val === "string" ||
          typeof val === "number" ||
          typeof val === "boolean"
        );
      })
    ) {
      return keys
        .sort()
        .map((k) => `${humanizeAuditFieldKey(k)}: ${formatAuditScalar(o[k])}`)
        .join(", ");
    }
    try {
      const compact = JSON.stringify(o);
      return compact.length > 120 ? `${compact.slice(0, 117)}…` : compact;
    } catch {
      return "…";
    }
  }
  return String(raw);
}

/**
 * Multi-line human-readable summary of `new_values` for audit tables (not raw JSON).
 */
export function formatAuditNewValuesReadable(
  v: Record<string, unknown> | null,
  t: TFunction
): string {
  if (v === null || Object.keys(v).length === 0) {
    return "—";
  }
  const entries = Object.entries(v).sort(([a], [b]) => a.localeCompare(b));
  const lines: string[] = [];
  for (const [key, raw] of entries) {
    const label = t(`audit.field.${key}`, {
      defaultValue: humanizeAuditFieldKey(key),
    });
    lines.push(`${label}: ${formatAuditScalar(raw)}`);
  }
  return lines.join("\n");
}
