import { FormEvent, useState } from "react";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { FolioChargeCategory } from "@/api/folioCategories";
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
import { useFolioCategories } from "@/hooks/useFolioCategories";
import {
  useCreateFolioCategory,
  useDeleteFolioCategory,
  useUpdateFolioCategory,
} from "@/hooks/useFolioCategoryMutations";
import { formatApiError } from "@/lib/formatApiError";

/** Matches API constraint: `^[a-z][a-z0-9_]{0,31}$` */
const FOLIO_CODE_RE = /^[a-z][a-z0-9_]{0,31}$/;

export function SettingsFolioCategoriesSection() {
  const { t } = useTranslation();
  const { data: rows, isPending, isError } = useFolioCategories();
  const createMut = useCreateFolioCategory();
  const patchMut = useUpdateFolioCategory();
  const deleteMut = useDeleteFolioCategory();

  const [addOpen, setAddOpen] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [newOrder, setNewOrder] = useState("0");
  const [formError, setFormError] = useState<string | null>(null);

  const [editRow, setEditRow] = useState<FolioChargeCategory | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editOrder, setEditOrder] = useState("");
  const [editActive, setEditActive] = useState(true);

  const [deleteRow, setDeleteRow] = useState<FolioChargeCategory | null>(null);

  function openAdd(): void {
    setFormError(null);
    setNewCode("");
    setNewLabel("");
    setNewOrder("0");
    setAddOpen(true);
  }

  async function submitAdd(e: FormEvent): Promise<void> {
    e.preventDefault();
    setFormError(null);
    const code = newCode.trim();
    const label = newLabel.trim();
    if (code === "" || label === "") {
      setFormError(t("settings.folioCategories.errRequired"));
      return;
    }
    if (!FOLIO_CODE_RE.test(code)) {
      setFormError(t("settings.folioCategories.errCodeFormat"));
      return;
    }
    const ord = Number.parseInt(newOrder, 10);
    if (!Number.isFinite(ord)) {
      setFormError(t("settings.folioCategories.errOrder"));
      return;
    }
    try {
      await createMut.mutateAsync({
        code,
        label,
        sort_order: ord,
        is_active: true,
      });
      setAddOpen(false);
    } catch (err) {
      setFormError(formatApiError(err));
    }
  }

  function openEdit(row: FolioChargeCategory): void {
    setEditRow(row);
    setEditLabel(row.label);
    setEditOrder(String(row.sort_order));
    setEditActive(row.is_active);
  }

  async function submitEdit(e: FormEvent): Promise<void> {
    e.preventDefault();
    if (editRow === null) return;
    const label = editLabel.trim();
    if (label === "") return;
    const ord = Number.parseInt(editOrder, 10);
    if (!Number.isFinite(ord)) return;
    await patchMut.mutateAsync({
      code: editRow.code,
      body: { label, sort_order: ord, is_active: editActive },
    });
    setEditRow(null);
  }

  async function confirmDelete(): Promise<void> {
    if (deleteRow === null || deleteRow.is_builtin) return;
    try {
      await deleteMut.mutateAsync(deleteRow.code);
      setDeleteRow(null);
    } catch {
      /* toast could be added */
    }
  }

  const sorted = [...(rows ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order || a.code.localeCompare(b.code)
  );

  return (
    <>
      <section className="space-y-4 rounded-lg border border-border bg-card p-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {t("settings.folioCategories.title")}
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{t("settings.folioCategories.intro")}</span>
            <ApiRouteHint>GET /folio-categories</ApiRouteHint>
          </p>
        </div>

        <Button type="button" onClick={() => void openAdd()}>
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          {t("settings.folioCategories.add")}
        </Button>

        {isError ? (
          <p className="text-sm text-destructive" role="alert">
            {t("settings.folioCategories.loadError")}
          </p>
        ) : null}
        {isPending ? (
          <div className="h-24 animate-pulse rounded-md bg-muted" aria-hidden />
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-3 py-2 font-medium">
                    {t("settings.folioCategories.colCode")}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t("settings.folioCategories.colLabel")}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t("settings.folioCategories.colActive")}
                  </th>
                  <th className="px-3 py-2 font-medium">
                    {t("settings.folioCategories.colOrder")}
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    {t("settings.folioCategories.colActions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => (
                  <tr key={r.id} className="border-b last:border-0">
                    <td className="px-3 py-2 font-mono text-xs">{r.code}</td>
                    <td className="px-3 py-2">{r.label}</td>
                    <td className="px-3 py-2">
                      {r.is_active
                        ? t("settings.folioCategories.yes")
                        : t("settings.folioCategories.no")}
                    </td>
                    <td className="px-3 py-2">{r.sort_order}</td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8"
                        onClick={() => {
                          openEdit(r);
                        }}
                      >
                        <Pencil className="h-4 w-4" aria-hidden />
                      </Button>
                      {r.is_builtin ? null : (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 text-destructive"
                          onClick={() => {
                            setDeleteRow(r);
                          }}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={(e) => void submitAdd(e)}>
            <DialogHeader>
              <DialogTitle>{t("settings.folioCategories.dialogAddTitle")}</DialogTitle>
            </DialogHeader>
            {formError !== null ? (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="grid gap-3 py-2">
              <div className="space-y-1">
                <label htmlFor="fc-code" className="text-sm font-medium">
                  {t("settings.folioCategories.colCode")}
                </label>
                <Input
                  id="fc-code"
                  value={newCode}
                  onChange={(e) => {
                    setNewCode(
                      e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")
                    );
                  }}
                  placeholder="laundry"
                  autoComplete="off"
                  pattern={FOLIO_CODE_RE.source}
                  maxLength={32}
                  inputMode="text"
                  spellCheck={false}
                />
                <p className="text-xs text-muted-foreground">
                  {t("settings.folioCategories.codeHint")}
                </p>
              </div>
              <div className="space-y-1">
                <label htmlFor="fc-label" className="text-sm font-medium">
                  {t("settings.folioCategories.colLabel")}
                </label>
                <Input
                  id="fc-label"
                  value={newLabel}
                  onChange={(e) => {
                    setNewLabel(e.target.value);
                  }}
                  placeholder={t("settings.folioCategories.labelPlaceholder")}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="fc-order" className="text-sm font-medium">
                  {t("settings.folioCategories.colOrder")}
                </label>
                <Input
                  id="fc-order"
                  type="number"
                  value={newOrder}
                  onChange={(e) => {
                    setNewOrder(e.target.value);
                  }}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAddOpen(false);
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={createMut.isPending}>
                {createMut.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : null}
                {t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editRow !== null}
        onOpenChange={(o) => {
          if (!o) setEditRow(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <form onSubmit={(e) => void submitEdit(e)}>
            <DialogHeader>
              <DialogTitle>
                {t("settings.folioCategories.dialogEditTitle")}
              </DialogTitle>
            </DialogHeader>
            {editRow !== null ? (
              <p className="text-xs text-muted-foreground">
                <span className="font-mono">{editRow.code}</span>
                {editRow.is_builtin
                  ? ` — ${t("settings.folioCategories.builtinHint")}`
                  : null}
              </p>
            ) : null}
            <div className="grid gap-3 py-2">
              <div className="space-y-1">
                <label htmlFor="fc-edit-label" className="text-sm font-medium">
                  {t("settings.folioCategories.colLabel")}
                </label>
                <Input
                  id="fc-edit-label"
                  value={editLabel}
                  onChange={(e) => {
                    setEditLabel(e.target.value);
                  }}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="fc-edit-order" className="text-sm font-medium">
                  {t("settings.folioCategories.colOrder")}
                </label>
                <Input
                  id="fc-edit-order"
                  type="number"
                  value={editOrder}
                  onChange={(e) => {
                    setEditOrder(e.target.value);
                  }}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editActive}
                  onChange={(e) => {
                    setEditActive(e.target.checked);
                  }}
                />
                {t("settings.folioCategories.colActive")}
              </label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditRow(null);
                }}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={patchMut.isPending}>
                {t("common.save")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleteRow !== null}
        onOpenChange={(o) => {
          if (!o) setDeleteRow(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("settings.folioCategories.deleteConfirmTitle")}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {t("settings.folioCategories.deleteConfirmDescription")}
            {deleteRow !== null ? (
              <>
                {" "}
                <span className="font-mono font-medium text-foreground">
                  {deleteRow.code}
                </span>
              </>
            ) : null}
          </p>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteRow(null);
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteMut.isPending}
              onClick={() => void confirmDelete()}
            >
              {t("settings.folioCategories.deleteConfirmButton")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
