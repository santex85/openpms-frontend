import { FormEvent, useEffect, useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useActivateChannex,
  useConnectChannex,
  useDisconnectChannex,
  useMapChannexRates,
  useMapChannexRooms,
  useValidateChannexKey,
} from "@/hooks/useChannexMutations";
import { useChannexRates, useChannexRooms, useChannexStatus } from "@/hooks/useChannex";
import { useRatePlans } from "@/hooks/useRatePlans";
import { useRoomTypes } from "@/hooks/useRoomTypes";
import { formatApiError } from "@/lib/formatApiError";
import { usePropertyStore } from "@/stores/property-store";
import type { ChannexProperty } from "@/types/channex";

type WizardStep = 1 | 2 | 3;

interface SettingsChannexSectionProps {
  canManage: boolean;
}

function rateMapKey(roomTypeMapId: string, ratePlanId: string): string {
  return `${roomTypeMapId}\0${ratePlanId}`;
}

export function SettingsChannexSection({
  canManage,
}: SettingsChannexSectionProps) {
  const { t } = useTranslation();
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);

  const statusQ = useChannexStatus(canManage);
  const roomTypesQ = useRoomTypes();
  const ratePlansQ = useRatePlans();

  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [apiKey, setApiKey] = useState("");
  const [env, setEnv] = useState<"production" | "sandbox">("production");
  const [validatedProps, setValidatedProps] = useState<ChannexProperty[] | null>(
    null
  );
  const [cxPropertyId, setCxPropertyId] = useState<string>("");
  const [roomCxSelection, setRoomCxSelection] = useState<
    Record<string, string>
  >({});
  const [rateCxSelection, setRateCxSelection] = useState<
    Record<string, string>
  >({});
  const [formError, setFormError] = useState<string | null>(null);
  const [disconnectOpen, setDisconnectOpen] = useState(false);

  const validateMut = useValidateChannexKey();
  const connectMut = useConnectChannex();
  const mapRoomsMut = useMapChannexRooms();
  const mapRatesMut = useMapChannexRates();
  const activateMut = useActivateChannex();
  const disconnectMut = useDisconnectChannex();

  const status = statusQ.data;
  const link = status?.link ?? null;
  const isActive = Boolean(link?.status === "active");

  const roomsEnabled = Boolean(
    canManage &&
      selectedPropertyId &&
      status?.connected &&
      !isActive &&
      wizardStep >= 2
  );
  const ratesEnabled = Boolean(
    canManage &&
      selectedPropertyId &&
      status?.connected &&
      !isActive &&
      wizardStep >= 3
  );

  const channexRoomsQ = useChannexRooms(roomsEnabled);
  const channexRatesQ = useChannexRates(ratesEnabled);

  useEffect(() => {
    if (statusQ.isPending || status === undefined) {
      return;
    }
    if (!status.connected) {
      setWizardStep(1);
      setValidatedProps(null);
      setCxPropertyId("");
      return;
    }
    if (link?.status === "active") {
      return;
    }
    if (status.room_maps_count === 0) {
      setWizardStep(2);
    } else {
      setWizardStep(3);
    }
  }, [statusQ.isPending, status, link?.status]);

  const activeRoomTypes = useMemo(() => {
    const rows = roomTypesQ.data ?? [];
    return [...rows].sort((a, b) => a.name.localeCompare(b.name));
  }, [roomTypesQ.data]);

  useEffect(() => {
    if (wizardStep !== 2 || activeRoomTypes.length === 0) {
      return;
    }
    setRoomCxSelection((prev) => {
      const next = { ...prev };
      for (const rt of activeRoomTypes) {
        if (next[rt.id] === undefined) {
          next[rt.id] = "";
        }
      }
      return next;
    });
  }, [wizardStep, activeRoomTypes]);

  useEffect(() => {
    if (wizardStep !== 3 || !status?.room_type_maps.length) {
      return;
    }
    const ratePlans = ratePlansQ.data ?? [];
    setRateCxSelection((prev) => {
      const next = { ...prev };
      for (const m of status.room_type_maps) {
        for (const rp of ratePlans) {
          const k = rateMapKey(m.id, rp.id);
          if (next[k] === undefined) {
            next[k] = "";
          }
        }
      }
      return next;
    });
  }, [wizardStep, status?.room_type_maps, ratePlansQ.data]);

  async function onValidateKey(e: FormEvent): Promise<void> {
    e.preventDefault();
    setFormError(null);
    const k = apiKey.trim();
    if (k === "") {
      setFormError(t("channex.errors.apiKeyRequired"));
      return;
    }
    try {
      const props = await validateMut.mutateAsync({
        api_key: k,
        env,
      });
      setValidatedProps(props);
      if (props.length > 0 && cxPropertyId === "") {
        setCxPropertyId(props[0]?.id ?? "");
      }
    } catch (err) {
      setFormError(formatApiError(err));
    }
  }

  async function onConnect(e: FormEvent): Promise<void> {
    e.preventDefault();
    setFormError(null);
    const pid = selectedPropertyId;
    if (pid === null || pid === "") {
      setFormError(t("channex.pickProperty"));
      return;
    }
    const k = apiKey.trim();
    if (k === "" || cxPropertyId.trim() === "") {
      setFormError(t("channex.errors.connectIncomplete"));
      return;
    }
    try {
      await connectMut.mutateAsync({
        propertyId: pid,
        body: {
          api_key: k,
          env,
          channex_property_id: cxPropertyId.trim(),
        },
      });
      setWizardStep(2);
      void statusQ.refetch();
    } catch (err) {
      setFormError(formatApiError(err));
    }
  }

  async function onSaveRooms(e: FormEvent): Promise<void> {
    e.preventDefault();
    setFormError(null);
    const pid = selectedPropertyId;
    if (pid === null || pid === "") {
      return;
    }
    const cxRows = channexRoomsQ.data ?? [];
    const mappings = activeRoomTypes
      .map((rt) => {
        const cxId = roomCxSelection[rt.id]?.trim() ?? "";
        if (cxId === "") {
          return null;
        }
        const cx = cxRows.find((r) => r.id === cxId);
        return {
          room_type_id: rt.id,
          channex_room_type_id: cxId,
          channex_room_type_name: cx?.title ?? null,
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);

    if (mappings.length === 0) {
      setFormError(t("channex.errors.noRoomMappings"));
      return;
    }

    try {
      await mapRoomsMut.mutateAsync({ propertyId: pid, body: { mappings } });
      setWizardStep(3);
      void statusQ.refetch();
    } catch (err) {
      setFormError(formatApiError(err));
    }
  }

  async function onSaveRatesAndActivate(e: FormEvent): Promise<void> {
    e.preventDefault();
    setFormError(null);
    const pid = selectedPropertyId;
    if (pid === null || pid === "" || status === undefined) {
      return;
    }
    const cxRateRows = channexRatesQ.data ?? [];
    const ratePlans = ratePlansQ.data ?? [];
    const mappings: Array<{
      room_type_map_id: string;
      rate_plan_id: string;
      channex_rate_plan_id: string;
      channex_rate_plan_name: string | null;
    }> = [];

    for (const m of status.room_type_maps) {
      for (const rp of ratePlans) {
        const k = rateMapKey(m.id, rp.id);
        const cxId = rateCxSelection[k]?.trim() ?? "";
        if (cxId === "") {
          continue;
        }
        const cx = cxRateRows.find((r) => r.id === cxId);
        mappings.push({
          room_type_map_id: m.id,
          rate_plan_id: rp.id,
          channex_rate_plan_id: cxId,
          channex_rate_plan_name: cx?.title ?? null,
        });
      }
    }

    if (mappings.length === 0) {
      setFormError(t("channex.errors.noRateMappings"));
      return;
    }

    try {
      await mapRatesMut.mutateAsync({ propertyId: pid, body: { mappings } });
      await activateMut.mutateAsync(pid);
      void statusQ.refetch();
    } catch (err) {
      setFormError(formatApiError(err));
    }
  }

  function onDisconnect(): void {
    const pid = selectedPropertyId;
    if (pid === null || pid === "") {
      return;
    }
    void (async () => {
      try {
        await disconnectMut.mutateAsync(pid);
        setDisconnectOpen(false);
        setApiKey("");
        setValidatedProps(null);
        setCxPropertyId("");
        setRoomCxSelection({});
        setRateCxSelection({});
        setWizardStep(1);
        void statusQ.refetch();
      } catch (err) {
        setFormError(formatApiError(err));
      }
    })();
  }

  if (!canManage) {
    return (
      <section className="space-y-2 rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">
          {t("channex.title")}
        </h3>
        <p className="text-sm text-muted-foreground">{t("channex.noPermission")}</p>
      </section>
    );
  }

  if (selectedPropertyId === null || selectedPropertyId === "") {
    return (
      <section className="space-y-2 rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">
          {t("channex.title")}
        </h3>
        <p className="text-sm text-muted-foreground">{t("channex.pickProperty")}</p>
      </section>
    );
  }

  if (statusQ.isError) {
    return (
      <section className="space-y-2 rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">
          {t("channex.title")}
        </h3>
        <p className="text-sm text-destructive">{t("channex.errors.loadStatus")}</p>
      </section>
    );
  }

  if (statusQ.isPending || status === undefined) {
    return (
      <section className="rounded-lg border border-border bg-card p-4">
        <div className="h-24 animate-pulse rounded-md bg-muted" aria-hidden />
      </section>
    );
  }

  if (isActive && link !== null) {
    return (
      <section className="space-y-4 rounded-lg border border-border bg-card p-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {t("channex.title")}
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{t("channex.description")}</span>
            <ApiRouteHint>GET /channex/status</ApiRouteHint>
          </p>
        </div>

        <div className="rounded-md border border-border bg-muted/30 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("channex.status.title")}
              </p>
              <p className="mt-1 text-lg font-semibold">
                {t("channex.status.active")}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("channex.status.env")}: {link.channex_env}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("channex.status.connectedAt")}:{" "}
                {link.connected_at !== null
                  ? link.connected_at.slice(0, 19).replace("T", " ")
                  : t("common.notAvailable")}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("channex.status.lastSync")}:{" "}
                {link.last_sync_at !== null
                  ? link.last_sync_at.slice(0, 19).replace("T", " ")
                  : t("channex.status.never")}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("channex.status.mapsLine", {
                  rooms: status.room_maps_count,
                  rates: status.rate_maps_count,
                })}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="text-destructive"
              onClick={() => {
                setDisconnectOpen(true);
              }}
            >
              {t("channex.disconnect")}
            </Button>
          </div>
          {link.error_message !== null && link.error_message !== "" ? (
            <p className="mt-3 text-sm text-destructive">{link.error_message}</p>
          ) : null}
        </div>

        <Dialog open={disconnectOpen} onOpenChange={setDisconnectOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("channex.disconnectTitle")}</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {t("channex.disconnectBody")}
            </p>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setDisconnectOpen(false);
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={disconnectMut.isPending}
                onClick={() => {
                  onDisconnect();
                }}
              >
                {disconnectMut.isPending
                  ? t("channex.disconnecting")
                  : t("channex.disconnectConfirm")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    );
  }

  const stepLabels = [
    t("channex.stepper.step1"),
    t("channex.stepper.step2"),
    t("channex.stepper.step3"),
  ];

  return (
    <section className="space-y-6 rounded-lg border border-border bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          {t("channex.title")}
        </h3>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{t("channex.description")}</span>
          <ApiRouteHint>POST /channex/connect</ApiRouteHint>
        </p>
      </div>

      <ol className="flex flex-wrap gap-2 text-xs">
        {stepLabels.map((label, idx) => {
          const n = (idx + 1) as WizardStep;
          const active = wizardStep === n;
          return (
            <li
              key={label}
              className={
                active
                  ? "rounded-full bg-primary px-3 py-1 font-medium text-primary-foreground"
                  : "rounded-full border border-border px-3 py-1 text-muted-foreground"
              }
            >
              {idx + 1}. {label}
            </li>
          );
        })}
      </ol>

      {formError !== null ? (
        <p className="text-sm text-destructive" role="alert">
          {formError}
        </p>
      ) : null}

      {link !== null && !isActive ? (
        <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
          <span className="font-medium">
            {link.status === "error"
              ? t("channex.status.error")
              : t("channex.status.pending")}
          </span>
          {link.error_message !== null && link.error_message !== "" ? (
            <span className="mt-1 block text-destructive">{link.error_message}</span>
          ) : null}
          <span className="mt-1 block text-muted-foreground">
            {t("channex.status.env")}: {link.channex_env}
            {" · "}
            {t("channex.status.lastSync")}:{" "}
            {link.last_sync_at !== null
              ? link.last_sync_at.slice(0, 19).replace("T", " ")
              : t("channex.status.never")}
          </span>
        </div>
      ) : null}

      {wizardStep === 1 ? (
        <form className="max-w-xl space-y-4" onSubmit={(e) => void onValidateKey(e)}>
          <div className="space-y-1">
            <label htmlFor="chx-key" className="text-sm font-medium">
              {t("channex.step1.apiKey")}
            </label>
            <Input
              id="chx-key"
              type="password"
              autoComplete="off"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
              }}
              placeholder={t("channex.step1.apiKeyPh")}
            />
          </div>
          <div className="space-y-1">
            <span className="text-sm font-medium">{t("channex.step1.env")}</span>
            <Select
              value={env}
              onValueChange={(v) => {
                setEnv(v as "production" | "sandbox");
              }}
            >
              <SelectTrigger aria-label={t("channex.step1.env")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="production">
                  {t("channex.step1.envProduction")}
                </SelectItem>
                <SelectItem value="sandbox">
                  {t("channex.step1.envSandbox")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="submit"
            variant="secondary"
            disabled={validateMut.isPending}
          >
            {validateMut.isPending
              ? t("channex.step1.validating")
              : t("channex.step1.validate")}
          </Button>
        </form>
      ) : null}

      {wizardStep === 1 && validatedProps !== null && validatedProps.length > 0 ? (
        <form className="max-w-xl space-y-4 border-t border-border pt-4" onSubmit={(e) => void onConnect(e)}>
          <div className="space-y-1">
            <span className="text-sm font-medium">
              {t("channex.step1.cxProperty")}
            </span>
            <Select
              value={cxPropertyId}
              onValueChange={(v) => {
                setCxPropertyId(v);
              }}
            >
              <SelectTrigger aria-label={t("channex.step1.cxProperty")}>
                <SelectValue placeholder={t("channex.step1.cxPropertyPh")} />
              </SelectTrigger>
              <SelectContent>
                {validatedProps.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title ?? p.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={connectMut.isPending}>
            {connectMut.isPending
              ? t("channex.step1.connecting")
              : t("channex.step1.connect")}
          </Button>
        </form>
      ) : null}

      {wizardStep === 2 ? (
        <form className="space-y-4" onSubmit={(e) => void onSaveRooms(e)}>
          <p className="text-sm text-muted-foreground">{t("channex.step2.intro")}</p>
          {channexRoomsQ.isError ? (
            <p className="text-sm text-destructive">{t("channex.errors.loadRooms")}</p>
          ) : channexRoomsQ.isPending ? (
            <div className="h-32 animate-pulse rounded-md bg-muted" aria-hidden />
          ) : activeRoomTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("channex.noRoomTypes")}</p>
          ) : (channexRoomsQ.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("channex.noChannexRooms")}
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 font-medium">
                      {t("channex.step2.openHeader")}
                    </th>
                    <th className="px-3 py-2 font-medium">
                      {t("channex.step2.channexHeader")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {activeRoomTypes.map((rt) => (
                    <tr key={rt.id} className="border-b border-border/80">
                      <td className="px-3 py-2">{rt.name}</td>
                      <td className="px-3 py-2">
                        <Select
                          value={
                            roomCxSelection[rt.id] !== undefined &&
                            roomCxSelection[rt.id] !== ""
                              ? roomCxSelection[rt.id]
                              : undefined
                          }
                          onValueChange={(v) => {
                            setRoomCxSelection((prev) => ({
                              ...prev,
                              [rt.id]: v,
                            }));
                          }}
                        >
                          <SelectTrigger aria-label={`${rt.name} Channex`}>
                            <SelectValue placeholder={t("channex.selectChannex")} />
                          </SelectTrigger>
                          <SelectContent>
                            {(channexRoomsQ.data ?? []).map((cx) => (
                              <SelectItem key={cx.id} value={cx.id}>
                                {cx.title ?? cx.id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            {t("channex.step2.skipUnmapped")}
          </p>
          <Button
            type="submit"
            disabled={
              mapRoomsMut.isPending ||
              channexRoomsQ.isPending ||
              activeRoomTypes.length === 0
            }
          >
            {mapRoomsMut.isPending
              ? t("channex.step2.saving")
              : t("channex.step2.save")}
          </Button>
        </form>
      ) : null}

      {wizardStep === 3 && status.connected ? (
        <form className="space-y-4" onSubmit={(e) => void onSaveRatesAndActivate(e)}>
          <p className="text-sm text-muted-foreground">{t("channex.step3.intro")}</p>
          {status.room_type_maps.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("channex.errors.noRoomMapsYet")}
            </p>
          ) : channexRatesQ.isError ? (
            <p className="text-sm text-destructive">{t("channex.errors.loadRates")}</p>
          ) : channexRatesQ.isPending ? (
            <div className="h-32 animate-pulse rounded-md bg-muted" aria-hidden />
          ) : (ratePlansQ.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("channex.noRatePlans")}
            </p>
          ) : (
            <div className="space-y-6">
              {status.room_type_maps.map((m) => {
                const rtName =
                  activeRoomTypes.find((r) => r.id === m.room_type_id)?.name ??
                  m.room_type_id;
                return (
                  <div key={m.id} className="rounded-md border">
                    <p className="border-b bg-muted/40 px-3 py-2 text-sm font-medium">
                      {rtName}
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[480px] text-left text-sm">
                        <thead className="border-b bg-muted/50">
                          <tr>
                            <th className="px-3 py-2 font-medium">
                              {t("channex.step3.ratePlan")}
                            </th>
                            <th className="px-3 py-2 font-medium">Channex</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(ratePlansQ.data ?? []).map((rp) => {
                            const rk = rateMapKey(m.id, rp.id);
                            return (
                              <tr key={rk} className="border-b border-border/80">
                                <td className="px-3 py-2">{rp.name}</td>
                                <td className="px-3 py-2">
                                  <Select
                                    value={
                                      rateCxSelection[rk] !== undefined &&
                                      rateCxSelection[rk] !== ""
                                        ? rateCxSelection[rk]
                                        : undefined
                                    }
                                    onValueChange={(v) => {
                                      setRateCxSelection((prev) => ({
                                        ...prev,
                                        [rk]: v,
                                      }));
                                    }}
                                  >
                                    <SelectTrigger aria-label={`${rp.name} Channex rate`}>
                                      <SelectValue
                                        placeholder={t("channex.selectChannex")}
                                      />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {(channexRatesQ.data ?? []).map((cx) => (
                                        <SelectItem key={cx.id} value={cx.id}>
                                          {cx.title ?? cx.id}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <Button
            type="submit"
            disabled={
              mapRatesMut.isPending ||
              activateMut.isPending ||
              channexRatesQ.isPending ||
              (ratePlansQ.data?.length ?? 0) === 0 ||
              status.room_type_maps.length === 0
            }
          >
            {mapRatesMut.isPending || activateMut.isPending
              ? t("channex.step3.saving")
              : t("channex.step3.save")}
          </Button>
        </form>
      ) : null}
    </section>
  );
}
