import { useVirtualizer } from "@tanstack/react-virtual";
import { FormEvent, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Loader2, Trash2 } from "lucide-react";
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
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ForbiddenMessages, isAxiosForbidden } from "@/lib/forbiddenError";
import { useCanManageProperties } from "@/hooks/useAuthz";
import {
  useCreateRoom,
  useDeleteRoom,
  usePatchRoom,
} from "@/hooks/useRoomMutations";
import { useRoomTypes } from "@/hooks/useRoomTypes";
import { useRooms } from "@/hooks/useRooms";
import {
  housekeepingStatusLabel,
  roomStatusLabel,
} from "@/lib/i18n/domainLabels";
import { duplicateRoomNameKeys } from "@/lib/roomDuplicateNames";
import { cn } from "@/lib/utils";
import { PageTableSkeleton } from "@/components/ui/page-table-skeleton";
import { usePropertyStore } from "@/stores/property-store";
import type { RoomCreate, RoomRow } from "@/types/api";

const ROOM_STATUS_PRESETS = [
  { value: "available", label: "Доступен" },
  { value: "maintenance", label: "Обслуживание" },
  { value: "out_of_order", label: "Не продаётся" },
] as const;

function formatRoomMutationError(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data !== undefined) {
    const data = err.response.data as { detail?: unknown };
    if (typeof data.detail === "string") {
      return data.detail;
    }
    if (Array.isArray(data.detail)) {
      const parts = data.detail.map((item) => {
        if (typeof item === "object" && item !== null && "msg" in item) {
          return String((item as { msg: string }).msg);
        }
        return "";
      });
      const joined = parts.filter(Boolean).join("; ");
      if (joined !== "") {
        return joined;
      }
    }
    if (isAxiosForbidden(err)) {
      return ForbiddenMessages.roomCreate;
    }
  }
  return "Не удалось создать номер.";
}

export function RoomsPage() {
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const canManage = useCanManageProperties();
  const { data: rooms, isPending, isError } = useRooms();
  const {
    data: roomTypes,
    isPending: typesPending,
    isError: typesError,
  } = useRoomTypes();
  const createMutation = useCreateRoom();
  const patchRoomMut = usePatchRoom();
  const deleteRoomMut = useDeleteRoom();

  const [roomTypeId, setRoomTypeId] = useState<string>("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<string>(ROOM_STATUS_PRESETS[0].value);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [nameDialogRoom, setNameDialogRoom] = useState<RoomRow | null>(null);
  const [nameEdit, setNameEdit] = useState("");
  const [deleteRoomRow, setDeleteRoomRow] = useState<RoomRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const roomTypeNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const rt of roomTypes ?? []) {
      m.set(rt.id, rt.name);
    }
    return m;
  }, [roomTypes]);

  const roomList = useMemo(() => rooms ?? [], [rooms]);

  const duplicateKeys = useMemo(
    () => duplicateRoomNameKeys(roomList),
    [roomList]
  );

  const roomsScrollRef = useRef<HTMLDivElement>(null);
  const roomsVirtual = useVirtualizer({
    count: roomList.length,
    getScrollElement: () => roomsScrollRef.current,
    estimateSize: () => 56,
    overscan: 12,
  });

  const hkActive = useMemo(
    () =>
      (rooms ?? []).some(
        (r) =>
          r.housekeeping_status.trim() !== "" ||
          r.housekeeping_priority.trim() !== ""
      ),
    [rooms]
  );

  /** Та же сетка для sticky-шапки и absolute virtual-строк (иначе thead и tbody расходятся). */
  const roomsListGrid = useMemo(() => {
    if (hkActive && canManage) {
      return "grid w-full grid-cols-[minmax(10rem,1.35fr)_11rem_minmax(8rem,1fr)_minmax(8rem,1fr)_3.25rem] items-center";
    }
    if (hkActive && !canManage) {
      return "grid w-full grid-cols-[minmax(10rem,1.35fr)_11rem_minmax(8rem,1fr)_minmax(8rem,1fr)] items-center";
    }
    if (!hkActive && canManage) {
      return "grid w-full grid-cols-[minmax(10rem,1.35fr)_11rem_minmax(8rem,1fr)_3.25rem] items-center";
    }
    return "grid w-full grid-cols-[minmax(10rem,1.35fr)_11rem_minmax(8rem,1fr)] items-center";
  }, [hkActive, canManage]);

  if (selectedPropertyId === null) {
    return (
      <p className="text-sm text-muted-foreground">
        Выберите отель в шапке.
      </p>
    );
  }

  const typesReady =
    !typesPending && !typesError && roomTypes !== undefined;
  const hasRoomTypes = typesReady && roomTypes.length > 0;

  async function handleCreateRoom(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (roomTypeId === "") {
      setFormError("Выберите тип номера.");
      return;
    }
    const trimmedName = name.trim();
    if (trimmedName === "") {
      setFormError("Введите название или номер комнаты.");
      return;
    }

    const body: RoomCreate = {
      room_type_id: roomTypeId,
      name: trimmedName,
      status,
    };

    try {
      await createMutation.mutateAsync(body);
      setFormSuccess("Номер создан.");
      setName("");
      setCreateOpen(false);
    } catch (err) {
      setFormError(formatRoomMutationError(err));
    }
  }

  function hkCellText(r: RoomRow): string {
    const s = r.housekeeping_status.trim();
    const p = r.housekeeping_priority.trim();
    if (s === "" && p === "") {
      return "—";
    }
    const parts: string[] = [];
    if (s !== "") {
      parts.push(housekeepingStatusLabel(s));
    }
    if (p !== "") {
      parts.push(`пр. ${p}`);
    }
    return parts.join(" · ");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Номера</h2>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>Физические номера выбранного отеля.</span>
          <ApiRouteHint>GET /rooms</ApiRouteHint>
          <ApiRouteHint>POST /rooms</ApiRouteHint>
        </p>
      </div>

      {formSuccess !== null ? (
        <p className="text-sm text-emerald-600 dark:text-emerald-400">
          {formSuccess}
        </p>
      ) : null}

      {canManage ? (
        typesError ? (
          <p className="text-sm text-destructive">
            Не удалось загрузить типы номеров.
          </p>
        ) : typesPending ? (
          <div className="h-24 animate-pulse rounded-md bg-muted" aria-hidden />
        ) : !hasRoomTypes ? (
          <p className="text-sm text-muted-foreground">
            Сначала добавьте хотя бы один тип номера (категорию).{" "}
            <Link
              to="/settings#room-types-hint"
              className="text-primary underline underline-offset-2"
            >
              Подсказка в настройках
            </Link>
            .
          </p>
        ) : (
          <Button
            type="button"
            onClick={() => {
              setFormError(null);
              setFormSuccess(null);
              setCreateOpen(true);
            }}
          >
            Добавить номер
          </Button>
        )
      ) : (
        <p className="text-sm text-muted-foreground">
          Создание номеров доступно ролям owner и manager.
        </p>
      )}

      <div>
        <h3 className="mb-2 text-sm font-medium text-foreground">Список</h3>
        <p className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Статус и название сохраняются на сервере.</span>
          <ApiRouteHint>PATCH /rooms/{"{"}id{"}"}</ApiRouteHint>
        </p>
        {isError ? (
          <p className="text-sm text-destructive">Не удалось загрузить номера.</p>
        ) : isPending ? (
          <PageTableSkeleton rows={5} cols={6} />
        ) : (
          <div
            ref={roomsScrollRef}
            className="max-h-[min(560px,65vh)] overflow-auto rounded-md border"
          >
            <div className="min-w-[720px] text-left text-sm">
              <div
                className={cn(
                  roomsListGrid,
                  "sticky top-0 z-10 border-b border-border bg-muted/50"
                )}
              >
                <div className="px-3 py-2 font-medium">Название</div>
                <div className="px-3 py-2 font-medium">Статус</div>
                {hkActive ? (
                  <div className="px-3 py-2 font-medium">Уборка</div>
                ) : null}
                <div className="px-3 py-2 font-medium">Категория</div>
                {canManage ? (
                  <div className="px-3 py-2 text-right font-medium">
                    Удалить
                  </div>
                ) : null}
              </div>
              <div
                className="relative"
                style={{
                  height:
                    roomList.length === 0
                      ? undefined
                      : `${roomsVirtual.getTotalSize()}px`,
                }}
              >
                {roomList.length === 0
                  ? null
                  : roomsVirtual.getVirtualItems().map((vi) => {
                      const r = roomList[vi.index];
                      return (
                        <div
                          key={r.id}
                          className={cn(
                            roomsListGrid,
                            "absolute left-0 w-full border-b border-border/80",
                            duplicateKeys.has(r.name.trim().toLowerCase()) &&
                              "bg-destructive/5 ring-1 ring-inset ring-destructive/25"
                          )}
                          style={{
                            transform: `translateY(${vi.start}px)`,
                            height: `${vi.size}px`,
                          }}
                          title={
                            duplicateKeys.has(r.name.trim().toLowerCase())
                              ? "Дублируется имя номера с другой строкой."
                              : undefined
                          }
                        >
                          <div className="min-w-0 px-3 py-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-foreground">
                                {r.name}
                              </span>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 shrink-0 text-xs"
                                onClick={() => {
                                  setNameDialogRoom(r);
                                  setNameEdit(r.name);
                                }}
                              >
                                Изменить
                              </Button>
                            </div>
                          </div>
                          <div className="min-w-0 px-3 py-2">
                            <Select
                              value={r.status}
                              onValueChange={(v) => {
                                patchRoomMut.mutate({
                                  roomId: r.id,
                                  body: { status: v },
                                });
                              }}
                              disabled={patchRoomMut.isPending}
                            >
                              <SelectTrigger className="h-8 w-full max-w-[11rem]">
                                <SelectValue
                                  placeholder={roomStatusLabel(r.status)}
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {ROOM_STATUS_PRESETS.map((s) => (
                                  <SelectItem key={s.value} value={s.value}>
                                    {s.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {hkActive ? (
                            <div className="min-w-0 px-3 py-2 text-muted-foreground">
                              <span className="block break-words">
                                {hkCellText(r)}
                              </span>
                            </div>
                          ) : null}
                          <div className="min-w-0 px-3 py-2 text-foreground">
                            <span className="block truncate">
                              {roomTypeNameById.get(r.room_type_id) ?? "—"}
                            </span>
                          </div>
                          {canManage ? (
                            <div className="flex justify-end px-3 py-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 shrink-0 text-destructive hover:bg-destructive/10"
                                aria-label="Удалить номер"
                                onClick={() => {
                                  setDeleteRoomRow(r);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
              </div>
            </div>
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Новый номер</DialogTitle>
            <DialogDescription>
              Укажите категорию, название и операционный статус.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateRoom}>
            {formError !== null ? (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="space-y-2">
              <span className="text-sm font-medium">Тип номера</span>
              <Select
                value={roomTypeId !== "" ? roomTypeId : undefined}
                onValueChange={(v) => {
                  setRoomTypeId(v);
                }}
              >
                <SelectTrigger aria-label="Тип номера">
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {(roomTypes ?? []).map((rt) => (
                    <SelectItem key={rt.id} value={rt.id}>
                      {rt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="room-name" className="text-sm font-medium">
                Название / № комнаты
              </label>
              <Input
                id="room-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                }}
                placeholder="101"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium">Статус номера</span>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger aria-label="Статус номера">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROOM_STATUS_PRESETS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setCreateOpen(false);
                }}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : null}
                {createMutation.isPending ? "Создаём…" : "Создать номер"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteRoomRow !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteRoomRow(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Удалить номер?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Номер «{deleteRoomRow?.name ?? ""}» будет помечен удалённым (
            <code className="rounded bg-muted px-1 font-mono text-xs">
              DELETE /rooms/{"{"}id{"}"}
            </code>
            ).
          </p>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleteRoomRow(null)}>
              Отмена
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteRoomMut.isPending || deleteRoomRow === null}
              onClick={() => {
                if (deleteRoomRow === null) return;
                deleteRoomMut.mutate(deleteRoomRow.id, {
                  onSuccess: () => setDeleteRoomRow(null),
                });
              }}
            >
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={nameDialogRoom !== null}
        onOpenChange={(open) => {
          if (!open) {
            setNameDialogRoom(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Название номера</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="room-rename" className="text-sm font-medium">
              Название / №
            </label>
            <Input
              id="room-rename"
              value={nameEdit}
              onChange={(e) => {
                setNameEdit(e.target.value);
              }}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setNameDialogRoom(null);
              }}
            >
              Отмена
            </Button>
            <Button
              type="button"
              disabled={patchRoomMut.isPending || nameDialogRoom === null}
              onClick={() => {
                if (nameDialogRoom === null) {
                  return;
                }
                const t = nameEdit.trim();
                if (t === "") {
                  return;
                }
                patchRoomMut.mutate(
                  { roomId: nameDialogRoom.id, body: { name: t } },
                  {
                    onSuccess: () => {
                      setNameDialogRoom(null);
                    },
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
