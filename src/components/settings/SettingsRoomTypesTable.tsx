import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useDeleteRoomType } from "@/hooks/useDeleteRoomType";
import { usePatchRoomType } from "@/hooks/usePatchRoomType";
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
        Не удалось загрузить типы номеров.
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
        Пока нет категорий. Добавьте первую формой выше.
      </p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-3 py-2 font-medium">Название</th>
              <th className="px-3 py-2 font-medium">База / Макс.</th>
              <th className="px-3 py-2 font-medium">id</th>
              <th className="px-3 py-2 font-medium text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {(roomTypes ?? []).map((rt) => (
              <tr key={rt.id} className="border-b border-border/80">
                <td className="px-3 py-2">{rt.name}</td>
                <td className="px-3 py-2">
                  {rt.base_occupancy} / {rt.max_occupancy}
                </td>
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                  {rt.id}
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
                      Изменить
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
                      Удалить
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
            <DialogTitle>Редактировать тип номера</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={(e) => void submitEdit(e)}>
            <div className="space-y-2">
              <label htmlFor="rt-edit-name" className="text-sm font-medium">
                Название
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
                  База
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
                  Макс.
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
              <Button type="button" variant="outline" onClick={() => setEditRow(null)}>
                Отмена
              </Button>
              <Button type="submit" disabled={patchMut.isPending}>
                Сохранить
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
            <DialogTitle>Удалить тип номера?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Категория «{deleteRow?.name ?? ""}» будет помечена удалённой на сервере.
          </p>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setDeleteRow(null)}>
              Отмена
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
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
