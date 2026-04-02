import { useMemo, useState } from "react";
import { Download } from "lucide-react";

import { ApiRouteHint } from "@/components/dev/ApiRouteHint";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/ui/pagination";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import {
  AUDIT_LOG_PAGE_SIZE,
  useAuditLog,
} from "@/hooks/useAuditLog";
import { useTenantUsers } from "@/hooks/useTenantUsers";
import { formatApiError } from "@/lib/formatApiError";
import { showApiRouteHints } from "@/lib/showApiRouteHints";
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

function shortId(id: string | null): string {
  if (id === null || id === "") {
    return "—";
  }
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

function prettyJson(v: Record<string, unknown> | null): string {
  if (v === null) {
    return "";
  }
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
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

function csvEscape(s: string): string {
  return s.replace(/"/g, '""');
}

function rowsToCsv(rows: AuditLogEntry[]): string {
  const headers = [
    "created_at",
    "action",
    "entity_type",
    "entity_id",
    "user",
    "ip_address",
    "new_values",
  ];
  const lines = [headers.join(",")];
  for (const r of rows) {
    const nvRaw =
      r.new_values === null ? "" : JSON.stringify(r.new_values);
    const nv = csvEscape(nvRaw);
    const user = r.user_id ?? "";
    const cells = [
      `"${r.created_at}"`,
      `"${csvEscape(r.action)}"`,
      `"${csvEscape(r.entity_type)}"`,
      `"${csvEscape(r.entity_id ?? "")}"`,
      `"${csvEscape(user)}"`,
      `"${csvEscape(r.ip_address ?? "")}"`,
      `"${nv}"`,
    ];
    lines.push(cells.join(","));
  }
  return lines.join("\n");
}

export function AuditLogPage() {
  const [page, setPage] = useState(0);
  const { data, isPending, isError, error } = useAuditLog(page);
  const { data: tenantUsers } = useTenantUsers(true);
  const [actionQ, setActionQ] = useState("");
  const [entityQ, setEntityQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [detail, setDetail] = useState<AuditLogEntry | null>(null);

  const userById = useMemo(() => {
    const m = new Map<string, { email: string; full_name: string }>();
    for (const u of tenantUsers ?? []) {
      m.set(u.id, { email: u.email, full_name: u.full_name });
    }
    return m;
  }, [tenantUsers]);

  function userLabel(userId: string | null): string {
    if (userId === null) {
      return "—";
    }
    const u = userById.get(userId);
    if (u === undefined) {
      return shortId(userId);
    }
    return u.full_name.trim() !== ""
      ? `${u.full_name} · ${u.email}`
      : u.email;
  }

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
          Записи действий в текущей организации. Фильтры ниже применяются к
          уже загруженной странице (до {AUDIT_LOG_PAGE_SIZE} строк); общий объём
          на сервере не подсчитывается.
        </p>
        <ApiRouteHint className="mt-1">
          <code className="rounded bg-muted px-1 font-mono text-[10px]">
            GET /audit-log
          </code>
        </ApiRouteHint>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="space-y-1">
          <label
            htmlFor="audit-action"
            className="text-xs font-medium text-muted-foreground"
          >
            Действие (код операции)
          </label>
          <Input
            id="audit-action"
            value={actionQ}
            onChange={(e) => {
              setActionQ(e.target.value);
            }}
            placeholder="часть строки, например update"
            className="w-48"
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="audit-entity"
            className="text-xs font-medium text-muted-foreground"
          >
            Тип сущности
          </label>
          <Input
            id="audit-entity"
            value={entityQ}
            onChange={(e) => {
              setEntityQ(e.target.value);
            }}
            placeholder="booking, guest…"
            className="w-48"
          />
        </div>
        <div className="space-y-1">
          <label
            htmlFor="audit-from"
            className="text-xs font-medium text-muted-foreground"
          >
            С даты (по времени записи)
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
        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={filtered.length === 0}
            onClick={() => {
              const blob = new Blob([rowsToCsv(filtered)], {
                type: "text/csv;charset=utf-8",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `audit-page-${page + 1}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="mr-1.5 h-4 w-4" />
            CSV (экран)
          </Button>
        </div>
      </div>

      {!isPending && !isError ? (
        <Pagination
          className="rounded-lg border border-border bg-card p-3"
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
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-3 py-2 font-medium">Время</th>
                <th className="px-3 py-2 font-medium">Действие</th>
                <th className="px-3 py-2 font-medium">Сущность</th>
                <th className="px-3 py-2 font-medium">ID</th>
                <th className="px-3 py-2 font-medium">Пользователь</th>
                <th className="px-3 py-2 font-medium">IP</th>
                <th className="px-3 py-2 font-medium">Новые значения</th>
              </tr>
            </thead>
            <TableSkeleton rows={6} cols={7} />
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-3 py-2 font-medium">Время</th>
                <th className="px-3 py-2 font-medium">Действие</th>
                <th className="px-3 py-2 font-medium">Сущность</th>
                <th className="px-3 py-2 font-medium">ID</th>
                <th className="px-3 py-2 font-medium">Пользователь</th>
                <th className="px-3 py-2 font-medium">IP</th>
                <th className="px-3 py-2 font-medium">Новые значения</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  role="button"
                  tabIndex={0}
                  className="cursor-pointer border-b border-border/80 align-top hover:bg-muted/40"
                  onClick={() => {
                    setDetail(r);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setDetail(r);
                    }
                  }}
                >
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">
                    {formatTs(r.created_at)}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{r.action}</td>
                  <td className="px-3 py-2">{r.entity_type}</td>
                  <td
                    className="px-3 py-2 font-mono text-xs text-muted-foreground"
                    title={
                      r.entity_id !== null && showApiRouteHints()
                        ? r.entity_id
                        : undefined
                    }
                  >
                    {shortId(r.entity_id)}
                  </td>
                  <td
                    className="max-w-[200px] px-3 py-2 text-xs text-muted-foreground"
                    title={
                      r.user_id !== null && showApiRouteHints()
                        ? r.user_id
                        : undefined
                    }
                  >
                    {userLabel(r.user_id)}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {r.ip_address ?? "—"}
                  </td>
                  <td className="max-w-[260px] px-3 py-2">
                    {r.new_values === null ||
                    Object.keys(r.new_values).length === 0 ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-primary">
                          Показать JSON
                        </summary>
                        <pre className="mt-1 max-h-32 overflow-auto rounded bg-muted p-2 font-mono text-[10px]">
                          {prettyJson(r.new_values)}
                        </pre>
                      </details>
                    )}
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

      <Dialog open={detail !== null} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Запись аудита</DialogTitle>
          </DialogHeader>
          {detail !== null ? (
            <div className="space-y-3 text-sm">
              <dl className="grid gap-2 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">Время</dt>
                  <dd className="tabular-nums">{formatTs(detail.created_at)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Действие</dt>
                  <dd className="font-mono text-xs">{detail.action}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Сущность</dt>
                  <dd>{detail.entity_type}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">ID сущности</dt>
                  <dd className="break-all font-mono text-xs">
                    {detail.entity_id ?? "—"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs text-muted-foreground">Пользователь</dt>
                  <dd>{userLabel(detail.user_id)}</dd>
                  {showApiRouteHints() && detail.user_id !== null ? (
                    <dd className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                      {detail.user_id}
                    </dd>
                  ) : null}
                </div>
              </dl>
              {detail.old_values !== null &&
              Object.keys(detail.old_values).length > 0 ? (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    Предыдущие значения
                  </p>
                  <pre className="max-h-40 overflow-auto rounded bg-muted p-2 font-mono text-xs">
                    {prettyJson(detail.old_values)}
                  </pre>
                </div>
              ) : null}
              {detail.new_values !== null &&
              Object.keys(detail.new_values).length > 0 ? (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    Новые значения
                  </p>
                  <pre className="max-h-40 overflow-auto rounded bg-muted p-2 font-mono text-xs">
                    {prettyJson(detail.new_values)}
                  </pre>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
