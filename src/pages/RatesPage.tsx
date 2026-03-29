import { ChevronLeft, ChevronRight } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBulkUpsertRates } from "@/hooks/useBulkUpsertRates";
import { useCreateRatePlan } from "@/hooks/useCreateRatePlan";
import { useNightlyRates } from "@/hooks/useNightlyRates";
import { useRatePlans } from "@/hooks/useRatePlans";
import { useRoomTypes } from "@/hooks/useRoomTypes";
import { formatApiError } from "@/lib/formatApiError";
import { canManagePropertiesFromToken } from "@/lib/jwtPayload";
import { usePropertyStore } from "@/stores/property-store";
import type { BulkRateSegment, RatePlanCreate } from "@/types/rates";
import { cn } from "@/lib/utils";
import { getMonthRange, shiftMonthAnchor } from "@/utils/boardDates";

const DEFAULT_CANCELLATION_POLICY =
  "Отмена бесплатно не позднее чем за 24 часа до заезда; при более поздней отмене может удерживаться стоимость первой ночи.";

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

export function RatesPage() {
  const canWriteRates = canManagePropertiesFromToken();
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());
  const month = useMemo(() => getMonthRange(monthAnchor), [monthAnchor]);

  const { data: roomTypes, isPending: roomTypesPending } = useRoomTypes();
  const { data: ratePlans, isPending: ratePlansPending } = useRatePlans();

  const [roomTypeId, setRoomTypeId] = useState("");
  const [ratePlanId, setRatePlanId] = useState("");

  useEffect(() => {
    if (
      roomTypes !== undefined &&
      roomTypes.length > 0 &&
      !roomTypes.some((r) => r.id === roomTypeId)
    ) {
      setRoomTypeId(roomTypes[0].id);
    }
  }, [roomTypes, roomTypeId]);

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
    data: nightlyRates,
    isPending: ratesPending,
    isError: ratesError,
    error: ratesErrorObj,
  } = useNightlyRates(
    roomTypeId !== "" ? roomTypeId : null,
    ratePlanId !== "" ? ratePlanId : null,
    month.startIso,
    month.endIso
  );

  const priceByDate = useMemo(() => {
    const m = new Map<string, string>();
    if (nightlyRates === undefined) {
      return m;
    }
    for (const row of nightlyRates) {
      m.set(row.date, row.price);
    }
    return m;
  }, [nightlyRates]);

  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkStart, setBulkStart] = useState(month.startIso);
  const [bulkEnd, setBulkEnd] = useState(month.endIso);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const bulkMutation = useBulkUpsertRates();
  const createRatePlanMutation = useCreateRatePlan();

  const [newPlanName, setNewPlanName] = useState("");
  const [newPlanPolicy, setNewPlanPolicy] = useState(
    DEFAULT_CANCELLATION_POLICY
  );
  const [newPlanError, setNewPlanError] = useState<string | null>(null);

  useEffect(() => {
    setBulkStart(month.startIso);
    setBulkEnd(month.endIso);
  }, [month.startIso, month.endIso]);

  async function handleCreateRatePlan(
    e: FormEvent<HTMLFormElement>
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
      await createRatePlanMutation.mutateAsync(body);
      setNewPlanName("");
      setNewPlanPolicy(DEFAULT_CANCELLATION_POLICY);
    } catch (err) {
      setNewPlanError(formatCreateRatePlanError(err));
    }
  }

  async function handleBulkApply(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setBulkMessage(null);
    setBulkError(null);

    if (selectedPropertyId === null || roomTypeId === "" || ratePlanId === "") {
      setBulkError("Выберите отель, тип номера и тарифный план.");
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
      room_type_id: roomTypeId,
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
          Календарная сетка ночных тарифов (
          <code className="rounded bg-muted px-1 font-mono text-xs">
            GET /rates
          </code>
          ,{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            PUT /rates/bulk
          </code>
          ). Остатки по дням см. на{" "}
          <Link
            to="/board"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            доске размещений
          </Link>
          .
        </p>
      </div>

      <section className="rounded-lg border border-border bg-card p-4 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            Сетка за месяц
          </h3>
          <div className="flex items-center gap-2">
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
              Его можно создать здесь или через{" "}
              <code className="rounded bg-muted px-1 font-mono text-xs">
                POST /rate-plans
              </code>{" "}
              в{" "}
              <code className="rounded bg-muted px-1 font-mono text-xs">
                /docs
              </code>
              .
            </p>
            {canWriteRates ? (
              <form
                className="max-w-lg space-y-3 rounded-md border border-dashed bg-muted/20 p-3"
                onSubmit={(e) => void handleCreateRatePlan(e)}
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
                  {createRatePlanMutation.isPending
                    ? "Создаём…"
                    : "Создать тарифный план"}
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
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <span className="text-sm font-medium">Тип номера</span>
                <Select
                  value={roomTypeId}
                  onValueChange={(v) => {
                    setRoomTypeId(v);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Категория" />
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
              <div className="space-y-2">
                <span className="text-sm font-medium">Тарифный план</span>
                <Select
                  value={ratePlanId}
                  onValueChange={(v) => {
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
                  </SelectContent>
                </Select>
              </div>
            </div>

            {ratesError ? (
              <p className="text-sm text-destructive" role="alert">
                {formatApiError(ratesErrorObj)}
              </p>
            ) : ratesPending ? (
              <div
                className="h-28 animate-pulse rounded-md bg-muted"
                aria-hidden
              />
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      {month.days.map((d) => {
                        const weekday = d.date.toLocaleDateString("ru-RU", {
                          weekday: "short",
                        });
                        return (
                          <th
                            key={d.iso}
                            className="min-w-[3rem] border-b bg-muted/40 px-0.5 py-2 text-center font-medium leading-tight text-foreground"
                          >
                            <div className="text-[10px] uppercase text-muted-foreground">
                              {weekday}
                            </div>
                            <div className="tabular-nums">{d.date.getDate()}</div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {month.days.map((d) => {
                        const p = priceByDate.get(d.iso);
                        return (
                          <td
                            key={d.iso}
                            className="border-b border-border/80 px-0.5 py-2 text-center tabular-nums text-foreground"
                          >
                            {p !== undefined ? p : "—"}
                          </td>
                        );
                      })}
                    </tr>
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
                <div className="grid gap-3 sm:grid-cols-3">
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
                  {bulkMutation.isPending ? "Сохраняем…" : "Применить к диапазону"}
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
    </div>
  );
}
