/** Matches PUT/GET /properties/{id}/tax-config (Phase 1). */
export type TaxMode = "off" | "inclusive" | "exclusive";

export interface TaxConfigRead {
  tax_mode: TaxMode;
  tax_name: string;
  /** 0–1 inclusive (e.g. 0.07 for 7%). */
  tax_rate: number;
}

export interface TaxConfigPut {
  tax_mode: TaxMode;
  tax_name: string;
  tax_rate: number;
}
