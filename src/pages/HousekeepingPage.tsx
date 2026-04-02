import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useMemo, useState } from "react";

import { Inbox } from "lucide-react";

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
import { useHousekeepingQueries } from "@/hooks/useHousekeepingQueries";
import { useBookings } from "@/hooks/useBookings";
import { usePatchHousekeepingRoom } from "@/hooks/usePatchHousekeepingRoom";
import { useRoomTypes } from "@/hooks/useRoomTypes";
import { useRooms } from "@/hooks/useRooms";
import { formatApiError } from "@/lib/formatApiError";
import { housekeepingStatusLabel } from "@/lib/i18n/domainLabels";
import { cn } from "@/lib/utils";
import {
  HOUSEKEEPING_COLUMN_STATUSES,
  type HousekeepingRoomCard,
  type HousekeepingStatus,
} from "@/types/housekeeping";
import { formatIsoDateLocal } from "@/utils/boardDates";

function colDroppableId(status: HousekeepingStatus): string {
  return `hk-col-${status}`;
}

function parseColId(id: string | undefined | null): HousekeepingStatus | null {
  if (id === undefined || id === null || !id.startsWith("hk-col-")) {
    return null;
  }
  const s = id.slice("hk-col-".length) as HousekeepingStatus;
  return HOUSEKEEPING_COLUMN_STATUSES.includes(s) ? s : null;
}

interface DragCardData {
  type: "hk-room";
  card: HousekeepingRoomCard;
  fromStatus: HousekeepingStatus;
}

function HousekeepingDraggableCard({
  card,
  fromStatus,
  disabled,
  onSelect,
  subtitle,
  showArrivalBadge,
}: {
  card: HousekeepingRoomCard;
  fromStatus: HousekeepingStatus;
  disabled: boolean;
  onSelect: () => void;
  subtitle?: string;
  showArrivalBadge?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: card.id,
      disabled,
      data: {
        type: "hk-room",
        card,
        fromStatus,
      } satisfies DragCardData,
    });

  const style = transform
    ? {
        transform: `translate3d(${String(transform.x)}px, ${String(transform.y)}px, 0)`,
        zIndex: 10,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "cursor-grab rounded-md border border-border/80 bg-muted/30 px-2 py-1.5 text-left text-sm active:cursor-grabbing",
        isDragging && "opacity-60"
      )}
      {...listeners}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-medium">{card.label}</span>
        {showArrivalBadge === true ? (
          <span className="rounded bg-amber-500/20 px-1.5 py-0 text-[10px] font-medium text-amber-950 dark:text-amber-100">
            Заезд
          </span>
        ) : null}
      </div>
      {subtitle !== undefined && subtitle !== "" ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      ) : null}
      {card.notes !== undefined &&
      card.notes !== null &&
      card.notes !== "" ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{card.notes}</p>
      ) : null}
    </div>
  );
}

function HousekeepingColumn({
  status,
  title,
  cards,
  onCardSelect,
  dragDisabled,
  cardExtras,
}: {
  status: HousekeepingStatus;
  title: string;
  cards: HousekeepingRoomCard[];
  onCardSelect: (card: HousekeepingRoomCard, from: HousekeepingStatus) => void;
  dragDisabled: boolean;
  cardExtras?: (card: HousekeepingRoomCard) => {
    subtitle?: string;
    showArrivalBadge?: boolean;
  };
}) {
  const { setNodeRef, isOver } = useDroppable({ id: colDroppableId(status) });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "w-[min(85vw,280px)] shrink-0 rounded-md border border-border bg-card p-3 md:w-auto md:shrink",
        isOver && "ring-2 ring-primary/40"
      )}
    >
      <h3 className="text-sm font-semibold text-foreground">
        {title}
        <span className="ml-1.5 font-normal text-muted-foreground">
          ({cards.length})
        </span>
      </h3>
      <ul className="mt-3 space-y-2">
        {cards.length === 0 ? (
          <li className="flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border/80 py-4 text-center text-xs text-muted-foreground">
            <Inbox className="h-6 w-6 opacity-60" aria-hidden />
            <span>Пока пусто</span>
            <span>Перетащите карточку сюда</span>
          </li>
        ) : (
          cards.map((c) => (
            <li key={c.id}>
              <HousekeepingDraggableCard
                card={c}
                fromStatus={status}
                disabled={dragDisabled}
                subtitle={cardExtras?.(c)?.subtitle}
                showArrivalBadge={cardExtras?.(c)?.showArrivalBadge}
                onSelect={() => {
                  onCardSelect(c, status);
                }}
              />
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export function HousekeepingPage() {
  const [dateInput, setDateInput] = useState(() =>
    formatIsoDateLocal(new Date())
  );
  const dateIso = useMemo(() => dateInput.trim(), [dateInput]);

  const { data: rooms } = useRooms();
  const { data: roomTypes } = useRoomTypes();
  const { data: dayBookings } = useBookings(dateIso, dateIso);

  const { queries, isPending, isError, propertyId } =
    useHousekeepingQueries(dateIso);
  const patchMutation = usePatchHousekeepingRoom();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const [statusDialog, setStatusDialog] = useState<{
    card: HousekeepingRoomCard;
    from: HousekeepingStatus;
  } | null>(null);
  const [pickStatus, setPickStatus] = useState<HousekeepingStatus>("clean");
  const [dialogError, setDialogError] = useState<string | null>(null);

  const byStatus = useMemo(() => {
    const m = new Map<HousekeepingStatus, HousekeepingRoomCard[]>();
    HOUSEKEEPING_COLUMN_STATUSES.forEach((st, i) => {
      m.set(st, queries[i]?.data?.items ?? []);
    });
    return m;
  }, [queries]);

  const roomTypeNameByRoomId = useMemo(() => {
    const m = new Map<string, string>();
    const rlist = rooms ?? [];
    const tmap = new Map((roomTypes ?? []).map((t) => [t.id, t.name]));
    for (const r of rlist) {
      m.set(r.id, tmap.get(r.room_type_id) ?? "");
    }
    return m;
  }, [rooms, roomTypes]);

  const guestByRoomId = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of dayBookings ?? []) {
      if (b.room_id === null) {
        continue;
      }
      const who = `${b.guest.last_name} ${b.guest.first_name}`.trim();
      m.set(b.room_id, who);
    }
    return m;
  }, [dayBookings]);

  const cardExtras = useMemo(() => {
    return (card: HousekeepingRoomCard) => {
      const typeName = roomTypeNameByRoomId.get(card.room_id) ?? "";
      const guest = guestByRoomId.get(card.room_id);
      const subtitleParts = [typeName, guest].filter(
        (x) => x !== undefined && x !== ""
      );
      const arrival =
        (dayBookings ?? []).some(
          (b) =>
            b.room_id === card.room_id && b.check_in_date === dateIso
        ) ?? false;
      return {
        subtitle: subtitleParts.join(" · "),
        showArrivalBadge: arrival,
      };
    };
  }, [roomTypeNameByRoomId, guestByRoomId, dayBookings, dateIso]);

  function moveCard(
    card: HousekeepingRoomCard,
    from: HousekeepingStatus,
    to: HousekeepingStatus,
    onSuccess?: () => void
  ): void {
    if (from === to || propertyId === null) {
      onSuccess?.();
      return;
    }
    patchMutation.mutate(
      {
        roomId: card.room_id,
        cardId: card.id,
        fromStatus: from,
        toStatus: to,
        dateIso,
        card,
      },
      {
        onSuccess: () => {
          onSuccess?.();
        },
        onError: (err) => {
          setDialogError(formatApiError(err));
        },
      }
    );
  }

  function onDragEnd(e: DragEndEvent): void {
    const data = e.active.data.current as DragCardData | undefined;
    const to = parseColId(String(e.over?.id ?? ""));
    if (data?.type !== "hk-room" || to === null || propertyId === null) {
      return;
    }
    moveCard(data.card, data.fromStatus, to);
  }

  const dragDisabled = patchMutation.isPending || propertyId === null;

  function openStatusDialog(card: HousekeepingRoomCard, from: HousekeepingStatus): void {
    setDialogError(null);
    const next =
      HOUSEKEEPING_COLUMN_STATUSES.find((s) => s !== from) ?? "clean";
    setPickStatus(next);
    setStatusDialog({ card, from });
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Housekeeping</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Канбан по статусу уборки. Перетащите карточку между колонками или
          нажмите для смены статуса.
        </p>
        <ApiRouteHint className="mt-1 text-sm">
          <span className="font-mono text-[10px]">GET/PATCH /housekeeping…</span>
        </ApiRouteHint>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label htmlFor="hk-date" className="text-sm font-medium">
            Дата (опционально)
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

      {patchMutation.isError && statusDialog === null ? (
        <p className="text-sm text-destructive" role="alert">
          {formatApiError(patchMutation.error)}
        </p>
      ) : null}

      {isError ? (
        <p className="text-sm text-destructive" role="alert">
          Не удалось загрузить housekeeping.
        </p>
      ) : isPending ? (
        <div
          className="h-40 max-w-4xl animate-pulse rounded-md bg-muted"
          aria-hidden
        />
      ) : (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:overflow-visible">
            {HOUSEKEEPING_COLUMN_STATUSES.map((col) => (
              <HousekeepingColumn
                key={col}
                status={col}
                title={housekeepingStatusLabel(col)}
                cards={byStatus.get(col) ?? []}
                dragDisabled={dragDisabled}
                cardExtras={cardExtras}
                onCardSelect={(c, from) => {
                  openStatusDialog(c, from);
                }}
              />
            ))}
          </div>
        </DndContext>
      )}

      <Dialog
        open={statusDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setStatusDialog(null);
            setDialogError(null);
            patchMutation.reset();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Статус номера</DialogTitle>
          </DialogHeader>
          {statusDialog !== null ? (
            <div className="space-y-3 py-2">
              <p className="text-sm text-muted-foreground">
                {statusDialog.card.label}
              </p>
              <Select
                value={pickStatus}
                onValueChange={(v) => {
                  setPickStatus(v as HousekeepingStatus);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HOUSEKEEPING_COLUMN_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {housekeepingStatusLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {dialogError !== null ? (
                <p className="text-sm text-destructive">{dialogError}</p>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStatusDialog(null);
                setDialogError(null);
              }}
            >
              Отмена
            </Button>
            <Button
              type="button"
              disabled={patchMutation.isPending || statusDialog === null}
              onClick={() => {
                if (statusDialog === null) return;
                setDialogError(null);
                moveCard(
                  statusDialog.card,
                  statusDialog.from,
                  pickStatus,
                  () => {
                    setStatusDialog(null);
                  }
                );
              }}
            >
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
