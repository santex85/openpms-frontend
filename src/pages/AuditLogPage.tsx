import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";

import { ChevronDown } from "lucide-react";

import { ApiRouteHint } from "@/components/dev/ApiRouteHint";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { PageTableSkeleton } from "@/components/ui/page-table-skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  AUDIT_FILTER_ACTIONS,
  AUDIT_FILTER_ENTITY_TYPES,
} from "@/constants/auditLogFilters";
import { AUDIT_LOG_PAGE_SIZE, useAuditLog } from "@/hooks/useAuditLog";
import { useTenantUsers } from "@/hooks/useTenantUsers";
import { formatApiError } from "@/lib/formatApiError";
import {
  auditActionLabel,
  auditEntityLabel,
  tenantRoleLabel,
} from "@/lib/i18n/domainLabels";
import type { AuditLogEntry } from "@/types/audit";
import type { TenantUserRead } from "@/types/tenant-admin";
import { boardLocaleFromI18n } from "@/utils/boardDates";

function formatAuditTs(iso: string, localeTag: string): string {
  try {
    return new Date(iso).toLocaleString(localeTag, {
      dateStyle: "short",
      timeStyle: "medium",
    });
  } catch {
    return iso;
  }
}

const AUDIT_DIGEST_KEYS = ["status", "amount", "room_id"] as const;

function shortJson(v: Record<string, unknown> | null): string {
  if (v === null || Object.keys(v).length === 0) {
    return "—";
  }
  try {
    const s = JSON.stringify(v);
    return s.length > 120 ? `${s.slice(0, 117)}…` : s;
  } catch {
    return "…";
  }
}

function newValuesDigest(
  v: Record<string, unknown> | null,
  t: (key: string, opts?: Record<string, unknown>) => string
): string {
  if (v === null || Object.keys(v).length === 0) {
    return "—";
  }
  const lines: string[] = [];
  for (const k of AUDIT_DIGEST_KEYS) {
    if (Object.prototype.hasOwnProperty.call(v, k)) {
      const raw = v[k];
      let val: string;
      if (raw === undefined || raw === null) {
        val = "—";
      } else if (
        typeof raw === "string" ||
        typeof raw === "number" ||
        typeof raw === "boolean"
      ) {
        val = String(raw);
      } else {
        val = JSON.stringify(raw);
      }
      lines.push(`${t(`audit.field.${k}`)}: ${val}`);
    }
  }
  const used = new Set<string>(AUDIT_DIGEST_KEYS.filter((k) => k in v));
  const remaining = Object.keys(v).filter((x) => !used.has(x));
  if (lines.length === 0) {
    return shortJson(v);
  }
  if (remaining.length > 0) {
    lines.push(t("audit.diffMore", { count: remaining.length }));
  }
  return lines.join(" · ");
}

function prettifyJson(v: Record<string, unknown> | null): string {
  if (v === null) {
    return "";
  }
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function userLabel(
  userMap: Map<string, TenantUserRead>,
  userId: string | null
): string {
  if (userId === null || userId === "") {
    return "—";
  }
  const u = userMap.get(userId);
  if (u !== undefined) {
    const name = u.full_name.trim();
    return name !== "" ? `${name} · ${u.email}` : u.email;
  }
  return userId.length > 14 ? `${userId.slice(0, 8)}…` : userId;
}

function filterRows(
  rows: AuditLogEntry[],
  entityIdQ: string,
  dateFrom: string,
  dateTo: string
): AuditLogEntry[] {
  const idQ = entityIdQ.trim().toLowerCase();
  return rows.filter((r) => {
    if (idQ !== "" && !(r.entity_id ?? "").toLowerCase().includes(idQ)) {
      return false;
    }
    if (dateFrom !== "") {
      const t = new Date(r.created_at).getTime();
      const from = new Date(`${dateFrom}T00:00:00`).getTime();
      if (t < from) return false;
    }
    if (dateTo !== "") {
      const t = new Date(r.created_at).getTime();
      const to = new Date(`${dateTo}T23:59:59`).getTime();
      if (t > to) return false;
    }
    return true;
  });
}

function csvEscape(s: string): string {
  if (s.includes('"') || s.includes(",") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Shared grid for sticky header and virtual rows (absolute + display:table breaks columns). */
const AUDIT_LIST_GRID_COLS =
  "grid w-full grid-cols-[11rem_8rem_7rem_minmax(9rem,14rem)_minmax(10rem,1.2fr)_6rem_minmax(12rem,2fr)]";

interface AuditLogMultiSelectProps {
  id: string;
  label: string;
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
  formatOption: (value: string) => string;
  anyLabel: string;
}

function AuditLogMultiSelect({
  id,
  label,
  options,
  selected,
  onChange,
  formatOption,
  anyLabel,
}: AuditLogMultiSelectProps) {
  const setSel = new Set(selected);
  const summary =
    selected.length === 0 ? anyLabel : `${String(selected.length)}`;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span
        id={`${id}-label`}
        className="text-xs font-medium leading-none text-muted-foreground"
      >
        {label}
      </span>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            id={id}
            aria-labelledby={`${id}-label`}
            className="w-full min-w-0 justify-between font-normal"
          >
            <span className="truncate">{summary}</span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-60" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2" align="start">
          <div className="mb-2 flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                onChange([...options]);
              }}
            >
              All
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                onChange([]);
              }}
            >
              Clear
            </Button>
          </div>
          <div className="max-h-56 space-y-1 overflow-y-auto">
            {options.map((opt) => (
              <label
                key={opt}
                className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted/60"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border border-input"
                  checked={setSel.has(opt)}
                  onChange={() => {
                    const next = new Set(setSel);
                    if (next.has(opt)) {
                      next.delete(opt);
                    } else {
                      next.add(opt);
                    }
                    onChange(Array.from(next).sort());
                  }}
                />
                <span className="min-w-0 flex-1 truncate">
                  {formatOption(opt)}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {opt}
                </span>
              </label>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function AuditLogPage() {
  const { t, i18n } = useTranslation();
  const dateLocale = boardLocaleFromI18n(i18n.language);
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(0);
  const [filterActions, setFilterActions] = useState<string[]>([]);
  const [filterEntityTypes, setFilterEntityTypes] = useState<string[]>([]);
  const [entityIdQ, setEntityIdQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [detailRow, setDetailRow] = useState<AuditLogEntry | null>(null);

  const { data, isPending, isError, error } = useAuditLog(page, {
    action: filterActions,
    entity_type: filterEntityTypes,
  });
  const { data: tenantUsers } = useTenantUsers(true);

  useEffect(() => {
    setPage(0);
  }, [filterActions.join(","), filterEntityTypes.join(",")]);

  useEffect(() => {
    const id = searchParams.get("entity_id");
    if (id !== null && id.trim() !== "") {
      setEntityIdQ(id.trim());
    }
  }, [searchParams]);

  const userMap = useMemo(() => {
    const m = new Map<string, TenantUserRead>();
    for (const u of tenantUsers ?? []) {
      m.set(u.id, u);
    }
    return m;
  }, [tenantUsers]);

  const filtered = useMemo(
    () => filterRows(data?.items ?? [], entityIdQ, dateFrom, dateTo),
    [data?.items, entityIdQ, dateFrom, dateTo]
  );

  const auditScrollRef = useRef<HTMLDivElement>(null);
  const auditVirtual = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => auditScrollRef.current,
    estimateSize: () => 52,
    overscan: 8,
  });

  const exportCsv = useCallback(() => {
    const headers = [
      "created_at",
      "action",
      "entity_type",
      "entity_id",
      "user",
      "ip",
      "new_values_json",
    ];
    const lines = [headers.join(",")];
    for (const r of filtered) {
      const row = [
        r.created_at,
        r.action,
        r.entity_type,
        r.entity_id ?? "",
        userLabel(userMap, r.user_id),
        r.ip_address ?? "",
        r.new_values !== null ? JSON.stringify(r.new_values) : "",
      ];
      lines.push(row.map((c) => csvEscape(String(c))).join(","));
    }
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-page-${String(page + 1)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filtered, userMap, page]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          {t("audit.title")}
        </h2>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{t("audit.filtersHint")}</span>
          <ApiRouteHint>GET /audit-log</ApiRouteHint>
        </p>
      </div>

      <div className="rounded-lg border border-border bg-muted/15 p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <AuditLogMultiSelect
            id="audit-action"
            label={t("audit.filterAction")}
            options={AUDIT_FILTER_ACTIONS}
            selected={filterActions}
            onChange={setFilterActions}
            formatOption={(v) => auditActionLabel(v)}
            anyLabel={t("audit.filterAny")}
          />
          <AuditLogMultiSelect
            id="audit-entity-type"
            label={t("audit.filterEntityType")}
            options={AUDIT_FILTER_ENTITY_TYPES}
            selected={filterEntityTypes}
            onChange={setFilterEntityTypes}
            formatOption={(v) => auditEntityLabel(v)}
            anyLabel={t("audit.filterAny")}
          />
          <div className="flex min-w-0 flex-col gap-1.5">
            <label
              htmlFor="audit-entity-id"
              className="text-xs font-medium leading-none text-muted-foreground"
            >
              {t("audit.entityIdContains")}
            </label>
            <Input
              id="audit-entity-id"
              value={entityIdQ}
              onChange={(e) => {
                setEntityIdQ(e.target.value);
              }}
              placeholder={t("audit.placeholder.entityId")}
              className="w-full min-w-0 font-mono text-xs"
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <label
              htmlFor="audit-from"
              className="text-xs font-medium leading-none text-muted-foreground"
            >
              {t("audit.dateFrom")}
            </label>
            <DatePickerField
              id="audit-from"
              value={dateFrom}
              onChange={setDateFrom}
              className="w-full min-w-0"
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <label
              htmlFor="audit-to"
              className="text-xs font-medium leading-none text-muted-foreground"
            >
              {t("audit.dateTo")}
            </label>
            <DatePickerField
              id="audit-to"
              value={dateTo}
              onChange={setDateTo}
              min={dateFrom.trim() || undefined}
              className="w-full min-w-0"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
          {!isPending && !isError ? (
            <Pagination
              className="w-full shrink-0 rounded-md border border-border bg-background px-3 py-2 sm:w-auto"
              total={data?.total ?? 0}
              limit={AUDIT_LOG_PAGE_SIZE}
              offset={page * AUDIT_LOG_PAGE_SIZE}
              hasMore={data?.hasMore}
              showTotalCount={false}
              onPageChange={(newOffset) => {
                setPage(Math.floor(newOffset / AUDIT_LOG_PAGE_SIZE));
              }}
            />
          ) : null}
          <div className="flex min-w-0 flex-col gap-1 sm:max-w-md sm:text-right">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full sm:ml-auto sm:w-auto"
              disabled={filtered.length === 0}
              onClick={exportCsv}
            >
              {t("audit.exportCsv")}
            </Button>
            <p className="text-[11px] leading-snug text-muted-foreground sm:text-right">
              {t("audit.exportHint")}
            </p>
          </div>
        </div>
      </div>

      {isError ? (
        <p className="text-sm text-destructive" role="alert">
          {formatApiError(error)}
        </p>
      ) : isPending ? (
        <PageTableSkeleton rows={6} cols={7} />
      ) : (
        <div
          ref={auditScrollRef}
          className="max-h-[min(520px,65vh)] overflow-auto rounded-md border"
        >
          <div className="min-w-[960px] text-left text-sm">
            <div
              className={`${AUDIT_LIST_GRID_COLS} sticky top-0 z-10 items-center border-b border-border bg-muted/50`}
            >
              <div className="px-3 py-2 font-medium">{t("audit.colTime")}</div>
              <div className="px-3 py-2 font-medium">{t("audit.colAction")}</div>
              <div className="px-3 py-2 font-medium">{t("audit.colEntity")}</div>
              <div className="px-3 py-2 font-medium">{t("audit.colId")}</div>
              <div className="px-3 py-2 font-medium">{t("audit.colUser")}</div>
              <div className="px-3 py-2 font-medium">{t("audit.colIp")}</div>
              <div className="px-3 py-2 font-medium">
                {t("audit.colNewValues")}
              </div>
            </div>
            <div
              className="relative"
              style={{
                height:
                  filtered.length === 0
                    ? undefined
                    : `${auditVirtual.getTotalSize()}px`,
              }}
            >
              {filtered.length === 0
                ? null
                : auditVirtual.getVirtualItems().map((vi) => {
                    const r = filtered[vi.index];
                    return (
                      <div
                        key={r.id}
                        tabIndex={0}
                        role="button"
                        className={`${AUDIT_LIST_GRID_COLS} absolute left-0 w-full cursor-pointer items-start border-b border-border/80 hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`}
                        style={{
                          transform: `translateY(${vi.start}px)`,
                          height: `${vi.size}px`,
                        }}
                        onClick={() => {
                          setDetailRow(r);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            setDetailRow(r);
                          }
                        }}
                      >
                        <div className="min-w-0 px-3 py-2 tabular-nums text-muted-foreground">
                          {formatAuditTs(r.created_at, dateLocale)}
                        </div>
                        <div className="min-w-0 break-all px-3 py-2 text-xs">
                          {auditActionLabel(r.action)}
                        </div>
                        <div className="min-w-0 px-3 py-2 break-words text-sm">
                          {auditEntityLabel(r.entity_type)}
                        </div>
                        <div className="min-w-0 break-all px-3 py-2 font-mono text-xs text-muted-foreground">
                          {r.entity_id ?? "—"}
                        </div>
                        <div className="min-w-0 px-3 py-2 text-xs text-foreground">
                          <span className="block break-words">
                            {userLabel(userMap, r.user_id)}
                          </span>
                        </div>
                        <div className="min-w-0 px-3 py-2 text-xs text-muted-foreground">
                          {r.ip_address ?? "—"}
                        </div>
                        <div className="min-w-0 px-3 py-2 text-xs text-muted-foreground">
                          <span className="block break-words">
                            {newValuesDigest(r.new_values, t)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
            </div>
          </div>
          {filtered.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              {t("audit.emptyFiltered")}
            </p>
          ) : null}
        </div>
      )}

      <Dialog
        open={detailRow !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDetailRow(null);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("audit.detailTitle")}</DialogTitle>
          </DialogHeader>
          {detailRow !== null ? (
            <div className="grid gap-3 text-sm">
              <div className="grid gap-1 sm:grid-cols-2">
                <div>
                  <span className="text-xs text-muted-foreground">
                    {t("audit.colTime")}
                  </span>
                  <p className="font-mono text-xs">
                    {formatAuditTs(detailRow.created_at, dateLocale)}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">
                    {t("audit.colAction")}
                  </span>
                  <p className="text-sm font-medium">
                    {auditActionLabel(detailRow.action)}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    {detailRow.action}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">
                    {t("audit.detailEntityType")}
                  </span>
                  <p className="text-sm font-medium">
                    {auditEntityLabel(detailRow.entity_type)}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    {detailRow.entity_type}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">
                    {t("audit.detailEntityId")}
                  </span>
                  <p className="break-all font-mono text-xs">
                    {detailRow.entity_id ?? "—"}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-xs text-muted-foreground">
                    {t("audit.colUser")}
                  </span>
                  <p>{userLabel(userMap, detailRow.user_id)}</p>
                  {detailRow.user_id !== null &&
                  userMap.get(detailRow.user_id) !== undefined ? (
                    <p className="text-xs text-muted-foreground">
                      {t("audit.userRole", {
                        role: tenantRoleLabel(
                          userMap.get(detailRow.user_id)!.role
                        ),
                      })}
                    </p>
                  ) : null}
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">
                    {t("audit.colIp")}
                  </span>
                  <p className="font-mono text-xs">
                    {detailRow.ip_address ?? "—"}
                  </p>
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">
                  {t("audit.newValuesJson")}
                </span>
                <p className="mt-1 text-sm text-foreground">
                  {newValuesDigest(detailRow.new_values, t)}
                </p>
                <pre className="mt-2 max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
                  {prettifyJson(detailRow.new_values) !== ""
                    ? prettifyJson(detailRow.new_values)
                    : "—"}
                </pre>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">
                  {t("audit.oldValuesJson")}
                </span>
                <pre className="mt-1 max-h-48 overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
                  {prettifyJson(detailRow.old_values) !== ""
                    ? prettifyJson(detailRow.old_values)
                    : "—"}
                </pre>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDetailRow(null)}>
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
