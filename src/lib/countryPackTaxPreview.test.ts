import { describe, expect, it } from "vitest";

import type { CountryPackTaxLine } from "@/types/country-pack";
import { computeTaxPreview } from "./countryPackTaxPreview";

describe("computeTaxPreview Utility", () => {
  it("returns base amount and empty lines when tax lines list is empty", () => {
    const res = computeTaxPreview(1000, []);
    expect(res.lines).toEqual([]);
    expect(res.totalWithTaxes).toBe(1000);
  });

  it("calculates simple taxes correctly (non-compounded)", () => {
    const taxLines: CountryPackTaxLine[] = [
      {
        name: "VAT",
        rate: "7%",
        order: 1,
        compound_after: false,
        inclusive: false,
        exclusive: true,
      },
      {
        name: "Service Charge",
        rate: "10%",
        order: 2,
        compound_after: false,
        inclusive: false,
        exclusive: true,
      },
    ];

    const res = computeTaxPreview(100, taxLines);

    expect(res.lines).toHaveLength(2);
    expect(res.lines[0].name).toBe("VAT");
    expect(res.lines[0].rateLabel).toBe("7%");
    expect(res.lines[0].amount).toBeCloseTo(7, 5);

    expect(res.lines[1].name).toBe("Service Charge");
    expect(res.lines[1].rateLabel).toBe("10%");
    expect(res.lines[1].amount).toBeCloseTo(10, 5);

    expect(res.totalWithTaxes).toBeCloseTo(117, 5);
  });

  it("calculates compound taxes correctly (compound_after: true on second line)", () => {
    const taxLines: CountryPackTaxLine[] = [
      {
        name: "Service Charge",
        rate: "10%",
        order: 1,
        compound_after: false, // first line does not compound after anything
        inclusive: false,
        exclusive: true,
      },
      {
        name: "VAT",
        rate: "7%",
        order: 2,
        compound_after: true, // compounds *after* service charge is added
        inclusive: false,
        exclusive: true,
      },
    ];

    // Base: 100
    // Service Charge (10% of 100) = 10. Running total basis becomes 110.
    // VAT (7% of 110) = 7.7
    // Total with taxes = 100 + 10 + 7.7 = 117.7
    const res = computeTaxPreview(100, taxLines);

    expect(res.lines).toHaveLength(2);
    expect(res.lines[0].name).toBe("Service Charge");
    expect(res.lines[0].rateLabel).toBe("10%");
    expect(res.lines[0].amount).toBeCloseTo(10, 5);

    expect(res.lines[1].name).toBe("VAT");
    expect(res.lines[1].rateLabel).toBe("7%");
    expect(res.lines[1].amount).toBeCloseTo(7.7, 5);

    expect(res.totalWithTaxes).toBeCloseTo(117.7, 5);
  });

  it("respects custom order values and performs stable sort", () => {
    const taxLines: CountryPackTaxLine[] = [
      {
        name: "VAT",
        rate: "7%",
        order: 2,
        compound_after: false,
        inclusive: false,
        exclusive: true,
      },
      {
        name: "Service",
        rate: "10%",
        order: 1,
        compound_after: false,
        inclusive: false,
        exclusive: true,
      },
    ];

    const res = computeTaxPreview(100, taxLines);
    expect(res.lines[0].name).toBe("Service");
    expect(res.lines[1].name).toBe("VAT");
  });

  it("handles decimal rates as well as percentages", () => {
    const taxLines: CountryPackTaxLine[] = [
      {
        name: "Tax",
        rate: "0.05",
        order: 1,
        compound_after: false,
        inclusive: false,
        exclusive: true,
      },
    ];

    const res = computeTaxPreview(200, taxLines);
    expect(res.lines[0].amount).toBeCloseTo(10, 5);
    expect(res.totalWithTaxes).toBeCloseTo(210, 5);
  });
});
