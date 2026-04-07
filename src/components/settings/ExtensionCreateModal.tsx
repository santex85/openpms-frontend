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
import { WEBHOOK_EVENT_OPTIONS } from "@/constants/webhookEvents";
import { useCreateCountryPackExtension } from "@/hooks/useCountryPackExtensions";
import { formatApiError } from "@/lib/formatApiError";
import { webhookEventLabel } from "@/lib/i18n/domainLabels";
import type { CountryPackExtensionCreate } from "@/types/country-pack";

interface ExtensionCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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
  const [name, setName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [events, setEvents] = useState<Set<string>>(
    () => new Set([WEBHOOK_EVENT_OPTIONS[0]])
  );
  const [requiredRaw, setRequiredRaw] = useState("");
  const [schemaRaw, setSchemaRaw] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  function toggleEvent(ev: string): void {
    setEvents((prev) => {
      const next = new Set(prev);
      if (next.has(ev)) {
        next.delete(ev);
      } else {
        next.add(ev);
      }
      return next;
    });
  }

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setFormError(null);
    const nm = name.trim();
    const url = webhookUrl.trim();
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
    const evs = Array.from(events);
    if (evs.length === 0) {
      setFormError(t("extensions.create.err.events"));
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
      name: nm,
      webhook_url: url,
      events: evs,
      required_fields,
      ui_config_schema: sch.value,
    };
    try {
      await createMut.mutateAsync(body);
      setName("");
      setWebhookUrl("");
      setEvents(new Set([WEBHOOK_EVENT_OPTIONS[0]]));
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
            <div className="text-sm font-medium">{t("extensions.create.events")}</div>
            <div className="flex max-h-32 flex-col gap-1 overflow-y-auto rounded-md border p-2">
              {WEBHOOK_EVENT_OPTIONS.map((ev) => (
                <label
                  key={ev}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={events.has(ev)}
                    className="h-4 w-4 rounded border border-input"
                    onChange={() => {
                      toggleEvent(ev);
                    }}
                  />
                  <span>{webhookEventLabel(ev)}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {ev}
                  </span>
                </label>
              ))}
            </div>
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
              placeholder="field_one, field_two"
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
