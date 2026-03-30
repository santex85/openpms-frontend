/** localStorage key for Bearer token (MVP). */
export const AUTH_STORAGE_KEY = "openpms_auth_token";

/**
 * Placeholder string for one-click login when the API does not validate JWT
 * (not accepted by real OpenPMS — use `npm run mint:jwt` against Docker API).
 */
export const MVP_DEMO_TOKEN = "mvp-demo-bearer-token";

/** Query parameter name for scoping API calls to a property (FastAPI). */
export const PROPERTY_ID_QUERY_PARAM = "property_id" as const;

/** localStorage: онбординг — индекс активного шага (0..n). */
export const ONBOARDING_STEP_STORAGE_KEY = "openpms_onboarding_step";

/** localStorage: флаг «только что зарегистрировались» для подсказки в PropertySwitcher. */
export const POST_REGISTER_STORAGE_KEY = "openpms_post_register";
