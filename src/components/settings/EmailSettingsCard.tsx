import { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";

import { ApiRouteHint } from "@/components/dev/ApiRouteHint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useEmailSettings,
  usePutEmailSettings,
  useSendTestEmail,
} from "@/hooks/useEmailSettings";
import { showApiRouteHints } from "@/lib/devUi";
import { formatApiError } from "@/lib/formatApiError";
import { toastSuccess } from "@/lib/toast";
import { usePropertyStore } from "@/stores/property-store";
import type { EmailSettingsPut } from "@/types/email-settings";

const LOCALE_CODES = ["en", "th", "ru", "vi", "km", "ms", "id"] as const;

interface EmailSettingsCardProps {
  canManage: boolean;
}

export function EmailSettingsCard({ canManage }: EmailSettingsCardProps) {
  const { t } = useTranslation();
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const emailQ = useEmailSettings(selectedPropertyId);
  const putMut = usePutEmailSettings();
  const testMut = useSendTestEmail();

  const [senderName, setSenderName] = useState("");
  const [replyTo, setReplyTo] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [locale, setLocale] = useState<string>("en");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (emailQ.isPending || selectedPropertyId === null) {
      return;
    }
    const d = emailQ.data;
    if (d) {
      setSenderName(d.sender_name);
      setReplyTo(d.reply_to ?? "");
      setLogoUrl(d.logo_url ?? "");
      setLocale(d.locale);
    } else {
      setSenderName("");
      setReplyTo("");
      setLogoUrl("");
      setLocale("en");
    }
    setFormError(null);
  }, [emailQ.isPending, emailQ.data, selectedPropertyId]);

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setFormError(null);
    if (selectedPropertyId === null) {
      setFormError(t("settings.notifications.pickProperty"));
      return;
    }
    const nameTrim = senderName.trim();
    if (nameTrim === "") {
      setFormError(t("settings.notifications.senderRequired"));
      return;
    }
    const body: EmailSettingsPut = {
      sender_name: nameTrim,
      reply_to: replyTo.trim() === "" ? null : replyTo.trim(),
      logo_url: logoUrl.trim() === "" ? null : logoUrl.trim(),
      locale: locale.trim().toLowerCase() || "en",
    };
    try {
      await putMut.mutateAsync({ propertyId: selectedPropertyId, body });
      toastSuccess(t("settings.notifications.saved"));
    } catch (err) {
      setFormError(formatApiError(err));
    }
  }

  async function onTestEmail(): Promise<void> {
    if (selectedPropertyId === null) {
      return;
    }
    setFormError(null);
    try {
      await testMut.mutateAsync(selectedPropertyId);
      toastSuccess(t("settings.notifications.testSent"));
    } catch (err) {
      setFormError(formatApiError(err));
    }
  }

  if (!canManage) {
    return (
      <div className="rounded-md border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        {t("settings.notifications.noPermission")}
      </div>
    );
  }

  if (selectedPropertyId === null) {
    return (
      <div className="rounded-md border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        {t("settings.notifications.pickProperty")}
      </div>
    );
  }

  if (emailQ.isPending) {
    return (
      <div
        className="h-32 animate-pulse rounded-md border border-border bg-muted/30"
        aria-hidden
      />
    );
  }

  if (emailQ.isError) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {formatApiError(emailQ.error)}
      </div>
    );
  }

  const hasSavedSettings = emailQ.data !== null && emailQ.data !== undefined;
  const logoPreview =
    logoUrl.trim() !== "" ? logoUrl.trim() : null;

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-4 print:hidden">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          {t("settings.notifications.title")}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("settings.notifications.intro")}
        </p>
        {showApiRouteHints() ? (
          <div className="mt-2 space-y-1 text-xs text-muted-foreground">
            <ApiRouteHint>{`GET /properties/{property_id}/email-settings`}</ApiRouteHint>
            <ApiRouteHint>{`PUT /properties/{property_id}/email-settings`}</ApiRouteHint>
            <ApiRouteHint>{`POST /properties/{property_id}/email/test`}</ApiRouteHint>
          </div>
        ) : null}
      </div>

      <form className="max-w-lg space-y-4" onSubmit={(e) => void onSubmit(e)}>
        {formError !== null ? (
          <p className="text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}

        <div className="space-y-2">
          <label htmlFor="email-sender-name" className="text-sm font-medium">
            {t("settings.notifications.senderName")}
          </label>
          <Input
            id="email-sender-name"
            value={senderName}
            onChange={(e) => {
              setSenderName(e.target.value);
            }}
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email-reply-to" className="text-sm font-medium">
            {t("settings.notifications.replyTo")}
          </label>
          <Input
            id="email-reply-to"
            type="email"
            value={replyTo}
            onChange={(e) => {
              setReplyTo(e.target.value);
            }}
            autoComplete="off"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email-logo-url" className="text-sm font-medium">
            {t("settings.notifications.logoUrl")}
          </label>
          <Input
            id="email-logo-url"
            value={logoUrl}
            onChange={(e) => {
              setLogoUrl(e.target.value);
            }}
            placeholder="https://"
            autoComplete="off"
          />
          {logoPreview !== null ? (
            <div className="mt-2">
              <p className="mb-1 text-xs text-muted-foreground">
                {t("settings.notifications.logoPreview")}
              </p>
              <img
                src={logoPreview}
                alt=""
                className="max-h-16 max-w-[200px] rounded border border-border object-contain"
              />
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium">
            {t("settings.notifications.locale")}
          </span>
          <Select
            value={locale}
            onValueChange={(v) => {
              setLocale(v);
            }}
          >
            <SelectTrigger aria-label={t("settings.notifications.locale")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LOCALE_CODES.map((code) => (
                <SelectItem key={code} value={code}>
                  {t(`settings.notifications.localeOption.${code}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={putMut.isPending}>
            {putMut.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            {putMut.isPending
              ? t("settings.notifications.saving")
              : t("settings.notifications.save")}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={testMut.isPending || !hasSavedSettings}
            onClick={() => void onTestEmail()}
          >
            {testMut.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : null}
            {t("settings.notifications.testEmail")}
          </Button>
        </div>
      </form>
    </section>
  );
}
