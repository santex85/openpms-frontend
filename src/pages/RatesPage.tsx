import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Link } from "react-router-dom";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAvailabilityGrid } from "@/hooks/useAvailabilityGrid";
import { useBulkUpsertRates } from "@/hooks/useBulkUpsertRates";
import {
  useCreateRatePlan,
  useDeleteRatePlan,
  usePatchRatePlan,
} from "@/hooks/useRatePlanMutations";
import { useNightlyRatesMatrix } from "@/hooks/useNightlyRatesMatrix";
import { useRatePlans } from "@/hooks/useRatePlans";
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
  getMonthFortnightRange,
  getMonthRange,
  shiftMonthAnchor,
} from "@/utils/boardDates";

const DEFAULT_CANCELLATION_POLICY =
  "Отмена бесплатно не позднее чем за 24 часа до заезда; при более поздней отмене может удерживаться стоимость первой ночи.";

/** Sentinel for Radix Select: open «new plan» dialog instead of changing value. */
const NEW_RATE_PLAN_SELECT_VALUE = "__new_rate_plan__";

function formatCreateRatePlanError(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.status === 403) {
    return "Недостаточно прав: тарифные планы создают owner и manager.";
  }
  return formatApiError(err);
}

function monthTitleRu(anchor: Date): string {
  return anchor.toLocaleDateString("ru-RU", {
    month: "long",
    year: "numeric",
  });
}

function occupancyTitle(
  cell: AvailabilityCell | undefined,
  availabilityPending: boolean,
  availabilityErrored: boolean
): string | undefined {
  if (availabilityErrored || availabilityPending) {
    return undefined;
  }
  if (cell === undefined) {
    return undefined;
  }
  const blockedSuffix =
    cell.blocked_rooms > 0 ? `, блок ${String(cell.blocked_rooms)}` : "";
  return `Занято: ${String(cell.booked_rooms)}${blockedSuffix}. Свободно: ${String(cell.available_rooms)}`;
}

export function RatesPage() {
  const queryClient = useQueryClient();
  const canWriteRates = useCanManageProperties();
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());
  const [gridView, setGridView] = useState<"month" | "fortnight">("month");
  const month = useMemo(
    () =>
      gridView === "month"
        ? getMonthRange(monthAnchor)
        : getMonthFortnightRange(monthAnchor),
    [monthAnchor, gridView]
  );
  const todayIso = useMemo(() => formatIsoDateLocal(new Date()), []);

  const { data: roomTypes, isPending: roomTypesPending } = useRoomTypes();
  const { data: ratePlans, isPending: ratePlansPending } = useRatePlans();

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
    month.startIso,
    month.endIso
  );

  const {
    data: availabilityGrid,
    isPending: availabilityPending,
    isError: availabilityError,
    error: availabilityErrorObj,
  } = useAvailabilityGrid(month.startIso, month.endIso);

  const availabilityByKey = useMemo(() => {
    const m = new Map<string, AvailabilityCell>();
    for (const cell of availabilityGrid?.cells ?? []) {
      m.set(`${cell.date}_${cell.room_type_id}`, cell);
    }
    return m;
  }, [availabilityGrid?.cells]);

  const allRatesStillPending =
    matrixRows.length > 0 && matrixRows.every((r) => r.isPending);

  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkStart, setBulkStart] = useState(month.startIso);
  const [bulkEnd, setBulkEnd] = useState(month.endIso);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const bulkMutation = useBulkUpsertRates();
  const createRatePlanMutation = useCreateRatePlan();
  const deleteRatePlanMutation = useDeleteRatePlan();
  const patchRatePlanMutation = usePatchRatePlan();

  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanPolicy, setNewPlanPolicy] = useState(
    DEFAULT_CANCELLATION_POLICY
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
  } | null>(null);

  const selectedRatePlanName =
    ratePlans?.find((r) => r.id === ratePlanId)?.name ?? "";

  useEffect(() => {
    setBulkStart(month.startIso);
    setBulkEnd(month.endIso);
  }, [month.startIso, month.endIso]);

  useEffect(() => {
    setCellEdit(null);
  }, [monthAnchor]);

  async function submitNewRatePlan(
    e: FormEvent<HTMLFormElement>,
    options: { fromDialog: boolean }
  ): Promise<void> {
    e.preventDefault();
    setNewPlanError(null);

    if (selectedPropertyId === null) {
      setNewPlanError("Выберите отель в шапке.");
      return;
    }

    const nameTrim = newPlanName.trim();
    if (nameTrim === "") {
      setNewPlanError("Введите название тарифного плана.");
      return;
    }

    const policyTrim = newPlanPolicy.trim();
    if (policyTrim === "") {
      setNewPlanError("Укажите политику отмены.");
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
      setNewPlanPolicy(DEFAULT_CANCELLATION_POLICY);
      setRatePlanId(created.id);
      if (options.fromDialog) {
        setAddRatePlanDialogOpen(false);
      }
    } catch (err) {
      setNewPlanError(formatCreateRatePlanError(err));
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
      setBulkError("Выберите отель, категорию номера и тарифный план.");
      return;
    }

    if (bulkStart === "" || bulkEnd === "") {
      setBulkError("Укажите даты диапазона.");
      return;
    }
    if (bulkEnd < bulkStart) {
      setBulkError("Конец периода не может быть раньше начала.");
      return;
    }

    const trimmed = bulkPrice.trim().replace(",", ".");
    if (trimmed === "" || Number.isNaN(Number(trimmed)) || Number(trimmed) < 0) {
      setBulkError("Цена — неотрицательное число.");
      return;
    }

    const segment: BulkRateSegment = {
      room_type_id: bulkRoomTypeId,
      rate_plan_id: ratePlanId,
      start_date: bulkStart,
      end_date: bulkEnd,
      price: trimmed,
    };

    try {
      const res = await bulkMutation.mutateAsync({ segments: [segment] });
      setBulkMessage(
        `Сохранено строк: ${String(res.rows_upserted)}.`
      );
    } catch (err) {
      setBulkError(formatApiError(err));
    }
  }

  async function submitCellEdit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (cellEdit === null) return;
    if (selectedPropertyId === null || ratePlanId === "") {
      toastError("Выберите отель и тарифный план.");
      return;
    }

    const trimmed = cellEdit.priceDraft.trim().replace(",", ".");
    if (
      trimmed === "" ||
      Number.isNaN(Number(trimmed)) ||
      Number(trimmed) < 0
    ) {
      toastError("Цена — неотрицательное число.");
      return;
    }

    const segment: BulkRateSegment = {
      room_type_id: cellEdit.roomTypeId,
      rate_plan_id: ratePlanId,
      start_date: cellEdit.dateIso,
      end_date: cellEdit.dateIso,
      price: trimmed,
    };

    try {
      await bulkMutation.mutateAsync({ segments: [segment] });
      toastSuccess("Цена сохранена");
      setCellEdit(null);
    } catch (err) {
      toastError(formatApiError(err));
    }
  }

  const typesReady = !roomTypesPending && roomTypes !== undefined;
  const plansReady = !ratePlansPending && ratePlans !== undefined;
  const hasRoomTypes = typesReady && roomTypes.length > 0;
  const hasRatePlans = plansReady && ratePlans.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          Тарифы и цены
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Календарная сетка ночных тарифов. Остатки по дням подсказкой при наведении;
          полная картина — на{" "}
          <Link
            to="/board"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            доске размещений
          </Link>
          .
        </p>
        <ApiRouteHint className="mt-1 text-sm">
          <span className="font-mono text-[10px]">GET /rates, PUT /rates/bulk</span>
        </ApiRouteHint>
      </div>

      <section className="rounded-lg border border-border bg-card p-4 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Сетка тарифов
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <div className="mr-1 flex rounded-md border border-border p-0.5">
              <Button
                type="button"
                variant={gridView === "month" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-2.5"
                onClick={() => {
                  setGridView("month");
                }}
              >
                Месяц
              </Button>
              <Button
                type="button"
                variant={gridView === "fortnight" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-2.5"
                onClick={() => {
                  setGridView("fortnight");
                }}
              >
                2 недели
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              aria-label="Предыдущий месяц"
              onClick={() => {
                setMonthAnchor((a) => shiftMonthAnchor(a, -1));
              }}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-[10rem] text-center text-sm tabular-nums text-foreground capitalize">
              {monthTitleRu(monthAnchor)}
            </span>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              aria-label="Следующий месяц"
              onClick={() => {
                setMonthAnchor((a) => shiftMonthAnchor(a, 1));
              }}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {selectedPropertyId === null ? (
          <p className="text-sm text-muted-foreground">
            Выберите отель в шапке, чтобы загрузить типы номеров, тарифы и цены.
          </p>
        ) : !hasRoomTypes ? (
          <p className="text-sm text-muted-foreground">
            Сначала создайте тип номера в{" "}
            <Link
              to="/settings#room-types-hint"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              настройках
            </Link>
            .
          </p>
        ) : !hasRatePlans ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Для сетки цен нужен хотя бы один тарифный план (BAR, пакет и т.д.).
              Создайте его ниже или через документацию API.
            </p>
            <ApiRouteHint className="text-sm">
              <code className="rounded bg-muted px-1 font-mono text-[10px]">
                POST /rate-plans
              </code>
            </ApiRouteHint>
            {canWriteRates ? (
              <form
                className="max-w-lg space-y-3 rounded-md border border-dashed bg-muted/20 p-3"
                onSubmit={(e) => void submitNewRatePlan(e, { fromDialog: false })}
              >
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Новый тарифный план
                </p>
                {newPlanError !== null ? (
                  <p className="text-sm text-destructive" role="alert">
                    {newPlanError}
                  </p>
                ) : null}
                <div className="space-y-2">
                  <label htmlFor="rate-plan-name" className="text-sm font-medium">
                    Название
                  </label>
                  <Input
                    id="rate-plan-name"
                    value={newPlanName}
                    onChange={(ev) => {
                      setNewPlanName(ev.target.value);
                    }}
                    placeholder="Например, BAR или Стандарт"
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="rate-plan-policy"
                    className="text-sm font-medium"
                  >
                    Политика отмены
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
                  {createRatePlanMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Создаём…
                    </>
                  ) : (
                    "Создать тарифный план"
                  )}
                </Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">
                Создание планов доступно ролям owner и manager; при
                необходимости обратитесь к администратору отеля.
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="max-w-xl space-y-2">
              <span className="text-sm font-medium">Тарифный план</span>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <Select
                    value={ratePlanId}
                    onValueChange={(v) => {
                      if (v === NEW_RATE_PLAN_SELECT_VALUE) {
                        setNewPlanError(null);
                        setAddRatePlanDialogOpen(true);
                        return;
                      }
                      setRatePlanId(v);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="BAR / пакет" />
                    </SelectTrigger>
                    <SelectContent>
                      {ratePlans?.map((rp) => (
                        <SelectItem key={rp.id} value={rp.id}>
                          {rp.name}
                        </SelectItem>
                      ))}
                      {canWriteRates ? (
                        <>
                          <SelectSeparator />
                          <SelectItem
                            value={NEW_RATE_PLAN_SELECT_VALUE}
                            className="text-primary focus:text-primary"
                          >
                            + Добавить новый тариф
                          </SelectItem>
                        </>
                      ) : null}
                    </SelectContent>
                  </Select>
                </div>
                {canWriteRates && ratePlanId !== "" ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => {
                        const rp = ratePlans?.find((r) => r.id === ratePlanId);
                        if (rp === undefined) return;
                        setEditPlanName(rp.name);
                        setEditPlanPolicy(rp.cancellation_policy);
                        setEditPlanError(null);
                        setEditRatePlanDialogOpen(true);
                      }}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Редактировать
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Удалить тарифный план"
                      onClick={() => {
                        setDeleteRatePlanDialogOpen(true);
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Удалить
                    </Button>
                  </>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Все категории номеров для выбранного плана. «—» — цена не задана.
                Наведите на ячейку для остатков. Сегодня выделено рамкой.
                {canWriteRates ? <> Клик по ячейке — правка одной ночи.</> : null}
              </p>
            </div>

            {ratesError && ratesErrorObj !== null ? (
              <p className="text-sm text-destructive" role="alert">
                {formatApiError(ratesErrorObj)}
              </p>
            ) : null}

            {availabilityError && availabilityErrorObj !== null ? (
              <p className="text-sm text-amber-700 dark:text-amber-400" role="status">
                Не удалось загрузить остатки номеров:{" "}
                {formatApiError(availabilityErrorObj)}
              </p>
            ) : null}

            {allRatesStillPending ? (
              <div
                className="min-h-28 animate-pulse rounded-md bg-muted"
                style={{
                  minHeight: `${Math.max(4, (roomTypes?.length ?? 1) * 2.25) + 2}rem`,
                }}
                aria-hidden
              />
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      <th
                        scope="col"
                        className="sticky left-0 z-20 min-w-[8.5rem] border-b border-r bg-muted/40 px-2 py-2 text-left text-xs font-semibold tracking-tight text-muted-foreground"
                      >
                        Категория
                      </th>
                      {month.days.map((d) => {
                        const weekday = d.date.toLocaleDateString("ru-RU", {
                          weekday: "short",
                        });
                        return (
                          <th
                            key={d.iso}
                            className={cn(
                              "min-w-[3.25rem] border-b bg-muted/40 px-0.5 py-2 text-center text-sm font-medium leading-tight text-foreground md:text-base",
                              d.iso === todayIso &&
                                "bg-primary/10 ring-2 ring-inset ring-primary/40"
                            )}
                          >
                            <div className="text-[11px] text-muted-foreground md:text-xs">
                              {weekday}
                            </div>
                            <div className="tabular-nums">{d.date.getDate()}</div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {roomTypes?.map((rt) => {
                      const row = matrixRows.find((r) => r.roomTypeId === rt.id);
                      const priceByDate = new Map<string, string>();
                      if (row?.data !== undefined) {
                        for (const rate of row.data) {
                          priceByDate.set(rate.date, rate.price);
                        }
                      }
                      const rowPending = row?.isPending ?? true;
                      const cellEditable =
                        canWriteRates &&
                        selectedPropertyId !== null &&
                        ratePlanId !== "" &&
                        !rowPending;
                      return (
                        <tr key={rt.id}>
                          <th
                            scope="row"
                            className="sticky left-0 z-10 border-b border-r bg-card px-2 py-2 text-left font-medium text-foreground"
                          >
                            {rt.name}
                          </th>
                          {month.days.map((d) => {
                            const p = priceByDate.get(d.iso);
                            const availKey = `${d.iso}_${rt.id}`;
                            const availCell = availabilityByKey.get(availKey);
                            function openCellEditor(): void {
                              if (!cellEditable) return;
                              setCellEdit({
                                roomTypeId: rt.id,
                                roomTypeName: rt.name,
                                dateIso: d.iso,
                                dateLabel: d.date.toLocaleDateString("ru-RU", {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                }),
                                priceDraft: p ?? "",
                              });
                            }
                            const priceMissing = !rowPending && p === undefined;
                            const occTitle = occupancyTitle(
                              availCell,
                              availabilityPending,
                              availabilityError
                            );
                            return (
                              <td
                                key={d.iso}
                                role={cellEditable ? "button" : undefined}
                                tabIndex={cellEditable ? 0 : undefined}
                                title={
                                  [
                                    priceMissing ? "Цена не задана" : null,
                                    occTitle ?? null,
                                  ]
                                    .filter(Boolean)
                                    .join(" · ") || undefined
                                }
                                className={cn(
                                  "border-b border-border/80 px-0.5 py-1.5 align-top text-center tabular-nums text-foreground",
                                  rowPending && "animate-pulse bg-muted/30",
                                  d.iso === todayIso &&
                                    "bg-primary/5 ring-1 ring-inset ring-primary/25",
                                  cellEditable &&
                                    "cursor-pointer hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                )}
                                onClick={openCellEditor}
                                onKeyDown={(ev) => {
                                  if (!cellEditable) return;
                                  if (ev.key === "Enter" || ev.key === " ") {
                                    ev.preventDefault();
                                    openCellEditor();
                                  }
                                }}
                              >
                                <div className="flex min-h-[2.25rem] flex-col items-center justify-center leading-tight">
                                  <span
                                    className={cn(
                                      "text-sm font-semibold md:text-base",
                                      priceMissing && "text-muted-foreground"
                                    )}
                                  >
                                    {rowPending
                                      ? "…"
                                      : p !== undefined
                                        ? p
                                        : "—"}
                                  </span>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {canWriteRates ? (
              <form
                className="max-w-xl space-y-3 rounded-md border border-dashed bg-muted/20 p-3"
                onSubmit={(e) => void handleBulkApply(e)}
              >
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Массовая цена за период (owner / manager)
                </p>
                {bulkError !== null ? (
                  <p className="text-sm text-destructive" role="alert">
                    {bulkError}
                  </p>
                ) : null}
                {bulkMessage !== null ? (
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                    {bulkMessage}
                  </p>
                ) : null}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                    <span className="text-xs font-medium">Категория</span>
                    <Select
                      value={bulkRoomTypeId}
                      onValueChange={(v) => {
                        setBulkRoomTypeId(v);
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Тип номера" />
                      </SelectTrigger>
                      <SelectContent>
                        {roomTypes?.map((rt) => (
                          <SelectItem key={rt.id} value={rt.id}>
                            {rt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="bulk-start" className="text-xs font-medium">
                      С
                    </label>
                    <Input
                      id="bulk-start"
                      type="date"
                      value={bulkStart}
                      onChange={(e) => {
                        setBulkStart(e.target.value);
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="bulk-end" className="text-xs font-medium">
                      По
                    </label>
                    <Input
                      id="bulk-end"
                      type="date"
                      value={bulkEnd}
                      onChange={(e) => {
                        setBulkEnd(e.target.value);
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="bulk-price" className="text-xs font-medium">
                      Цена за ночь
                    </label>
                    <Input
                      id="bulk-price"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={bulkPrice}
                      onChange={(e) => {
                        setBulkPrice(e.target.value);
                      }}
                    />
                  </div>
                </div>
                <Button type="submit" disabled={bulkMutation.isPending}>
                  {bulkMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Сохраняем…
                    </>
                  ) : (
                    "Применить к диапазону"
                  )}
                </Button>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">
                Изменение цен доступно ролям owner и manager.
              </p>
            )}
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
            <DialogTitle>Цена за ночь</DialogTitle>
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
                Цена
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
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setCellEdit(null)}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={bulkMutation.isPending}>
                {bulkMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Сохранение…
                  </>
                ) : (
                  "Сохранить"
                )}
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
            <DialogTitle>Редактировать тарифный план</DialogTitle>
            <DialogDescription>
              Измените название и политику отмены тарифного плана.
            </DialogDescription>
            <ApiRouteHint>
              <code className="rounded bg-muted px-1 font-mono text-[10px]">
                PATCH /rate-plans/{"{"}id{"}"}
              </code>
            </ApiRouteHint>
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
                setEditPlanError("Заполните название и политику отмены.");
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
                Название
              </label>
              <Input
                id="edit-rp-name"
                value={editPlanName}
                onChange={(ev) => setEditPlanName(ev.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="edit-rp-policy" className="text-sm font-medium">
                Политика отмены
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
                Отмена
              </Button>
              <Button type="submit" disabled={patchRatePlanMutation.isPending}>
                {patchRatePlanMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Сохраняем…
                  </>
                ) : (
                  "Сохранить"
                )}
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
            <DialogTitle>Удалить тарифный план?</DialogTitle>
            <DialogDescription>
              План «{selectedRatePlanName !== "" ? selectedRatePlanName : ratePlanId.slice(0, 8)}»
              и связанные с ним цены на сервере будут удалены. Это действие нельзя
              отменить.
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
              Отмена
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
                    toastSuccess("Тарифный план удалён");
                  } catch (err) {
                    deleteRatePlanMutation.reset();
                    toastError(formatApiError(err));
                  }
                })();
              }}
            >
              {deleteRatePlanMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Удаляем…
                </>
              ) : (
                "Удалить"
              )}
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
            <DialogTitle>Новый тарифный план</DialogTitle>
            <DialogDescription>
              План появится в списке и сразу будет выбран для сетки цен.
            </DialogDescription>
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
                Название
              </label>
              <Input
                id="rate-plan-name-dialog"
                value={newPlanName}
                onChange={(ev) => {
                  setNewPlanName(ev.target.value);
                }}
                placeholder="Например, BAR или низкий сезон"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="rate-plan-policy-dialog"
                className="text-sm font-medium"
              >
                Политика отмены
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
                Отмена
              </Button>
              <Button type="submit" disabled={createRatePlanMutation.isPending}>
                {createRatePlanMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Создаём…
                  </>
                ) : (
                  "Создать"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
