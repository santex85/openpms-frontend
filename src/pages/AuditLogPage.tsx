import { useVirtualizer } from "@tanstack/react-virtual";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

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
import { Pagination } from "@/components/ui/pagination";
import { PageTableSkeleton } from "@/components/ui/page-table-skeleton";
import { AUDIT_LOG_PAGE_SIZE, useAuditLog } from "@/hooks/useAuditLog";
import { useTenantUsers } from "@/hooks/useTenantUsers";
import { formatApiError } from "@/lib/formatApiError";
import { tenantRoleLabel } from "@/lib/i18n/domainLabels";
import type { AuditLogEntry } from "@/types/audit";
import type { TenantUserRead } from "@/types/tenant-admin";

function formatTs(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      dateStyle: "short",
      timeStyle: "medium",
    });
  } catch {
    return iso;
  }
}

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
  actionQ: string,
  entityQ: string,
  entityIdQ: string,
  dateFrom: string,
  dateTo: string
): AuditLogEntry[] {
  const a = actionQ.trim().toLowerCase();
  const e = entityQ.trim().toLowerCase();
  const idQ = entityIdQ.trim().toLowerCase();
  return rows.filter((r) => {
    if (a !== "" && !r.action.toLowerCase().includes(a)) {
      return false;
    }
    if (e !== "" && !r.entity_type.toLowerCase().includes(e)) {
      return false;
    }
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

export function AuditLogPage() {
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(0);
  const { data, isPending, isError, error } = useAuditLog(page);
  const { data: tenantUsers } = useTenantUsers(true);

  const [actionQ, setActionQ] = useState("");
  const [entityQ, setEntityQ] = useState("");
  const [entityIdQ, setEntityIdQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [detailRow, setDetailRow] = useState<AuditLogEntry | null>(null);

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
    () =>
      filterRows(
        data?.items ?? [],
        actionQ,
        entityQ,
        entityIdQ,
        dateFrom,
        dateTo
      ),
    [data?.items, actionQ, entityQ, entityIdQ, dateFrom, dateTo]
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
        <h2 className="text-lg font-semibold text-foreground">Журнал аудита</h2>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>
            Фильтры ниже применяются только к текущей загруженной странице (
            limit / offset).
          </span>
          <ApiRouteHint>GET /audit-log</ApiRouteHint>
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="space-y-1">
          <label
            htmlFor="audit-action"
            className="text-xs font-medium text-muted-foreground"
          >
            Действие содержит
          </label>
          <Input
            id="audit-action"
            value={actionQ}
            onChange={(e) => {
              setActionQ(e.target.value);
            }}
            placeholder="например update"
            className="w-44"
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="audit-entity"
            className="text-xs font-medium text-muted-foreground"
          >
            Тип сущности содержит
          </label>
          <Input
            id="audit-entity"
            value={entityQ}
            onChange={(e) => {
              setEntityQ(e.target.value);
            }}
            placeholder="booking, guest…"
            className="w-44"
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="audit-entity-id"
            className="text-xs font-medium text-muted-foreground"
          >
            ID сущности содержит
          </label>
          <Input
            id="audit-entity-id"
            value={entityIdQ}
            onChange={(e) => {
              setEntityIdQ(e.target.value);
            }}
            placeholder="UUID или фрагмент"
            className="w-48 font-mono text-xs"
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="audit-from"
            className="text-xs font-medium text-muted-foreground"
          >
            С даты
          </label>
          <Input
            id="audit-from"
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
            }}
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="audit-to"
            className="text-xs font-medium text-muted-foreground"
          >
            По дату
          </label>
          <Input
            id="audit-to"
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
            }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        {!isPending && !isError ? (
          <Pagination
            className="rounded-md border border-border bg-muted/20 px-3 py-2"
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
        <div className="flex flex-col gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={filtered.length === 0}
            onClick={exportCsv}
          >
            Экспорт CSV (эта страница)
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Полный архив — только через выгрузку на сервере или обход всех
            страниц.
          </p>
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
          <table className="w-full min-w-[960px] table-fixed text-left text-sm">
            <thead className="sticky top-0 z-10 border-b bg-muted/50">
              <tr>
                <th className="w-[11rem] px-3 py-2 font-medium">Время</th>
                <th className="w-[8rem] px-3 py-2 font-medium">Действие</th>
                <th className="w-[7rem] px-3 py-2 font-medium">Сущность</th>
                <th className="w-[10rem] px-3 py-2 font-medium">ID</th>
                <th className="w-[11rem] px-3 py-2 font-medium">
                  Пользователь
                </th>
                <th className="w-[6rem] px-3 py-2 font-medium">IP</th>
                <th className="px-3 py-2 font-medium">Новые значения</th>
              </tr>
            </thead>
            <tbody
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
                      <tr
                        key={r.id}
                        tabIndex={0}
                        className="absolute left-0 table w-full cursor-pointer border-b border-border/80 align-top hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
                        <td className="px-3 py-2 align-top tabular-nums text-muted-foreground">
                          {formatTs(r.created_at)}
                        </td>
                        <td className="px-3 py-2 align-top font-mono text-xs">
                          {r.action}
                        </td>
                        <td className="px-3 py-2 align-top">{r.entity_type}</td>
                        <td className="px-3 py-2 align-top font-mono text-xs text-muted-foreground">
                          {r.entity_id ?? "—"}
                        </td>
                        <td className="max-w-[200px] px-3 py-2 align-top text-xs text-foreground">
                          {userLabel(userMap, r.user_id)}
                        </td>
                        <td className="px-3 py-2 align-top text-xs text-muted-foreground">
                          {r.ip_address ?? "—"}
                        </td>
                        <td className="max-w-[240px] px-3 py-2 align-top font-mono text-[10px] text-muted-foreground">
                          {shortJson(r.new_values)}
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>
          {filtered.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              Нет записей (или нет совпадений фильтру).
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
            <DialogTitle>Запись аудита</DialogTitle>
          </DialogHeader>
          {detailRow !== null ? (
            <div className="grid gap-3 text-sm">
              <div className="grid gap-1 sm:grid-cols-2">
                <div>
                  <span className="text-xs text-muted-foreground">Время</span>
                  <p className="font-mono text-xs">{formatTs(detailRow.created_at)}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Действие</span>
                  <p className="font-mono text-xs">{detailRow.action}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">
                    Тип сущности
                  </span>
                  <p>{detailRow.entity_type}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">ID сущности</span>
                  <p className="break-all font-mono text-xs">
                    {detailRow.entity_id ?? "—"}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-xs text-muted-foreground">
                    Пользователь
                  </span>
                  <p>{userLabel(userMap, detailRow.user_id)}</p>
                  {detailRow.user_id !== null &&
                  userMap.get(detailRow.user_id) !== undefined ? (
                    <p className="text-xs text-muted-foreground">
                      Роль:{" "}
                      {tenantRoleLabel(
                        userMap.get(detailRow.user_id)!.role
                      )}
                    </p>
                  ) : null}
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">IP</span>
                  <p className="font-mono text-xs">
                    {detailRow.ip_address ?? "—"}
                  </p>
                </div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">
                  Новые значения (JSON)
                </span>
                <pre className="mt-1 max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
                  {prettifyJson(detailRow.new_values) !== ""
                    ? prettifyJson(detailRow.new_values)
                    : "—"}
                </pre>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">
                  Предыдущие значения (JSON)
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
              Закрыть
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
