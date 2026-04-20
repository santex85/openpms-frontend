import { FormEvent, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

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
import { useCreateRoomsBulk } from "@/hooks/useRoomMutations";
import { roomStatusLabel } from "@/lib/i18n/domainLabels";
import type { RoomBulkCreateItem } from "@/types/rooms";
import type { RoomType } from "@/types/room-types";

import { formatRoomMutationError } from "./roomFormErrors";

const ROOM_STATUS_VALUES = [
  "available",
  "maintenance",
  "out_of_order",
] as const;

type BulkMode = "range" | "count";

function expandRangeNames(fromStr: string, toStr: string): string[] {
  const a = fromStr.trim();
  const b = toStr.trim();
  const from = Number.parseInt(a, 10);
  const to = Number.parseInt(b, 10);
  if (!Number.isFinite(from) || !Number.isFinite(to)) {
    throw new Error("rangeNaN");
  }
  if (to < from) {
    throw new Error("rangeOrder");
  }
  const width = Math.max(a.length, b.length);
  const out: string[] = [];
  for (let i = from; i <= to; i++) {
    out.push(String(i).padStart(width, "0"));
  }
  if (out.length > 200) {
    throw new Error("rangeTooMany");
  }
  return out;
}

function expandCountNames(
  prefix: string,
  startStr: string,
  countStr: string,
  padStr: string
): string[] {
  const start = Number.parseInt(startStr.trim(), 10);
  const count = Number.parseInt(countStr.trim(), 10);
  const pad = Number.parseInt(padStr.trim(), 10);
  if (!Number.isFinite(start) || !Number.isFinite(count) || !Number.isFinite(pad)) {
    throw new Error("countNaN");
  }
  if (count < 1 || count > 200) {
    throw new Error("countBounds");
  }
  if (pad < 1 || pad > 12) {
    throw new Error("padBounds");
  }
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(`${prefix}${String(start + i).padStart(pad, "0")}`);
  }
  return out;
}

interface BulkCreateRoomsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomTypes: RoomType[];
}

export function BulkCreateRoomsDialog({
  open,
  onOpenChange,
  roomTypes,
}: BulkCreateRoomsDialogProps) {
  const { t } = useTranslation();
  const bulkMut = useCreateRoomsBulk();

  const [roomTypeId, setRoomTypeId] = useState<string>("");
  const [status, setStatus] = useState<string>(ROOM_STATUS_VALUES[0]);
  const [mode, setMode] = useState<BulkMode>("range");
  const [rangeFrom, setRangeFrom] = useState("101");
  const [rangeTo, setRangeTo] = useState("110");
  const [countPrefix, setCountPrefix] = useState("");
  const [countStart, setCountStart] = useState("1");
  const [countNum, setCountNum] = useState("10");
  const [countPad, setCountPad] = useState("3");
  const [onConflict, setOnConflict] = useState<"skip" | "fail">("skip");
  const [formError, setFormError] = useState<string | null>(null);

  const previewNames = useMemo(() => {
    try {
      if (mode === "range") {
        return expandRangeNames(rangeFrom, rangeTo);
      }
      return expandCountNames(countPrefix, countStart, countNum, countPad);
    } catch {
      return [];
    }
  }, [
    mode,
    rangeFrom,
    rangeTo,
    countPrefix,
    countStart,
    countNum,
    countPad,
  ]);

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setFormError(null);
    if (roomTypeId === "") {
      setFormError(t("rooms.err.selectType"));
      return;
    }
    let names: string[] = [];
    try {
      if (mode === "range") {
        names = expandRangeNames(rangeFrom, rangeTo);
      } else {
        names = expandCountNames(countPrefix, countStart, countNum, countPad);
      }
    } catch (err) {
      const code = err instanceof Error ? err.message : "";
      if (code === "rangeOrder") {
        setFormError(t("rooms.bulk.err.rangeOrder"));
        return;
      }
      if (code === "rangeTooMany") {
        setFormError(t("rooms.bulk.err.tooMany"));
        return;
      }
      if (code === "countBounds" || code === "padBounds") {
        setFormError(t("rooms.bulk.err.countBounds"));
        return;
      }
      setFormError(t("rooms.bulk.err.invalidNumbers"));
      return;
    }

    if (names.length === 0) {
      setFormError(t("rooms.bulk.err.empty"));
      return;
    }

    const rooms: RoomBulkCreateItem[] = names.map((name) => ({
      name,
      status,
    }));

    try {
      const res = await bulkMut.mutateAsync({
        room_type_id: roomTypeId,
        rooms,
        on_conflict: onConflict,
      });
      const skipped = res.skipped.length;
      if (skipped > 0) {
        toast.success(
          t("rooms.bulk.successWithSkipped", {
            created: res.created.length,
            skipped,
          })
        );
      } else {
        toast.success(
          t("rooms.bulk.success", { count: res.created.length })
        );
      }
      onOpenChange(false);
    } catch (err) {
      setFormError(formatRoomMutationError(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("rooms.bulk.title")}</DialogTitle>
          <DialogDescription>{t("rooms.bulk.description")}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={(e) => void onSubmit(e)}>
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
              <SelectTrigger>
                <SelectValue placeholder={t("rooms.form.typePh")} />
              </SelectTrigger>
              <SelectContent>
                {roomTypes.map((rt) => (
                  <SelectItem key={rt.id} value={rt.id}>
                    {rt.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <span className="text-sm font-medium">{t("rooms.form.status")}</span>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
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

          <div className="space-y-2">
            <span className="text-sm font-medium">{t("rooms.bulk.modeLabel")}</span>
            <Select
              value={mode}
              onValueChange={(v) => {
                setMode(v as BulkMode);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="range">{t("rooms.bulk.modeRange")}</SelectItem>
                <SelectItem value="count">{t("rooms.bulk.modeCount")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === "range" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="bulk-from" className="text-sm font-medium">
                  {t("rooms.bulk.rangeFrom")}
                </label>
                <Input
                  id="bulk-from"
                  value={rangeFrom}
                  onChange={(e) => {
                    setRangeFrom(e.target.value);
                  }}
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="bulk-to" className="text-sm font-medium">
                  {t("rooms.bulk.rangeTo")}
                </label>
                <Input
                  id="bulk-to"
                  value={rangeTo}
                  onChange={(e) => {
                    setRangeTo(e.target.value);
                  }}
                  inputMode="numeric"
                />
              </div>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="bulk-prefix" className="text-sm font-medium">
                  {t("rooms.bulk.prefix")}
                </label>
                <Input
                  id="bulk-prefix"
                  value={countPrefix}
                  onChange={(e) => {
                    setCountPrefix(e.target.value);
                  }}
                  placeholder="A-"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="bulk-start" className="text-sm font-medium">
                  {t("rooms.bulk.startNum")}
                </label>
                <Input
                  id="bulk-start"
                  value={countStart}
                  onChange={(e) => {
                    setCountStart(e.target.value);
                  }}
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="bulk-num" className="text-sm font-medium">
                  {t("rooms.bulk.count")}
                </label>
                <Input
                  id="bulk-num"
                  value={countNum}
                  onChange={(e) => {
                    setCountNum(e.target.value);
                  }}
                  inputMode="numeric"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="bulk-pad" className="text-sm font-medium">
                  {t("rooms.bulk.padWidth")}
                </label>
                <Input
                  id="bulk-pad"
                  value={countPad}
                  onChange={(e) => {
                    setCountPad(e.target.value);
                  }}
                  inputMode="numeric"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <span className="text-sm font-medium">{t("rooms.bulk.onConflict")}</span>
            <Select
              value={onConflict}
              onValueChange={(v) => {
                setOnConflict(v as "skip" | "fail");
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="skip">{t("rooms.bulk.conflictSkip")}</SelectItem>
                <SelectItem value="fail">{t("rooms.bulk.conflictFail")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">{t("rooms.bulk.preview")}</p>
            <p className="mt-1 break-all">
              {previewNames.length === 0
                ? "—"
                : previewNames.slice(0, 30).join(", ") +
                  (previewNames.length > 30
                    ? ` … (+${previewNames.length - 30})`
                    : "")}
            </p>
            <p className="mt-1 tabular-nums">
              {t("rooms.bulk.previewCount", { n: previewNames.length })}
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false);
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={bulkMut.isPending}>
              {bulkMut.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              {bulkMut.isPending ? t("rooms.bulk.creating") : t("rooms.bulk.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
