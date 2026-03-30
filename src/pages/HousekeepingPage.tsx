import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useHousekeeping } from "@/hooks/useHousekeeping";
import { formatIsoDateLocal } from "@/utils/boardDates";
import type { HousekeepingRoomCard, HousekeepingStatus } from "@/types/housekeeping";

const COLUMNS: { id: HousekeepingStatus; title: string }[] = [
  { id: "dirty", title: "Грязный" },
  { id: "cleaning", title: "Убирается" },
  { id: "clean", title: "Чистый" },
  { id: "inspected", title: "Проверен" },
];

export function HousekeepingPage() {
  const [dateInput, setDateInput] = useState(() =>
    formatIsoDateLocal(new Date())
  );
  const dateIso = useMemo(() => dateInput.trim(), [dateInput]);

  const { data, isPending, isError } = useHousekeeping(dateIso);

  const byStatus = useMemo(() => {
    const m = new Map<HousekeepingStatus, HousekeepingRoomCard[]>();
    for (const col of COLUMNS) {
      m.set(col.id, []);
    }
    for (const item of data?.items ?? []) {
      const bucket =
        m.get(item.status) ?? m.get("dirty") ?? ([] as HousekeepingRoomCard[]);
      bucket.push(item);
    }
    return m;
  }, [data?.items]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Housekeeping</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Данные{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            GET /housekeeping?property_id=&amp;date=
          </code>
          . Выберите отель в шапке и дату операционного дня.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor="hk-date" className="text-sm font-medium">
            Дата
          </label>
          <Input
            id="hk-date"
            type="date"
            className="w-auto"
            value={dateIso}
            onChange={(e) => {
              setDateInput(e.target.value);
            }}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            setDateInput(formatIsoDateLocal(new Date()));
          }}
        >
          Сегодня
        </Button>
      </div>

      {isError ? (
        <p className="text-sm text-destructive" role="alert">
          Не удалось загрузить housekeeping. Проверьте, что эндпоинт доступен на
          бэкенде.
        </p>
      ) : isPending ? (
        <div
          className="h-40 max-w-4xl animate-pulse rounded-md bg-muted"
          aria-hidden
        />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:overflow-visible">
          {COLUMNS.map((col) => {
            const cards = byStatus.get(col.id) ?? [];
            return (
              <div
                key={col.id}
                className="w-[min(85vw,280px)] shrink-0 rounded-md border border-border bg-card p-3 md:w-auto md:shrink"
              >
                <h3 className="text-sm font-semibold text-foreground">
                  {col.title}
                  <span className="ml-1.5 font-normal text-muted-foreground">
                    ({cards.length})
                  </span>
                </h3>
                <ul className="mt-3 space-y-2">
                  {cards.length === 0 ? (
                    <li className="text-xs text-muted-foreground">
                      Нет номеров
                    </li>
                  ) : (
                    cards.map((c) => (
                      <li
                        key={c.id}
                        className="rounded-md border border-border/80 bg-muted/30 px-2 py-1.5 text-sm"
                      >
                        <span className="font-medium">{c.label}</span>
                        {c.notes !== undefined &&
                        c.notes !== null &&
                        c.notes !== "" ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {c.notes}
                          </p>
                        ) : null}
                      </li>
                    ))
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
