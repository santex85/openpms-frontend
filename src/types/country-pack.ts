/** GET /country-packs item and detail tax line (TZ-9 / TZ-10). */
export interface CountryPackTaxLine {
  name: string;
  rate: string;
  inclusive: boolean;
  exclusive: boolean;
  compound_after?: boolean;
  /** Display order when sorting lines for preview. */
  order?: number;
}

/** Row from GET /country-packs. */
export interface CountryPackListItem {
  id: string;
  code: string;
  name: string;
  currency: string;
  symbol: string;
  tax_lines: CountryPackTaxLine[];
  payment_methods: string[];
}

/** GET /country-packs/{code} — may include timezone for preview card. */
export interface CountryPackDetail extends CountryPackListItem {
  timezone?: string | null;
}

/** POST /country-packs/extensions body. */
export interface CountryPackExtensionCreate {
  name: string;
  webhook_url: string;
  events: string[];
  required_fields: string[];
  ui_config_schema?: Record<string, unknown> | null;
}

/** Extension row from GET /country-packs/extensions. */
export interface CountryPackExtensionRead {
  id: string;
  tenant_id: string;
  name: string;
  webhook_url: string;
  events: string[];
  required_fields: string[];
  ui_config_schema: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
}
