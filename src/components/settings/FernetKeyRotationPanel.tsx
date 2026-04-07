import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { ApiRouteHint } from "@/components/dev/ApiRouteHint";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useReencryptWebhookSecrets } from "@/hooks/useWebhookMutations";
import { formatApiError } from "@/lib/formatApiError";
import { toastError, toastSuccess } from "@/lib/toast";

/** 32 random bytes as URL-safe base64 (no padding) — confirm with backend for Fernet. */
function generateUrlSafeKey32(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) {
    bin += String.fromCharCode(b);
  }
  return btoa(bin)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function FernetKeyRotationPanel() {
  const { t } = useTranslation();
  const reencryptMut = useReencryptWebhookSecrets();
  const [key, setKey] = useState("");
  const [visible, setVisible] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function runRotate(): Promise<void> {
    setFormError(null);
    const k = key.trim();
    if (k === "") {
      setFormError(t("settings.fernet.err.empty"));
      return;
    }
    try {
      const res = await reencryptMut.mutateAsync({ new_fernet_key: k });
      toastSuccess(
        t("settings.fernet.toastSuccess", { count: res.updated_count })
      );
      setConfirmOpen(false);
      setKey("");
    } catch (e) {
      setFormError(formatApiError(e));
      toastError(formatApiError(e));
    }
  }

  return (
    <div className="mt-8 space-y-3 border-t border-border pt-6">
      <h4 className="text-sm font-semibold text-foreground">
        {t("settings.fernet.title")}
      </h4>
      <p className="text-sm text-muted-foreground">{t("settings.fernet.intro")}</p>
      <ul className="list-inside list-disc text-xs text-muted-foreground">
        <li>{t("settings.fernet.stepDeploy")}</li>
        <li>{t("settings.fernet.stepRotate")}</li>
      </ul>
      <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <ApiRouteHint>POST /webhooks/subscriptions/reencrypt-secrets</ApiRouteHint>
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <label htmlFor="fernet-key" className="text-xs font-medium">
            {t("settings.fernet.keyLabel")}
          </label>
          <div className="flex gap-2">
            <Input
              id="fernet-key"
              type={visible ? "text" : "password"}
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
              }}
              className="font-mono text-xs"
              autoComplete="off"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? "Hide" : "Show"}
            >
              {visible ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setKey(generateUrlSafeKey32());
          }}
        >
          {t("settings.fernet.generate")}
        </Button>
      </div>

      <Button
        type="button"
        variant="destructive"
        disabled={key.trim() === "" || reencryptMut.isPending}
        onClick={() => {
          setFormError(null);
          setConfirmOpen(true);
        }}
      >
        {t("settings.fernet.rotate")}
      </Button>

      {formError !== null && !confirmOpen ? (
        <p className="text-sm text-destructive">{formError}</p>
      ) : null}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("settings.fernet.confirmTitle")}</DialogTitle>
            <DialogDescription className="space-y-2 text-sm">
              <span className="block">{t("settings.fernet.confirmBody")}</span>
              <span className="block font-medium text-destructive">
                {t("settings.fernet.confirmIrreversible")}
              </span>
            </DialogDescription>
          </DialogHeader>
          {formError !== null ? (
            <p className="text-sm text-destructive">{formError}</p>
          ) : null}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setConfirmOpen(false);
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={reencryptMut.isPending}
              onClick={() => void runRotate()}
            >
              {reencryptMut.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("settings.fernet.rotating")}
                </>
              ) : (
                t("settings.fernet.confirmSubmit")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
