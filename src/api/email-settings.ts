import axios from "axios";

import { apiClient } from "@/lib/api";
import type { EmailSettingsPut, EmailSettingsRead } from "@/types/email-settings";

export async function fetchEmailSettings(
  propertyId: string
): Promise<EmailSettingsRead | null> {
  try {
    const { data } = await apiClient.get<EmailSettingsRead>(
      `/properties/${propertyId}/email-settings`
    );
    return data;
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.status === 404) {
      return null;
    }
    throw err;
  }
}

export async function putEmailSettings(
  propertyId: string,
  body: EmailSettingsPut
): Promise<EmailSettingsRead> {
  const { data } = await apiClient.put<EmailSettingsRead>(
    `/properties/${propertyId}/email-settings`,
    body
  );
  return data;
}

export async function postPropertyEmailTest(propertyId: string): Promise<void> {
  await apiClient.post(`/properties/${propertyId}/email/test`);
}
