import { FormEvent, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  useDeleteRoomType,
  usePatchRoomType,
} from "@/hooks/useRoomTypeMutations";
import type { RoomType } from "@/types/api";

interface SettingsRoomTypesTableProps {
  roomTypes: RoomType[] | undefined;
  isPending: boolean;
  isError: boolean;
}

export function SettingsRoomTypesTable({
  roomTypes,
  isPending,
  isError,
}: SettingsRoomTypesTableProps) {
  const { t } = useTranslation();
  const patchMut = usePatchRoomType();
  const deleteMut = useDeleteRoomType();
  const [editRow, setEditRow] = useState<RoomType | null>(null);
  const [editName, setEditName] = useState("");
  const [editBase, setEditBase] = useState("");
  const [editMax, setEditMax] = useState("");
  const [deleteRow, setDeleteRow] = useState<RoomType | null>(null);

  function openEdit(rt: RoomType): void {
    setEditRow(rt);
    setEditName(rt.name);
    setEditBase(String(rt.base_occupancy));
    setEditMax(String(rt.max_occupancy));
  }

  async function submitEdit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (editRow === null) return;
    const base = Number.parseInt(editBase, 10);
    const max = Number.parseInt(editMax, 10);
    if (!Number.isFinite(base) || base < 1) return;
    if (!Number.isFinite(max) || max < 1) return;
    if (max < base) return;
    await patchMut.mutateAsync({
      roomTypeId: editRow.id,
      body: {
        name: editName.trim(),
        base_occupancy: base,
        max_occupancy: max,
      },
    });
    setEditRow(null);
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive">
        {t("settings.roomTypesTable.loadError")}
      </p>
    );
  }
  if (isPending) {
    return (
      <div className="h-24 animate-pulse rounded-md bg-muted" aria-hidden />
    );
  }
  if ((roomTypes ?? []).length === 0) {
    return (
      <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
        {t("settings.roomTypesTable.empty")}
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-3 py-2 font-medium">
                {t("settings.roomTypesTable.colName")}
              </th>
              <th className="px-3 py-2 font-medium">
                {t("settings.roomTypesTable.colBaseMax")}
              </th>
              <th className="px-3 py-2 text-right font-medium">
                {t("settings.roomTypesTable.colActions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {(roomTypes ?? []).map((rt) => (
              <tr key={rt.id} className="border-b border-border/80">
                <td className="px-3 py-2">{rt.name}</td>
                <td className="px-3 py-2">
                  {rt.base_occupancy} / {rt.max_occupancy}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        openEdit(rt);
                      }}
                    >
                      {t("settings.roomTypesTable.edit")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        setDeleteRow(rt);
                      }}
                    >
                      {t("settings.roomTypesTable.delete")}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog
        open={editRow !== null}
        onOpenChange={(open) => {
          if (!open) setEditRow(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("settings.roomTypesTable.editTitle")}</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={(e) => void submitEdit(e)}>
            <div className="space-y-2">
              <label htmlFor="rt-edit-name" className="text-sm font-medium">
                {t("settings.roomTypesTable.name")}
              </label>
              <Input
                id="rt-edit-name"
                value={editName}
                onChange={(e) => {
                  setEditName(e.target.value);
                }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label htmlFor="rt-edit-base" className="text-sm font-medium">
                  {t("settings.roomTypesTable.base")}
                </label>
                <Input
                  id="rt-edit-base"
                  type="number"
                  min={1}
                  value={editBase}
                  onChange={(e) => {
                    setEditBase(e.target.value);
                  }}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="rt-edit-max" className="text-sm font-medium">
                  {t("settings.roomTypesTable.max")}
                </label>
                <Input
                  id="rt-edit-max"
                  type="number"
                  min={1}
                  value={editMax}
                  onChange={(e) => {
                    setEditMax(e.target.value);
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditRow(null)}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={patchMut.isPending}>
                {patchMut.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : null}
                {patchMut.isPending
                  ? t("settings.roomTypesTable.saving")
                  : t("settings.roomTypesTable.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteRow !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteRow(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("settings.roomTypesTable.deleteTitle")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("settings.roomTypesTable.deleteBody", {
              name: deleteRow?.name ?? "",
            })}
          </p>
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteRow(null)}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMut.isPending || deleteRow === null}
              onClick={() => {
                if (deleteRow === null) return;
                deleteMut.mutate(deleteRow.id, {
                  onSuccess: () => setDeleteRow(null),
                });
              }}
            >
              {deleteMut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              {t("settings.roomTypesTable.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
