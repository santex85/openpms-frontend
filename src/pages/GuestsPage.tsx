import { useState } from "react";

import { Input } from "@/components/ui/input";
import { useGuests } from "@/hooks/useGuests";
import { formatApiError } from "@/lib/formatApiError";

function formatGuestDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function GuestsPage() {
  const [searchInput, setSearchInput] = useState("");
  const { data: guests, isPending, isError, error } = useGuests(searchInput);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Гости</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Профили по вашей организации. Поиск на стороне API (
          <code className="rounded bg-muted px-1 font-mono text-xs">
            GET /guests?q=
          </code>
          ).
        </p>
      </div>

      <div className="max-w-md space-y-2">
        <label htmlFor="guests-search" className="text-sm font-medium">
          Имя, фамилия, email или телефон
        </label>
        <Input
          id="guests-search"
          value={searchInput}
          onChange={(e) => {
            setSearchInput(e.target.value);
          }}
          placeholder="Начните ввод…"
          autoComplete="off"
        />
      </div>

      {isError ? (
        <p className="text-sm text-destructive" role="alert">
          {formatApiError(error)}
        </p>
      ) : isPending ? (
        <div
          className="h-40 animate-pulse rounded-md bg-muted"
          aria-busy
          aria-label="Загрузка списка гостей"
        />
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-3 py-2 font-medium">Фамилия</th>
                <th className="px-3 py-2 font-medium">Имя</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Телефон</th>
                <th className="px-3 py-2 font-medium">VIP</th>
                <th className="px-3 py-2 font-medium">Создан</th>
              </tr>
            </thead>
            <tbody>
              {(guests ?? []).map((g) => (
                <tr key={g.id} className="border-b border-border/80">
                  <td className="px-3 py-2">{g.last_name}</td>
                  <td className="px-3 py-2">{g.first_name}</td>
                  <td className="px-3 py-2 text-muted-foreground">{g.email}</td>
                  <td className="px-3 py-2 tabular-nums text-muted-foreground">
                    {g.phone}
                  </td>
                  <td className="px-3 py-2">
                    {g.vip_status ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-900/30 dark:text-amber-100">
                        VIP
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs tabular-nums text-muted-foreground">
                    {formatGuestDate(g.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(guests ?? []).length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              Нет гостей по текущему запросу.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
