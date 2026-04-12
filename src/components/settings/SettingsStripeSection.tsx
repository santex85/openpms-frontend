import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";

import { ApiRouteHint } from "@/components/dev/ApiRouteHint";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fetchStripeConnectUrl } from "@/api/stripe";
import { useDisconnectStripe, useStripeStatus } from "@/hooks/useStripeConnect";
import { formatApiError } from "@/lib/formatApiError";
import { usePropertyStore } from "@/stores/property-store";

interface SettingsStripeSectionProps {
  canManage: boolean;
}

export function SettingsStripeSection({ canManage }: SettingsStripeSectionProps) {
  const { t } = useTranslation();
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const statusQ = useStripeStatus(selectedPropertyId ?? undefined, canManage);
  const disconnectMut = useDisconnectStripe();
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!canManage) {
    return (
      <div className="rounded-md border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        {t("stripe.noPermission")}
      </div>
    );
  }

  if (selectedPropertyId === null || selectedPropertyId === "") {
    return (
      <div className="rounded-md border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        {t("stripe.pickProperty")}
      </div>
    );
  }

  const propertyId = selectedPropertyId;

  if (statusQ.isError) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {formatApiError(statusQ.error)}
      </div>
    );
  }

  if (statusQ.isPending) {
    return (
      <div
        className="h-32 animate-pulse rounded-md border border-border bg-muted/30"
        aria-hidden
      />
    );
  }

  const data = statusQ.data;
  const connected = data?.status === "connected";

  async function onConnect(e: FormEvent): Promise<void> {
    e.preventDefault();
    setFormError(null);
    try {
      const { url } = await fetchStripeConnectUrl(propertyId);
      window.location.href = url;
    } catch (err) {
      setFormError(formatApiError(err));
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">
          {t("stripe.title")}
        </h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("stripe.description")}
        </p>
        <ApiRouteHint className="mt-2">
          {`GET /properties/{property_id}/stripe/status`}
        </ApiRouteHint>
      </div>

      {formError !== null ? (
        <p className="text-sm text-destructive" role="alert">
          {formError}
        </p>
      ) : null}

      {connected ? (
        <div className="rounded-md border border-border bg-muted/30 p-4">
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("stripe.status.title")}
          </div>
          <div className="mt-1 text-lg font-semibold text-foreground">
            {t("stripe.connected")}
          </div>
          <dl className="mt-3 grid gap-2 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <dt className="text-muted-foreground">{t("stripe.mode")}</dt>
              <dd>
                {data?.livemode
                  ? t("stripe.livemode")
                  : t("stripe.testmode")}
              </dd>
            </div>
            {data?.connected_at ? (
              <div className="flex flex-wrap justify-between gap-2">
                <dt className="text-muted-foreground">
                  {t("stripe.connectedAt")}
                </dt>
                <dd className="tabular-nums text-foreground">
                  {data.connected_at.slice(0, 19).replace("T", " ")}
                </dd>
              </div>
            ) : null}
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={() => {
                setFormError(null);
                setDisconnectOpen(true);
              }}
            >
              {t("stripe.disconnect")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-md border border-border bg-muted/30 p-4">
          <div className="text-sm text-muted-foreground">
            {t("stripe.notConnected")}
          </div>
          <form className="mt-4" onSubmit={onConnect}>
            <Button type="submit" disabled={statusQ.isFetching}>
              {t("stripe.connect")}
            </Button>
          </form>
        </div>
      )}

      <Dialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("stripe.disconnectTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("stripe.disconnectBody")}
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDisconnectOpen(false)}
            >
              {t("app.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={disconnectMut.isPending}
              onClick={() => {
                void (async () => {
                  setFormError(null);
                  try {
                    await disconnectMut.mutateAsync(propertyId);
                    setDisconnectOpen(false);
                  } catch (err) {
                    setFormError(formatApiError(err));
                  }
                })();
              }}
            >
              {disconnectMut.isPending
                ? t("stripe.disconnecting")
                : t("stripe.disconnectConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
