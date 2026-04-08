/**
 * Country pack & extensions — shapes aligned with OpenPMS FastAPI schemas
 * (`app/schemas/country_pack.py`).
 */

/** One tax rule from `CountryPackRead.taxes` (JSONB / TaxRuleSchema). */
export interface CountryPackTaxRuleApi {
  code: string;
  name: string;
  /** Decimal fraction, e.g. 0.07 for 7%. */
  rate: number;
  inclusive: boolean;
  applies_to: string[];
  compound_after: string | null;
  display_on_folio?: boolean;
  active?: boolean;
}

/** GET /country-packs row (`CountryPackListItem`). */
export interface CountryPackListItem {
  code: string;
  name: string;
  currency_code: string;
  is_builtin: boolean;
}

/** GET /country-packs/{code} (`CountryPackRead`). */
export interface CountryPackDetail {
  code: string;
  tenant_id: string | null;
  name: string;
  currency_code: string;
  currency_symbol: string;
  currency_symbol_position: "before" | "after";
  currency_decimal_places: number;
  timezone: string;
  date_format: string;
  locale: string;
  default_checkin_time: string;
  default_checkout_time: string;
  taxes: CountryPackTaxRuleApi[];
  payment_methods: string[];
  fiscal_year_start: string | null;
  is_builtin: boolean;
  created_at: string;
  updated_at: string;
}

/** GET /properties/{id}/lock-status (`PropertyLockStatusRead`). */
export interface PropertyLockStatus {
  property_id: string;
  country_pack_locked: boolean;
  booking_count: number;
}

/** POST /country-packs/{code}/apply response. */
export interface CountryPackApplyResponse {
  property_id: string;
  country_pack_code: string;
  currency: string;
  timezone: string;
  checkin_time: string;
  checkout_time: string;
  payment_methods: string[];
}

/** Normalized line for local tax preview (`computeTaxPreview`). */
export interface CountryPackTaxLine {
  name: string;
  rate: string;
  inclusive: boolean;
  exclusive: boolean;
  compound_after?: boolean;
  order?: number;
}

/** POST /country-packs/extensions body (`ExtensionCreate`). */
export interface CountryPackExtensionCreate {
  code: string;
  name: string;
  country_code?: string | null;
  webhook_url: string;
  required_fields: string[];
  ui_config_schema?: Record<string, unknown> | null;
}

/** Extension row (`ExtensionRead`). */
export interface CountryPackExtensionRead {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  country_code: string | null;
  webhook_url: string;
  required_fields: string[];
  ui_config_schema: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
