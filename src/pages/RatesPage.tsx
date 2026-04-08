import { Loader2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import i18n from "@/i18n";

import { ApiRouteHint } from "@/components/dev/ApiRouteHint";
import { RatesBulkEditor } from "@/components/rates/RatesBulkEditor";
import { RatesMatrix } from "@/components/rates/RatesMatrix";
import {
  RatesGridPeriodToolbar,
  RatesRatePlanStrip,
} from "@/components/rates/RatesPlanSelector";
import { formatCreateRatePlan403Error } from "@/components/rates/ratesPageHelpers";
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
import { useAvailabilityGrid } from "@/hooks/useAvailabilityGrid";
import { useBulkUpsertRates } from "@/hooks/useBulkUpsertRates";
import {
  useCreateRatePlan,
  useDeleteRatePlan,
  usePatchRatePlan,
} from "@/hooks/useRatePlanMutations";
import { useNightlyRatesMatrix } from "@/hooks/useNightlyRatesMatrix";
import { useRatePlans } from "@/hooks/useRatePlans";
import { useProperties } from "@/hooks/useProperties";
import { useRoomTypes } from "@/hooks/useRoomTypes";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { formatApiError } from "@/lib/formatApiError";
import { toastError, toastSuccess } from "@/lib/toast";
import { useCanManageProperties } from "@/hooks/useAuthz";
import { usePropertyStore } from "@/stores/property-store";
import type { AvailabilityCell } from "@/types/inventory";
import type { BulkRateSegment, RatePlanRead } from "@/types/rates";
import type { RatePlanCreate } from "@/types/rate-plans";
import { cn } from "@/lib/utils";
import {
  formatIsoDateLocal,
  getMonthRange,
  getWeekRange,
  shiftMonthAnchor,
} from "@/utils/boardDates";

export function RatesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const canWriteRates = useCanManageProperties();
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());
  const [ratesPeriod, setRatesPeriod] = useState<"month" | "week">("month");
  const range = useMemo(() => {
    if (ratesPeriod === "month") {
      return getMonthRange(monthAnchor);
    }
    return getWeekRange(monthAnchor);
  }, [ratesPeriod, monthAnchor]);

  const { data: roomTypes, isPending: roomTypesPending } = useRoomTypes();
  const { data: ratePlans, isPending: ratePlansPending } = useRatePlans();
  const { data: properties } = useProperties();
  const propertyCurrency = useMemo(() => {
    if (selectedPropertyId === null || properties === undefined) {
      return null;
    }
    return (
      properties.find((p) => p.id === selectedPropertyId)?.currency ?? null
    );
  }, [properties, selectedPropertyId]);

  const roomTypeIds = useMemo(
    () => roomTypes?.map((r) => r.id) ?? [],
    [roomTypes]
  );

  const [ratePlanId, setRatePlanId] = useState("");
  const [bulkRoomTypeId, setBulkRoomTypeId] = useState("");

  useEffect(() => {
    if (
      roomTypes !== undefined &&
      roomTypes.length > 0 &&
      !roomTypes.some((r) => r.id === bulkRoomTypeId)
    ) {
      setBulkRoomTypeId(roomTypes[0].id);
    }
  }, [roomTypes, bulkRoomTypeId]);

  useEffect(() => {
    if (
      ratePlans !== undefined &&
      ratePlans.length > 0 &&
      !ratePlans.some((r) => r.id === ratePlanId)
    ) {
      setRatePlanId(ratePlans[0].id);
    }
  }, [ratePlans, ratePlanId]);

  const {
    rows: matrixRows,
    isAnyError: ratesError,
    firstError: ratesErrorObj,
  } = useNightlyRatesMatrix(
    roomTypeIds,
    ratePlanId !== "" ? ratePlanId : null,
    range.startIso,
    range.endIso
  );

  const {
    data: availabilityGrid,
    isPending: availabilityPending,
    isError: availabilityError,
    error: availabilityErrorObj,
  } = useAvailabilityGrid(range.startIso, range.endIso);

  const availabilityByKey = useMemo(() => {
    const m = new Map<string, AvailabilityCell>();
    for (const cell of availabilityGrid?.cells ?? []) {
      m.set(`${cell.date}_${cell.room_type_id}`, cell);
    }
    return m;
  }, [availabilityGrid?.cells]);

  const allRatesStillPending =
    matrixRows.length > 0 && matrixRows.every((r) => r.isPending);

  const initialBulkRange = getMonthRange(new Date());
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkStopSell, setBulkStopSell] = useState(false);
  const [bulkMinStay, setBulkMinStay] = useState("");
  const [bulkMaxStay, setBulkMaxStay] = useState("");
  const [bulkStart, setBulkStart] = useState(initialBulkRange.startIso);
  const [bulkEnd, setBulkEnd] = useState(initialBulkRange.endIso);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const bulkMutation = useBulkUpsertRates();
  const createRatePlanMutation = useCreateRatePlan();
  const deleteRatePlanMutation = useDeleteRatePlan();
  const patchRatePlanMutation = usePatchRatePlan();

  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanPolicy, setNewPlanPolicy] = useState(() =>
    i18n.t("rates.defaultCancellationPolicy")
  );
  const [newPlanError, setNewPlanError] = useState<string | null>(null);
  const [addRatePlanDialogOpen, setAddRatePlanDialogOpen] = useState(false);
  const [deleteRatePlanDialogOpen, setDeleteRatePlanDialogOpen] =
    useState(false);
  const [editRatePlanDialogOpen, setEditRatePlanDialogOpen] =
    useState(false);
  const [editPlanName, setEditPlanName] = useState("");
  const [editPlanPolicy, setEditPlanPolicy] = useState("");
  const [editPlanError, setEditPlanError] = useState<string | null>(null);
  const [cellEdit, setCellEdit] = useState<{
    roomTypeId: string;
    roomTypeName: string;
    dateIso: string;
    dateLabel: string;
    priceDraft: string;
    stopSell: boolean;
    minStayArrivalDraft: string;
    maxStayDraft: string;
  } | null>(null);

  const selectedRatePlanName =
    ratePlans?.find((r) => r.id === ratePlanId)?.name ?? "";

  useEffect(() => {
    setBulkStart(range.startIso);
    setBulkEnd(range.endIso);
  }, [range.startIso, range.endIso]);

  useEffect(() => {
    setCellEdit(null);
  }, [monthAnchor, ratesPeriod]);

  async function submitNewRatePlan(
    e: FormEvent<HTMLFormElement>,
    options: { fromDialog: boolean }
  ): Promise<void> {
    e.preventDefault();
    setNewPlanError(null);

    if (selectedPropertyId === null) {
      setNewPlanError(t("rates.err.selectProperty"));
      return;
    }

    const nameTrim = newPlanName.trim();
    if (nameTrim === "") {
      setNewPlanError(t("rates.err.planName"));
      return;
    }

    const policyTrim = newPlanPolicy.trim();
    if (policyTrim === "") {
      setNewPlanError(t("rates.err.planPolicy"));
      return;
    }

    const body: RatePlanCreate = {
      property_id: selectedPropertyId,
      name: nameTrim,
      cancellation_policy: policyTrim,
    };

    try {
      const created = await createRatePlanMutation.mutateAsync(body);
      setNewPlanName("");
      setNewPlanPolicy(i18n.t("rates.defaultCancellationPolicy"));
      setRatePlanId(created.id);
      if (options.fromDialog) {
        setAddRatePlanDialogOpen(false);
      }
    } catch (err) {
      setNewPlanError(formatCreateRatePlan403Error(err));
    }
  }

  async function handleBulkApply(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setBulkMessage(null);
    setBulkError(null);

    if (
      selectedPropertyId === null ||
      bulkRoomTypeId === "" ||
      ratePlanId === ""
    ) {
      setBulkError(t("rates.err.bulkSelection"));
      return;
    }

    if (bulkStart === "" || bulkEnd === "") {
      setBulkError(t("rates.err.bulkDates"));
      return;
    }
    if (bulkEnd < bulkStart) {
      setBulkError(t("rates.err.bulkOrder"));
      return;
    }

    const trimmed = bulkPrice.trim().replace(",", ".");
    if (trimmed === "" || Number.isNaN(Number(trimmed)) || Number(trimmed) < 0) {
      setBulkError(t("rates.err.priceNonNegative"));
      return;
    }

    const segment: BulkRateSegment = {
      room_type_id: bulkRoomTypeId,
      rate_plan_id: ratePlanId,
      start_date: bulkStart,
      end_date: bulkEnd,
      price: trimmed,
      stop_sell: bulkStopSell,
    };
    const minTrim = bulkMinStay.trim();
    if (minTrim !== "") {
      const n = Number.parseInt(minTrim, 10);
      if (!Number.isNaN(n) && n >= 1) {
        segment.min_stay_arrival = n;
      }
    }
    const maxTrim = bulkMaxStay.trim();
    if (maxTrim !== "") {
      const n = Number.parseInt(maxTrim, 10);
      if (!Number.isNaN(n) && n >= 1) {
        segment.max_stay = n;
      }
    }
    if (
      segment.min_stay_arrival != null &&
      segment.max_stay != null &&
      segment.max_stay < segment.min_stay_arrival
    ) {
      setBulkError(t("rates.err.stayOrder"));
      return;
    }

    try {
      const res = await bulkMutation.mutateAsync({ segments: [segment] });
      setBulkMessage(t("rates.savedBulkRows", { count: res.rows_upserted }));
    } catch (err) {
      setBulkError(formatApiError(err));
    }
  }

  async function submitCellEdit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (cellEdit === null) return;
    if (selectedPropertyId === null || ratePlanId === "") {
      toastError(t("rates.toast.selectForCell"));
      return;
    }

    const trimmed = cellEdit.priceDraft.trim().replace(",", ".");
    if (
      trimmed === "" ||
      Number.isNaN(Number(trimmed)) ||
      Number(trimmed) < 0
    ) {
      toastError(t("rates.err.priceNonNegative"));
      return;
    }

    const segment: BulkRateSegment = {
      room_type_id: cellEdit.roomTypeId,
      rate_plan_id: ratePlanId,
      start_date: cellEdit.dateIso,
      end_date: cellEdit.dateIso,
      price: trimmed,
      stop_sell: cellEdit.stopSell,
    };
    const minTrim = cellEdit.minStayArrivalDraft.trim();
    if (minTrim !== "") {
      const n = Number.parseInt(minTrim, 10);
      if (!Number.isNaN(n) && n >= 1) {
        segment.min_stay_arrival = n;
      }
    }
    const maxTrim = cellEdit.maxStayDraft.trim();
    if (maxTrim !== "") {
      const n = Number.parseInt(maxTrim, 10);
      if (!Number.isNaN(n) && n >= 1) {
        segment.max_stay = n;
      }
    }
    if (
      segment.min_stay_arrival != null &&
      segment.max_stay != null &&
      segment.max_stay < segment.min_stay_arrival
    ) {
      toastError(t("rates.err.stayOrder"));
      return;
    }

    try {
      await bulkMutation.mutateAsync({ segments: [segment] });
      toastSuccess(t("rates.toast.priceSaved"));
      setCellEdit(null);
    } catch (err) {
      toastError(formatApiError(err));
    }
  }

  const typesReady = !roomTypesPending && roomTypes !== undefined;
  const plansReady = !ratePlansPending && ratePlans !== undefined;
  const hasRoomTypes = typesReady && roomTypes.length > 0;
  const hasRatePlans = plansReady && ratePlans.length > 0;
  const todayIso = formatIsoDateLocal(new Date());

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          {t("rates.sectionTitle")}
        </h2>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{t("rates.introCalendar")}</span>
          <ApiRouteHint>GET /rates</ApiRouteHint>
          <ApiRouteHint>GET /rates/batch</ApiRouteHint>
          <ApiRouteHint>PUT /rates/bulk</ApiRouteHint>
          <Trans
            i18nKey="rates.introSeeBoard"
            components={{
              boardLink: (
                <Link
                  to="/board"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                />
              ),
            }}
          />
        </p>
      </div>

      <section className="rounded-lg border border-border bg-card p-4 space-y-4">
        <RatesGridPeriodToolbar
          ratesPeriod={ratesPeriod}
          onRatesPeriodChange={setRatesPeriod}
          onPrevPeriod={() => {
            if (ratesPeriod === "month") {
              setMonthAnchor((a) => shiftMonthAnchor(a, -1));
            } else {
              setMonthAnchor((a) => {
                const d = new Date(a);
                d.setDate(d.getDate() - 7);
                return d;
              });
            }
          }}
          onNextPeriod={() => {
            if (ratesPeriod === "month") {
              setMonthAnchor((a) => shiftMonthAnchor(a, 1));
            } else {
              setMonthAnchor((a) => {
                const d = new Date(a);
                d.setDate(d.getDate() + 7);
                return d;
              });
            }
          }}
          monthAnchor={monthAnchor}
          rangeStartIso={range.startIso}
          rangeEndIso={range.endIso}
        />

        {selectedPropertyId === null ? (
          <p className="text-sm text-muted-foreground">
            {t("rates.selectProperty")}
          </p>
        ) : !hasRoomTypes ? (
          <p className="text-sm text-muted-foreground">
            <Trans
              i18nKey="rates.needRoomTypeRich"
              components={{
                settingsLink: (
                  <Link
                    to="/settings#room-types-hint"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  />
                ),
              }}
            />
          </p>
        ) : !hasRatePlans ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              <Trans
                i18nKey="rates.needPlansRich"
                components={{
                  post: (
                    <code className="rounded bg-muted px-1 font-mono text-xs" />
                  ),
                  docs: (
                    <code className="rounded bg-muted px-1 font-mono text-xs" />
                  ),
                }}
              />
            </p>
            {canWriteRates ? (
              <form
                className="max-w-lg space-y-3 rounded-md border border-dashed bg-muted/20 p-3"
                onSubmit={(e) => void submitNewRatePlan(e, { fromDialog: false })}
              >
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t("rates.inlineNewPlanTitle")}
                </p>
                {newPlanError !== null ? (
                  <p className="text-sm text-destructive" role="alert">
                    {newPlanError}
                  </p>
                ) : null}
                <div className="space-y-2">
                  <label htmlFor="rate-plan-name" className="text-sm font-medium">
                    {t("rates.planName")}
                  </label>
                  <Input
                    id="rate-plan-name"
                    value={newPlanName}
                    onChange={(ev) => {
                      setNewPlanName(ev.target.value);
                    }}
                    placeholder={t("rates.planNamePh")}
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="rate-plan-policy"
                    className="text-sm font-medium"
                  >
                    {t("rates.planPolicy")}
                  </label>
                  <textarea
                    id="rate-plan-policy"
                    className={cn(
                      "flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                    )}
                    value={newPlanPolicy}
                    onChange={(ev) => {
                      setNewPlanPolicy(ev.target.value);
                    }}
                    rows={3}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={createRatePlanMutation.isPending}
                >
                  {createRatePlanMutation.isPending
                    ? t("rates.createPlanCreating")
                    : t("rates.createPlan")}
                </Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("rates.createPlanRoles")}
              </p>
            )}
          </div>
        ) : (
          <>
            <RatesRatePlanStrip
              ratePlans={ratePlans}
              ratePlanId={ratePlanId}
              onRatePlanIdChange={setRatePlanId}
              onRequestNewRatePlan={() => {
                setNewPlanError(null);
                setAddRatePlanDialogOpen(true);
              }}
              canWriteRates={canWriteRates}
              onEditRatePlan={() => {
                const rp = ratePlans?.find((r) => r.id === ratePlanId);
                if (rp === undefined) return;
                setEditPlanName(rp.name);
                setEditPlanPolicy(rp.cancellation_policy);
                setEditPlanError(null);
                setEditRatePlanDialogOpen(true);
              }}
              onDeleteRatePlan={() => {
                setDeleteRatePlanDialogOpen(true);
              }}
            />

            <RatesMatrix
              roomTypes={roomTypes}
              matrixRows={matrixRows}
              rangeDays={range.days}
              todayIso={todayIso}
              ratesError={ratesError}
              ratesErrorObj={ratesErrorObj}
              availabilityError={availabilityError}
              availabilityErrorObj={availabilityErrorObj}
              availabilityPending={availabilityPending}
              availabilityByKey={availabilityByKey}
              allRatesStillPending={allRatesStillPending}
              skeletonMinHeightRem={
                Math.max(4, (roomTypes?.length ?? 1) * 2.25) + 2
              }
              canWriteRates={canWriteRates}
              selectedPropertyId={selectedPropertyId}
              ratePlanId={ratePlanId}
              propertyCurrency={propertyCurrency}
              onOpenCellEdit={setCellEdit}
            />

            <RatesBulkEditor
              canWriteRates={canWriteRates}
              roomTypes={roomTypes}
              bulkRoomTypeId={bulkRoomTypeId}
              onBulkRoomTypeIdChange={setBulkRoomTypeId}
              bulkStart={bulkStart}
              onBulkStartChange={setBulkStart}
              bulkEnd={bulkEnd}
              onBulkEndChange={setBulkEnd}
              bulkPrice={bulkPrice}
              onBulkPriceChange={setBulkPrice}
              bulkStopSell={bulkStopSell}
              onBulkStopSellChange={setBulkStopSell}
              bulkMinStay={bulkMinStay}
              onBulkMinStayChange={setBulkMinStay}
              bulkMaxStay={bulkMaxStay}
              onBulkMaxStayChange={setBulkMaxStay}
              bulkError={bulkError}
              bulkMessage={bulkMessage}
              bulkMutation={bulkMutation}
              onSubmit={(e) => void handleBulkApply(e)}
            />
          </>
        )}
      </section>

      <Dialog
        open={cellEdit !== null}
        onOpenChange={(open) => {
          if (!open) setCellEdit(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("rates.cellPriceHint")}</DialogTitle>
            <DialogDescription>
              {cellEdit !== null
                ? `${cellEdit.roomTypeName} · ${cellEdit.dateLabel}`
                : null}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => void submitCellEdit(e)}
          >
            <div className="space-y-1">
              <label htmlFor="cell-rate-price" className="text-sm font-medium">
                {t("rates.cellPriceLabel")}
              </label>
              <Input
                id="cell-rate-price"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                value={cellEdit?.priceDraft ?? ""}
                onChange={(ev) => {
                  setCellEdit((prev) =>
                    prev === null
                      ? prev
                      : { ...prev, priceDraft: ev.target.value }
                  );
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="cell-rate-stop-sell"
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={cellEdit?.stopSell ?? false}
                onChange={(ev) => {
                  setCellEdit((prev) =>
                    prev === null ? prev : { ...prev, stopSell: ev.target.checked }
                  );
                }}
              />
              <label htmlFor="cell-rate-stop-sell" className="text-sm font-medium">
                {t("rates.restrictions.stopSell")}
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label
                  htmlFor="cell-min-stay"
                  className="text-sm font-medium"
                >
                  {t("rates.restrictions.minStayArrival")}
                </label>
                <Input
                  id="cell-min-stay"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  placeholder="—"
                  value={cellEdit?.minStayArrivalDraft ?? ""}
                  onChange={(ev) => {
                    setCellEdit((prev) =>
                      prev === null
                        ? prev
                        : { ...prev, minStayArrivalDraft: ev.target.value }
                    );
                  }}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="cell-max-stay" className="text-sm font-medium">
                  {t("rates.restrictions.maxStay")}
                </label>
                <Input
                  id="cell-max-stay"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  placeholder="—"
                  value={cellEdit?.maxStayDraft ?? ""}
                  onChange={(ev) => {
                    setCellEdit((prev) =>
                      prev === null
                        ? prev
                        : { ...prev, maxStayDraft: ev.target.value }
                    );
                  }}
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCellEdit(null)}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={bulkMutation.isPending}>
                {bulkMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : null}
                {bulkMutation.isPending ? t("rates.savingCell") : t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editRatePlanDialogOpen}
        onOpenChange={(open) => {
          setEditRatePlanDialogOpen(open);
          if (!open) setEditPlanError(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("rates.editPlanTitle")}</DialogTitle>
            <DialogDescription>
              <code className="rounded bg-muted px-1 font-mono text-xs">
                {"PATCH /rate-plans/{id}"}
              </code>
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              setEditPlanError(null);
              const id = ratePlanId;
              if (id === "") return;
              const nameTrim = editPlanName.trim();
              const polTrim = editPlanPolicy.trim();
              if (nameTrim === "" || polTrim === "") {
                setEditPlanError(t("rates.editPlanError"));
                return;
              }
              void (async () => {
                try {
                  await patchRatePlanMutation.mutateAsync({
                    ratePlanId: id,
                    body: { name: nameTrim, cancellation_policy: polTrim },
                  });
                  setEditRatePlanDialogOpen(false);
                } catch (err) {
                  setEditPlanError(formatApiError(err));
                }
              })();
            }}
          >
            {editPlanError !== null ? (
              <p className="text-sm text-destructive" role="alert">
                {editPlanError}
              </p>
            ) : null}
            <div className="space-y-2">
              <label htmlFor="edit-rp-name" className="text-sm font-medium">
                {t("rates.planName")}
              </label>
              <Input
                id="edit-rp-name"
                value={editPlanName}
                onChange={(ev) => setEditPlanName(ev.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-rp-policy" className="text-sm font-medium">
                {t("rates.planPolicy")}
              </label>
              <textarea
                id="edit-rp-policy"
                className={cn(
                  "flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                )}
                value={editPlanPolicy}
                onChange={(ev) => setEditPlanPolicy(ev.target.value)}
                rows={3}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditRatePlanDialogOpen(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={patchRatePlanMutation.isPending}>
                {patchRatePlanMutation.isPending
                  ? t("rates.saving")
                  : t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteRatePlanDialogOpen}
        onOpenChange={(open) => {
          setDeleteRatePlanDialogOpen(open);
          if (!open) {
            deleteRatePlanMutation.reset();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("rates.deletePlanTitle")}</DialogTitle>
            <DialogDescription>
              {t("rates.deletePlanBody", {
                name:
                  selectedRatePlanName !== ""
                    ? selectedRatePlanName
                    : ratePlanId.slice(0, 8),
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteRatePlanDialogOpen(false);
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteRatePlanMutation.isPending || ratePlanId === ""}
              onClick={() => {
                const id = ratePlanId;
                if (id === "") return;
                void (async () => {
                  try {
                    await deleteRatePlanMutation.mutateAsync(id);
                    const authKey = authQueryKeyPart();
                    const pid = selectedPropertyId;
                    if (pid !== null) {
                      await queryClient.refetchQueries({
                        queryKey: ["rate-plans", authKey, pid],
                      });
                      let fresh =
                        queryClient.getQueryData<RatePlanRead[]>([
                          "rate-plans",
                          authKey,
                          pid,
                        ]) ?? [];
                      /** Refetch сразу после 204 может попасть в ответ до commit на бэке. */
                      if (fresh.some((p) => p.id === id)) {
                        fresh = fresh.filter((p) => p.id !== id);
                        queryClient.setQueryData(
                          ["rate-plans", authKey, pid],
                          fresh
                        );
                      }
                      setRatePlanId(fresh[0]?.id ?? "");
                    } else {
                      setRatePlanId("");
                    }
                    setDeleteRatePlanDialogOpen(false);
                    deleteRatePlanMutation.reset();
                    toastSuccess(t("rates.deleteToast"));
                  } catch (err) {
                    deleteRatePlanMutation.reset();
                    toastError(formatApiError(err));
                  }
                })();
              }}
            >
              {deleteRatePlanMutation.isPending
                ? t("rates.deleteDeleting")
                : t("rates.deleteConfirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={addRatePlanDialogOpen}
        onOpenChange={(open) => {
          setAddRatePlanDialogOpen(open);
          if (!open) {
            setNewPlanError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("rates.newPlanTitle")}</DialogTitle>
            <DialogDescription>{t("rates.newPlanHint")}</DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => void submitNewRatePlan(e, { fromDialog: true })}
          >
            {newPlanError !== null ? (
              <p className="text-sm text-destructive" role="alert">
                {newPlanError}
              </p>
            ) : null}
            <div className="space-y-2">
              <label
                htmlFor="rate-plan-name-dialog"
                className="text-sm font-medium"
              >
                {t("rates.planName")}
              </label>
              <Input
                id="rate-plan-name-dialog"
                value={newPlanName}
                onChange={(ev) => {
                  setNewPlanName(ev.target.value);
                }}
                placeholder={t("rates.planNamePhDialog")}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="rate-plan-policy-dialog"
                className="text-sm font-medium"
              >
                {t("rates.planPolicy")}
              </label>
              <textarea
                id="rate-plan-policy-dialog"
                className={cn(
                  "flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                )}
                value={newPlanPolicy}
                onChange={(ev) => {
                  setNewPlanPolicy(ev.target.value);
                }}
                rows={3}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAddRatePlanDialogOpen(false);
                  setNewPlanError(null);
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={createRatePlanMutation.isPending}>
                {createRatePlanMutation.isPending
                  ? t("rates.createPlanCreating")
                  : t("rates.createSubmit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
