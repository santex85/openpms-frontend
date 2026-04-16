/** GET/PUT /properties/{id}/email-settings (TZ-16). */
export interface EmailSettingsRead {
  id: string;
  tenant_id: string;
  property_id: string;
  sender_name: string;
  reply_to: string | null;
  logo_url: string | null;
  locale: string;
  created_at: string;
  updated_at: string;
}

export interface EmailSettingsPut {
  sender_name: string;
  reply_to: string | null;
  logo_url: string | null;
  locale: string;
}
