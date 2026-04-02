import { FormEvent, useMemo, useState } from "react";
import axios from "axios";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";

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
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { useCanManageProperties } from "@/hooks/useAuthz";
import {
  useCreateRoom,
  useDeleteRoom,
  usePatchRoom,
} from "@/hooks/useRoomMutations";
import { useRoomTypes } from "@/hooks/useRoomTypes";
import { useRooms } from "@/hooks/useRooms";
import {
  housekeepingPriorityLabel,
  housekeepingStatusLabel,
} from "@/lib/i18n/domainLabels";
import { usePropertyStore } from "@/stores/property-store";
import type { RoomCreate, RoomRow } from "@/types/api";
import { cn } from "@/lib/utils";

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
    if (err.response.status === 403) {
      return "Недостаточно прав: создание номеров доступно ролям owner и manager.";
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

  const [createOpen, setCreateOpen] = useState(false);
  const [roomTypeId, setRoomTypeId] = useState<string>("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<string>(ROOM_STATUS_PRESETS[0].value);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [nameDialogRoom, setNameDialogRoom] = useState<RoomRow | null>(null);
  const [nameEdit, setNameEdit] = useState("");
  const [deleteRoomRow, setDeleteRoomRow] = useState<RoomRow | null>(null);

  const roomList = useMemo(() => rooms ?? [], [rooms]);

  const typeNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of roomTypes ?? []) {
      m.set(t.id, t.name);
    }
    return m;
  }, [roomTypes]);

  const duplicateNameKeys = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of roomList) {
      const key = r.name.trim().toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const dup = new Set<string>();
    for (const [k, n] of counts) {
      if (n > 1) {
        dup.add(k);
      }
    }
    return dup;
  }, [roomList]);

  const showHousekeepingCols = useMemo(
    () =>
      roomList.some(
        (r) =>
          (r.housekeeping_status ?? "").trim() !== "" ||
          (r.housekeeping_priority ?? "").trim() !== ""
      ),
    [roomList]
  );

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

  function resetCreateForm(): void {
    setFormError(null);
    setFormSuccess(null);
    setName("");
    setStatus(ROOM_STATUS_PRESETS[0].value);
    if (hasRoomTypes && roomTypes !== undefined && roomTypes[0] !== undefined) {
      setRoomTypeId(roomTypes[0].id);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Номера</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Физические комнаты выбранного отеля и их категория.
          </p>
          <ApiRouteHint className="mt-1">
            <span className="font-mono text-[10px]">GET/POST/PATCH/DELETE /rooms</span>
          </ApiRouteHint>
        </div>
        {canManage && hasRoomTypes ? (
          <Button
            type="button"
            onClick={() => {
              resetCreateForm();
              if (roomTypes?.[0] !== undefined) {
                setRoomTypeId(roomTypes[0].id);
              }
              setCreateOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Добавить номер
          </Button>
        ) : null}
      </div>

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
        ) : null
      ) : (
        <p className="text-sm text-muted-foreground">
          Создание номеров доступно ролям owner и manager.
        </p>
      )}

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) {
            resetCreateForm();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Новый номер</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateRoom}>
            {formError !== null ? (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}
            {formSuccess !== null ? (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                {formSuccess}
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
                  {roomTypes?.map((rt) => (
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
                onClick={() => setCreateOpen(false)}
              >
                Отмена
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Создаём…
                  </>
                ) : (
                  "Создать номер"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div>
        <h3 className="mb-2 text-sm font-medium text-foreground">Список</h3>
        <ApiRouteHint className="mb-3 text-xs">
          <code className="rounded bg-muted px-1 font-mono text-[10px]">
            PATCH /rooms/{"{"}id{"}"}
          </code>
        </ApiRouteHint>
        {isError ? (
          <p className="text-sm text-destructive">Не удалось загрузить номера.</p>
        ) : isPending ? (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-3 py-2 font-medium">Название</th>
                  <th className="px-3 py-2 font-medium">Статус</th>
                  <th className="px-3 py-2 font-medium">Категория</th>
                </tr>
              </thead>
              <TableSkeleton rows={6} cols={3} />
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-3 py-2 font-medium">Название</th>
                  <th className="px-3 py-2 font-medium">Статус</th>
                  {showHousekeepingCols ? (
                    <>
                      <th className="px-3 py-2 font-medium">Housekeeping</th>
                      <th className="px-3 py-2 font-medium">Приоритет</th>
                    </>
                  ) : null}
                  <th className="px-3 py-2 font-medium">Категория</th>
                  {canManage ? (
                    <th className="px-3 py-2 text-right font-medium">
                      Удалить
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {roomList.map((r) => {
                  const isDup = duplicateNameKeys.has(r.name.trim().toLowerCase());
                  return (
                    <tr
                      key={r.id}
                      className={cn(
                        "border-b border-border/80",
                        isDup && "bg-destructive/5 ring-1 ring-inset ring-destructive/30"
                      )}
                      title={
                        isDup
                          ? "Одинаковое имя номера — проверьте данные"
                          : undefined
                      }
                    >
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{r.name}</span>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-8 shrink-0"
                            onClick={() => {
                              setNameDialogRoom(r);
                              setNameEdit(r.name);
                            }}
                          >
                            Переименовать
                          </Button>
                        </div>
                      </td>
                      <td className="px-3 py-2">
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
                          <SelectTrigger className="h-8 w-[180px]">
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
                      </td>
                      {showHousekeepingCols ? (
                        <>
                          <td className="px-3 py-2 text-muted-foreground">
                            {(r.housekeeping_status ?? "").trim() === ""
                              ? "—"
                              : housekeepingStatusLabel(r.housekeeping_status)}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {(r.housekeeping_priority ?? "").trim() === ""
                              ? "—"
                              : housekeepingPriorityLabel(
                                  r.housekeeping_priority
                                )}
                          </td>
                        </>
                      ) : null}
                      <td className="px-3 py-2">
                        {typeNameById.get(r.room_type_id) ?? "—"}
                      </td>
                      {canManage ? (
                        <td className="px-3 py-2 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-9 text-destructive hover:bg-destructive/10"
                            aria-label="Удалить номер"
                            onClick={() => {
                              setDeleteRoomRow(r);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
            Номер «{deleteRoomRow?.name ?? ""}» будет помечен удалённым.
          </p>
          <ApiRouteHint>
            <code className="rounded bg-muted px-1 font-mono text-[10px]">
              DELETE /rooms/{"{"}id{"}"}
            </code>
          </ApiRouteHint>
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
              {deleteRoomMut.isPending ? (
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
                  { onSuccess: () => setNameDialogRoom(null) }
                );
              }}
            >
              {patchRoomMut.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Сохраняем…
                </>
              ) : (
                "Сохранить"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
