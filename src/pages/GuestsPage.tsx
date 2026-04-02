import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { ApiRouteHint } from "@/components/dev/ApiRouteHint";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCanWriteBookings } from "@/hooks/useAuthz";
import { useCreateGuest } from "@/hooks/useGuestMutations";
import { useGuests } from "@/hooks/useGuests";
import { formatApiError } from "@/lib/formatApiError";

const GUESTS_PAGE_SIZE = 25;

function guestInitials(first: string, last: string): string {
  const a = last.trim().charAt(0) || first.trim().charAt(0) || "?";
  const b = first.trim().charAt(0) || "";
  return (a + b).toUpperCase().slice(0, 2);
}

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
  const navigate = useNavigate();
  const canCreateGuest = useCanWriteBookings();
  const createGuestMut = useCreateGuest();
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [cgFirst, setCgFirst] = useState("");
  const [cgLast, setCgLast] = useState("");
  const [cgEmail, setCgEmail] = useState("");
  const [cgPhone, setCgPhone] = useState("");
  const [cgPassport, setCgPassport] = useState("");
  const [cgNat, setCgNat] = useState("");
  const [cgDob, setCgDob] = useState("");
  const [cgNotes, setCgNotes] = useState("");
  const [cgVip, setCgVip] = useState(false);
  const [cgError, setCgError] = useState<string | null>(null);

  const listOptions = useMemo(
    () => ({ page, pageSize: GUESTS_PAGE_SIZE }),
    [page]
  );
  const { data: pageData, isPending, isError, error } = useGuests(
    searchInput,
    listOptions
  );

  useEffect(() => {
    setPage(0);
  }, [searchInput]);

  const guests = pageData?.items ?? [];
  const total = pageData?.total ?? 0;

  function resetCreateGuest(): void {
    setCgFirst("");
    setCgLast("");
    setCgEmail("");
    setCgPhone("");
    setCgPassport("");
    setCgNat("");
    setCgDob("");
    setCgNotes("");
    setCgVip(false);
    setCgError(null);
  }

  async function onCreateGuest(e: FormEvent): Promise<void> {
    e.preventDefault();
    setCgError(null);
    const fn = cgFirst.trim();
    const ln = cgLast.trim();
    const em = cgEmail.trim();
    const ph = cgPhone.trim();
    if (fn === "" || ln === "") {
      setCgError("Укажите имя и фамилию.");
      return;
    }
    if (em === "" || ph === "") {
      setCgError("Укажите email и телефон.");
      return;
    }
    const nat = cgNat.trim().toUpperCase();
    try {
      await createGuestMut.mutateAsync({
        first_name: fn,
        last_name: ln,
        email: em,
        phone: ph,
        passport_data: cgPassport.trim() === "" ? null : cgPassport.trim(),
        nationality: nat === "" ? null : nat,
        date_of_birth: cgDob === "" ? null : cgDob,
        notes: cgNotes.trim() === "" ? null : cgNotes.trim(),
        vip_status: cgVip,
      });
      setCreateOpen(false);
      resetCreateGuest();
    } catch (err) {
      setCgError(formatApiError(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Гости</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Профили по вашей организации. Поиск с небольшой задержкой после ввода
            (запрос к серверу).
          </p>
          <ApiRouteHint className="mt-1">
            <code className="rounded bg-muted px-1 font-mono text-[10px]">
              GET /guests?q=
            </code>
          </ApiRouteHint>
        </div>
        {canCreateGuest ? (
          <Button
            type="button"
            onClick={() => {
              resetCreateGuest();
              setCreateOpen(true);
            }}
          >
            Новый гость
          </Button>
        ) : null}
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

      {!isPending && !isError ? (
        <Pagination
          className="rounded-lg border border-border bg-card p-3"
          total={total}
          limit={GUESTS_PAGE_SIZE}
          offset={page * GUESTS_PAGE_SIZE}
          onPageChange={(newOffset) => {
            setPage(Math.floor(newOffset / GUESTS_PAGE_SIZE));
          }}
        />
      ) : null}

      {isError ? (
        <p className="text-sm text-destructive" role="alert">
          {formatApiError(error)}
        </p>
      ) : isPending ? (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-3 py-2 font-medium w-12" />
                <th className="px-3 py-2 font-medium">Фамилия</th>
                <th className="px-3 py-2 font-medium">Имя</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Телефон</th>
                <th className="px-3 py-2 font-medium">VIP</th>
                <th className="px-3 py-2 font-medium">Создан</th>
              </tr>
            </thead>
            <TableSkeleton rows={8} cols={7} />
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-3 py-2 font-medium w-12" aria-label="Аватар" />
                <th className="px-3 py-2 font-medium">Фамилия</th>
                <th className="px-3 py-2 font-medium">Имя</th>
                <th className="px-3 py-2 font-medium">Email</th>
                <th className="px-3 py-2 font-medium">Телефон</th>
                <th className="px-3 py-2 font-medium">VIP</th>
                <th className="px-3 py-2 font-medium">Создан</th>
              </tr>
            </thead>
            <tbody>
              {guests.map((g) => (
                <tr
                  key={g.id}
                  role="link"
                  tabIndex={0}
                  className="cursor-pointer border-b border-border/80 hover:bg-muted/40"
                  onClick={() => {
                    navigate(`/guests/${g.id}`);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigate(`/guests/${g.id}`);
                    }
                  }}
                >
                  <td className="px-3 py-2">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground"
                      aria-hidden
                    >
                      {guestInitials(g.first_name, g.last_name)}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-medium">{g.last_name}</td>
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
                      <span className="text-muted-foreground/50">·</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs tabular-nums text-muted-foreground">
                    {formatGuestDate(g.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {guests.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              Нет гостей по текущему запросу.
            </p>
          ) : null}
        </div>
      )}

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetCreateGuest();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Новый гость</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={(e) => void onCreateGuest(e)}>
            <ApiRouteHint>
              <code className="rounded bg-muted px-1 font-mono text-[10px]">
                POST /guests
              </code>
            </ApiRouteHint>
            {cgError !== null ? (
              <p className="text-sm text-destructive" role="alert">
                {cgError}
              </p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="cg-first" className="text-sm font-medium">
                  Имя
                </label>
                <Input
                  id="cg-first"
                  value={cgFirst}
                  onChange={(e) => setCgFirst(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="cg-last" className="text-sm font-medium">
                  Фамилия
                </label>
                <Input
                  id="cg-last"
                  value={cgLast}
                  onChange={(e) => setCgLast(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="cg-email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="cg-email"
                  type="email"
                  value={cgEmail}
                  onChange={(e) => setCgEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="cg-phone" className="text-sm font-medium">
                  Телефон
                </label>
                <Input
                  id="cg-phone"
                  type="tel"
                  value={cgPhone}
                  onChange={(e) => setCgPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="cg-passport" className="text-sm font-medium">
                  Паспорт / ID
                </label>
                <Input
                  id="cg-passport"
                  value={cgPassport}
                  onChange={(e) => setCgPassport(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="cg-nat" className="text-sm font-medium">
                  Гражданство (ISO2)
                </label>
                <Input
                  id="cg-nat"
                  value={cgNat}
                  maxLength={2}
                  onChange={(e) => setCgNat(e.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="cg-dob" className="text-sm font-medium">
                  Дата рождения
                </label>
                <Input
                  id="cg-dob"
                  type="date"
                  value={cgDob}
                  onChange={(e) => setCgDob(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="cg-notes" className="text-sm font-medium">
                  Заметки
                </label>
                <Input
                  id="cg-notes"
                  value={cgNotes}
                  onChange={(e) => setCgNotes(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <input
                  id="cg-vip"
                  type="checkbox"
                  className="h-4 w-4 rounded border border-input"
                  checked={cgVip}
                  onChange={(e) => setCgVip(e.target.checked)}
                />
                <label htmlFor="cg-vip" className="text-sm font-medium">
                  VIP
                </label>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Отмена
              </Button>
              <Button type="submit" disabled={createGuestMut.isPending}>
                {createGuestMut.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Создаём…
                  </>
                ) : (
                  "Создать"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
