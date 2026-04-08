import type { CountryPackTaxLine, CountryPackTaxRuleApi } from "@/types/country-pack";

const PREVIEW_CATEGORY = "room_charge";

function normApplies(applies: string[]): Set<string> {
  return new Set(applies.map((x) => x.trim().toLowerCase()));
}

function ruleAppliesToPreview(rule: CountryPackTaxRuleApi): boolean {
  if (rule.active === false) {
    return false;
  }
  const n = normApplies(rule.applies_to ?? []);
  return n.has("all") || n.has(PREVIEW_CATEGORY);
}

/** Decimal rate (e.g. 0.07) → label for UI / `computeTaxPreview` ("%"). */
export function formatCountryPackRateFraction(rate: number): string {
  if (!Number.isFinite(rate)) {
    return "0%";
  }
  const pct = rate * 100;
  const rounded = Math.round(pct * 10000) / 10000;
  const s = Number.isInteger(rounded)
    ? String(rounded)
    : String(rounded).replace(/\.?0+$/u, "");
  return `${s}%`;
}

/**
 * Map API tax rules to lines for booking tax preview (same category as folio:
 * `room_charge`).
 */
export function taxRulesToPreviewLines(
  rules: CountryPackTaxRuleApi[] | undefined | null
): CountryPackTaxLine[] {
  if (rules === undefined || rules === null || rules.length === 0) {
    return [];
  }
  const applicable = rules.filter(ruleAppliesToPreview);
  const nonCompound = applicable.filter(
    (r) => r.compound_after === null || String(r.compound_after).trim() === ""
  );
  const compound = applicable.filter(
    (r) => r.compound_after !== null && String(r.compound_after).trim() !== ""
  );

  const sortedCompound = topoSortCompound(compound, applicable);

  const ordered = [...nonCompound, ...sortedCompound];
  return ordered.map((r, idx) => ({
    name: r.name?.trim() !== "" ? r.name : r.code,
    rate: formatCountryPackRateFraction(Number(r.rate)),
    inclusive: r.inclusive === true,
    exclusive: r.inclusive !== true,
    compound_after:
      r.compound_after !== null && String(r.compound_after).trim() !== "",
    order: idx,
  }));
}

function topoSortCompound(
  compound: CountryPackTaxRuleApi[],
  allApplicable: CountryPackTaxRuleApi[]
): CountryPackTaxRuleApi[] {
  const byCode = new Map(
    allApplicable
      .map((r) => [r.code.trim(), r] as const)
      .filter(([c]) => c !== "")
  );
  const deps = new Map(
    compound.map((r) => {
      const dep =
        typeof r.compound_after === "string"
          ? r.compound_after.trim()
          : "";
      return [r.code.trim(), dep !== "" ? dep : null] as const;
    })
  );
  const result: CountryPackTaxRuleApi[] = [];
  const remaining = new Set(compound.map((r) => r.code.trim()));
  const adj = new Map<string, string[]>();
  const indeg = new Map<string, number>();

  for (const code of remaining) {
    indeg.set(code, 0);
    adj.set(code, []);
  }
  for (const c of remaining) {
    const dep = deps.get(c) ?? null;
    if (dep !== null && remaining.has(dep)) {
      adj.get(dep)?.push(c);
      indeg.set(c, (indeg.get(c) ?? 0) + 1);
    } else if (dep !== null && byCode.has(dep)) {
      /* dependency resolved in non-compound phase — treat as ready */
    }
  }

  const q: string[] = [];
  for (const [c, d] of indeg) {
    if (d === 0) {
      q.push(c);
    }
  }
  q.sort((a, b) => compound.findIndex((r) => r.code.trim() === a) - compound.findIndex((r) => r.code.trim() === b));

  while (q.length > 0) {
    const u = q.shift();
    if (u === undefined) {
      break;
    }
    const rule = compound.find((r) => r.code.trim() === u);
    if (rule !== undefined) {
      result.push(rule);
    }
    for (const v of adj.get(u) ?? []) {
      const nextDeg = (indeg.get(v) ?? 1) - 1;
      indeg.set(v, nextDeg);
      if (nextDeg === 0) {
        q.push(v);
      }
    }
  }

  for (const r of compound) {
    if (!result.includes(r)) {
      result.push(r);
    }
  }
  return result;
}
