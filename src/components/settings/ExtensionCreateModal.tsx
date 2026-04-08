import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCreateCountryPackExtension } from "@/hooks/useCountryPackExtensions";
import { formatApiError } from "@/lib/formatApiError";
import type { CountryPackExtensionCreate } from "@/types/country-pack";

interface ExtensionCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Matches backend `ExtensionCreate.code` (1–64 chars). */
const CODE_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/iu;

function parseSchemaJson(
  raw: string
): { ok: true; value: Record<string, unknown> | null } | { ok: false; error: string } {
  const t = raw.trim();
  if (t === "") {
    return { ok: true, value: null };
  }
  try {
    const parsed: unknown = JSON.parse(t);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { ok: false, error: "Schema must be a JSON object." };
    }
    return { ok: true, value: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, error: "Invalid JSON." };
  }
}

export function ExtensionCreateModal({
  open,
  onOpenChange,
}: ExtensionCreateModalProps) {
  const { t } = useTranslation();
  const createMut = useCreateCountryPackExtension();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [requiredRaw, setRequiredRaw] = useState("");
  const [schemaRaw, setSchemaRaw] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setFormError(null);
    const cd = code.trim().toLowerCase();
    const nm = name.trim();
    const url = webhookUrl.trim();
    const ccRaw = countryCode.trim().toUpperCase();
    if (cd === "") {
      setFormError(t("extensions.create.err.code"));
      return;
    }
    if (!CODE_RE.test(cd)) {
      setFormError(t("extensions.create.err.codePattern"));
      return;
    }
    if (nm === "") {
      setFormError(t("extensions.create.err.name"));
      return;
    }
    if (url === "") {
      setFormError(t("extensions.create.err.url"));
      return;
    }
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url);
    } catch {
      setFormError(t("extensions.create.err.urlInvalid"));
      return;
    }
    if (parsedUrl.protocol !== "https:") {
      setFormError(t("extensions.create.err.urlHttps"));
      return;
    }
    if (ccRaw !== "" && !/^[A-Z]{2}$/u.test(ccRaw)) {
      setFormError(t("extensions.create.err.countryCode"));
      return;
    }
    const required_fields = requiredRaw
      .split(/[\n,]+/u)
      .map((s) => s.trim())
      .filter(Boolean);
    const sch = parseSchemaJson(schemaRaw);
    if (!sch.ok) {
      setFormError(sch.error);
      return;
    }
    const body: CountryPackExtensionCreate = {
      code: cd,
      name: nm,
      country_code: ccRaw === "" ? null : ccRaw,
      webhook_url: url,
      required_fields,
      ui_config_schema: sch.value,
    };
    try {
      await createMut.mutateAsync(body);
      setCode("");
      setName("");
      setCountryCode("");
      setWebhookUrl("");
      setRequiredRaw("");
      setSchemaRaw("");
      onOpenChange(false);
    } catch (err) {
      setFormError(formatApiError(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("extensions.create.title")}</DialogTitle>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
          {formError !== null ? (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}
          <div className="space-y-2">
            <label htmlFor="ext-code" className="text-sm font-medium">
              {t("extensions.create.code")}
            </label>
            <Input
              id="ext-code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
              }}
              placeholder="tm30_reporter"
              autoComplete="off"
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="ext-name" className="text-sm font-medium">
              {t("extensions.create.name")}
            </label>
            <Input
              id="ext-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
              }}
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="ext-country" className="text-sm font-medium">
              {t("extensions.create.countryCode")}
            </label>
            <Input
              id="ext-country"
              value={countryCode}
              onChange={(e) => {
                setCountryCode(e.target.value.toUpperCase().slice(0, 2));
              }}
              placeholder="TH"
              maxLength={2}
              className="w-24 font-mono uppercase"
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              {t("extensions.create.countryCodeHint")}
            </p>
          </div>
          <div className="space-y-2">
            <label htmlFor="ext-url" className="text-sm font-medium">
              {t("extensions.create.webhookUrl")}
            </label>
            <Input
              id="ext-url"
              value={webhookUrl}
              onChange={(e) => {
                setWebhookUrl(e.target.value);
              }}
              placeholder="https://example.com/hook"
              autoComplete="off"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="ext-req" className="text-sm font-medium">
              {t("extensions.create.requiredFields")}
            </label>
            <textarea
              id="ext-req"
              value={requiredRaw}
              onChange={(e) => {
                setRequiredRaw(e.target.value);
              }}
              placeholder="passport_number, nationality"
              rows={3}
              className="flex min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="ext-schema" className="text-sm font-medium">
              {t("extensions.create.uiSchema")}
            </label>
            <textarea
              id="ext-schema"
              value={schemaRaw}
              onChange={(e) => {
                setSchemaRaw(e.target.value);
              }}
              placeholder='{"type":"object","properties":{…}}'
              rows={6}
              className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 font-mono text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={createMut.isPending}>
              {t("extensions.create.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
