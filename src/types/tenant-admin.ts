/** Пользователь тенанта (список для админки). */
export interface TenantUserRead {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

export interface AuthInviteRequest {
  email: string;
  role: string;
  full_name: string;
}

/** Ответ POST /auth/invite — временный пароль показать один раз. */
export interface AuthInviteResponse {
  email: string;
  temporary_password: string;
}

export interface ApiKeyRead {
  id: string;
  name: string;
  /** Короткий префикс для отображения (полный ключ не хранится). */
  prefix: string;
  scopes: string[];
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

export interface ApiKeyCreateRequest {
  name: string;
  scopes: string[];
}

export interface ApiKeyCreateResponse {
  id: string;
  name: string;
  /** Полный ключ — только в ответе на создание. */
  key: string;
  prefix: string;
  scopes: string[];
  created_at: string;
}

export interface WebhookSubscriptionRead {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  created_at: string;
}

export interface WebhookSubscriptionCreateRequest {
  url: string;
  events: string[];
}

export interface WebhookSubscriptionCreateResponse extends WebhookSubscriptionRead {
  /** Показать один раз при создании. */
  secret: string;
}

export interface WebhookDeliveryLogRead {
  id: string;
  created_at: string;
  subscription_id: string;
  http_status: number | null;
  attempt_number: number;
  error_message: string | null;
}
