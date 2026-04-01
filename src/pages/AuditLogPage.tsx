import { useMemo, useState } from "react";

import { Pagination } from "@/components/ui/pagination";
import { Input } from "@/components/ui/input";
import {
  AUDIT_LOG_PAGE_SIZE,
  useAuditLog,
} from "@/hooks/useAuditLog";
import { formatApiError } from "@/lib/formatApiError";
import type { AuditLogEntry } from "@/types/audit";

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

function filterRows(
  rows: AuditLogEntry[],
  actionQ: string,
  entityQ: string,
  dateFrom: string,
  dateTo: string
): AuditLogEntry[] {
  const a = actionQ.trim().toLowerCase();
  const e = entityQ.trim().toLowerCase();
  return rows.filter((r) => {
    if (a !== "" && !r.action.toLowerCase().includes(a)) {
      return false;
    }
    if (e !== "" && !r.entity_type.toLowerCase().includes(e)) {
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

export function AuditLogPage() {
  const [page, setPage] = useState(0);
  const { data, isPending, isError, error } = useAuditLog(page);
  const [actionQ, setActionQ] = useState("");
  const [entityQ, setEntityQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = useMemo(
    () =>
      filterRows(data?.items ?? [], actionQ, entityQ, dateFrom, dateTo),
    [data?.items, actionQ, entityQ, dateFrom, dateTo]
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Журнал аудита</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          <code className="rounded bg-muted px-1 font-mono text-xs">
            GET /audit-log
          </code>
          . Фильтры ниже применяются к загруженной странице (сервер не
          фильтрует). Параметры запроса: limit и offset.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Действие
          </label>
          <Input
            value={actionQ}
            onChange={(e) => {
              setActionQ(e.target.value);
            }}
            placeholder="содержит…"
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            Тип сущности
          </label>
          <Input
            value={entityQ}
            onChange={(e) => {
              setEntityQ(e.target.value);
            }}
            placeholder="содержит…"
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            С даты
          </label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
            }}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            По дату
          </label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
            }}
          />
        </div>
      </div>

      {!isPending && !isError ? (
        <Pagination
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

      {isError ? (
        <p className="text-sm text-destructive" role="alert">
          {formatApiError(error)}
        </p>
      ) : isPending ? (
        <div className="h-40 animate-pulse rounded-md bg-muted" aria-hidden />
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-3 py-2 font-medium">Время</th>
                <th className="px-3 py-2 font-medium">Действие</th>
                <th className="px-3 py-2 font-medium">Сущность</th>
                <th className="px-3 py-2 font-medium">ID</th>
                <th className="px-3 py-2 font-medium">User</th>
                <th className="px-3 py-2 font-medium">IP</th>
                <th className="px-3 py-2 font-medium">Новые значения</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-border/80 align-top">
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">
                    {formatTs(r.created_at)}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{r.action}</td>
                  <td className="px-3 py-2">{r.entity_type}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    {r.entity_id ?? "—"}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    {r.user_id ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {r.ip_address ?? "—"}
                  </td>
                  <td className="max-w-[240px] px-3 py-2 font-mono text-[10px] text-muted-foreground">
                    {shortJson(r.new_values)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              Нет записей (или нет совпадений фильтру).
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
