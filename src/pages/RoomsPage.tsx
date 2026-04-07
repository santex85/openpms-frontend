import { useVirtualizer } from "@tanstack/react-virtual";
import { FormEvent, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Loader2, Trash2 } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import i18n from "@/i18n";
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
import { isAxiosForbidden } from "@/lib/forbiddenError";
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
  roomTypeDisplayName,
  roomStatusLabel,
} from "@/lib/i18n/domainLabels";
import { duplicateRoomNameKeys } from "@/lib/roomDuplicateNames";
import { cn } from "@/lib/utils";
import { PageTableSkeleton } from "@/components/ui/page-table-skeleton";
import { usePropertyStore } from "@/stores/property-store";
import type { RoomCreate, RoomRow } from "@/types/api";

const ROOM_STATUS_VALUES = [
  "available",
  "maintenance",
  "out_of_order",
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
      return i18n.t("rooms.forbidden403");
    }
  }
  return i18n.t("rooms.err.create");
}

export function RoomsPage() {
  const { t } = useTranslation();
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
  const [status, setStatus] = useState<string>(ROOM_STATUS_VALUES[0]);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [nameDialogRoom, setNameDialogRoom] = useState<RoomRow | null>(null);
  const [nameEdit, setNameEdit] = useState("");
  const [deleteRoomRow, setDeleteRoomRow] = useState<RoomRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const roomTypeNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const rt of roomTypes ?? []) {
      m.set(rt.id, roomTypeDisplayName(rt.name));
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
      <p className="text-sm text-muted-foreground">{t("property.pick")}</p>
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
      setFormError(t("rooms.err.selectType"));
      return;
    }
    const trimmedName = name.trim();
    if (trimmedName === "") {
      setFormError(t("rooms.err.enterName"));
      return;
    }

    const body: RoomCreate = {
      room_type_id: roomTypeId,
      name: trimmedName,
      status,
    };

    try {
      await createMutation.mutateAsync(body);
      setFormSuccess(t("rooms.successCreated"));
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
      parts.push(
        t("rooms.hk.priorityInCell", {
          label: housekeepingPriorityLabel(p),
        })
      );
    }
    return parts.join(" · ");
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          {t("nav.rooms")}
        </h2>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{t("rooms.hint")}</span>
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
          <p className="text-sm text-destructive">{t("rooms.err.loadTypes")}</p>
        ) : typesPending ? (
          <div className="h-24 animate-pulse rounded-md bg-muted" aria-hidden />
        ) : !hasRoomTypes ? (
          <p className="text-sm text-muted-foreground">
            <Trans
              i18nKey="rooms.needRoomTypeRich"
              components={{
                settingsLink: (
                  <Link
                    to="/settings#room-types-hint"
                    className="text-primary underline underline-offset-2"
                  />
                ),
              }}
            />
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
            {t("rooms.addRoom")}
          </Button>
        )
      ) : (
        <p className="text-sm text-muted-foreground">
          {t("rooms.manageRolesHint")}
        </p>
      )}

      <div>
        <h3 className="mb-2 text-sm font-medium text-foreground">
          {t("rooms.listTitle")}
        </h3>
        <p className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>{t("rooms.listHint")}</span>
          <ApiRouteHint>PATCH /rooms/{"{"}id{"}"}</ApiRouteHint>
        </p>
        {isError ? (
          <p className="text-sm text-destructive">
            {t("rooms.err.loadRooms")}
          </p>
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
                <div className="px-3 py-2 font-medium">{t("rooms.colName")}</div>
                <div className="px-3 py-2 font-medium">{t("rooms.colStatus")}</div>
                {hkActive ? (
                  <div className="px-3 py-2 font-medium">
                    {t("rooms.colHousekeeping")}
                  </div>
                ) : null}
                <div className="px-3 py-2 font-medium">
                  {t("rooms.colCategory")}
                </div>
                {canManage ? (
                  <div
                    className="flex justify-end px-3 py-2 text-right"
                    title={t("rooms.deleteColumnHint")}
                  >
                    <Trash2
                      className="h-4 w-4 shrink-0 text-muted-foreground opacity-50"
                      aria-hidden
                    />
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
                            "group absolute left-0 w-full border-b border-border/80",
                            duplicateKeys.has(r.name.trim().toLowerCase()) &&
                              "bg-destructive/5 ring-1 ring-inset ring-destructive/25"
                          )}
                          style={{
                            transform: `translateY(${vi.start}px)`,
                            height: `${vi.size}px`,
                          }}
                          title={
                            duplicateKeys.has(r.name.trim().toLowerCase())
                              ? t("rooms.duplicateNameHint")
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
                                className="h-8 shrink-0 text-xs opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
                                onClick={() => {
                                  setNameDialogRoom(r);
                                  setNameEdit(r.name);
                                }}
                              >
                                {t("rooms.changeName")}
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
                                {ROOM_STATUS_VALUES.map((v) => (
                                  <SelectItem key={v} value={v}>
                                    {roomStatusLabel(v)}
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
                                aria-label={t("rooms.deleteAria")}
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
            <DialogTitle>{t("rooms.dialogNewTitle")}</DialogTitle>
            <DialogDescription>{t("rooms.dialogNewDesc")}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreateRoom}>
            {formError !== null ? (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="space-y-2">
              <span className="text-sm font-medium">{t("rooms.form.type")}</span>
              <Select
                value={roomTypeId !== "" ? roomTypeId : undefined}
                onValueChange={(v) => {
                  setRoomTypeId(v);
                }}
              >
                <SelectTrigger aria-label={t("rooms.form.typeAria")}>
                  <SelectValue placeholder={t("rooms.form.typePh")} />
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
                {t("rooms.form.nameLabel")}
              </label>
              <Input
                id="room-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                }}
                placeholder={t("rooms.form.namePh")}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium">{t("rooms.form.status")}</span>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger aria-label={t("rooms.form.statusAria")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROOM_STATUS_VALUES.map((v) => (
                    <SelectItem key={v} value={v}>
                      {roomStatusLabel(v)}
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
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : null}
                {createMutation.isPending
                  ? t("rooms.createCreating")
                  : t("rooms.createRoom")}
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
            <DialogTitle>{t("rooms.deleteTitle")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("rooms.deleteBody", { name: deleteRoomRow?.name ?? "" })}
          </p>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleteRoomRow(null)}>
              {t("common.cancel")}
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
              {t("rooms.deleteConfirm")}
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
            <DialogTitle>{t("rooms.renameTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <label htmlFor="room-rename" className="text-sm font-medium">
              {t("rooms.renameLabel")}
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
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              disabled={patchRoomMut.isPending || nameDialogRoom === null}
              onClick={() => {
                if (nameDialogRoom === null) {
                  return;
                }
                const trimmedRename = nameEdit.trim();
                if (trimmedRename === "") {
                  return;
                }
                patchRoomMut.mutate(
                  { roomId: nameDialogRoom.id, body: { name: trimmedRename } },
                  {
                    onSuccess: () => {
                      setNameDialogRoom(null);
                    },
                  }
                );
              }}
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
