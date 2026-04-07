import { apiClient } from "@/lib/api";

export interface WebhookReencryptSecretsBody {
  new_fernet_key: string;
}

export interface WebhookReencryptSecretsResponse {
  updated_count: number;
}

export async function reencryptWebhookSecrets(
  body: WebhookReencryptSecretsBody
): Promise<WebhookReencryptSecretsResponse> {
  const { data } = await apiClient.post<WebhookReencryptSecretsResponse>(
    "/webhooks/subscriptions/reencrypt-secrets",
    body
  );
  return data;
}
