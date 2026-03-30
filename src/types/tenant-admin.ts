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
  full_name?: string;
}

export interface ApiKeyRead {
  id: string;
  name: string;
  /** Короткий префикс для отображения (полный ключ не хранится). */
  prefix: string;
  created_at: string;
  last_used_at: string | null;
}

export interface ApiKeyCreateRequest {
  name: string;
}

export interface ApiKeyCreateResponse {
  id: string;
  name: string;
  /** Полный ключ — только в ответе на создание. */
  key: string;
  prefix: string;
  created_at: string;
}

export interface WebhookRead {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  created_at: string;
}

export interface WebhookCreateRequest {
  url: string;
  events: string[];
}
