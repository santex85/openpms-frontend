import { FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGuest } from "@/hooks/useGuest";
import { usePatchGuest } from "@/hooks/usePatchGuest";
import { formatApiError } from "@/lib/formatApiError";

export function GuestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: guest, isPending, isError, error } = useGuest(id);
  const patchMut = usePatchGuest();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [passport, setPassport] = useState("");
  const [nationality, setNationality] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [notes, setNotes] = useState("");
  const [vip, setVip] = useState(false);

  useEffect(() => {
    if (guest === undefined) {
      return;
    }
    setFirstName(guest.first_name);
    setLastName(guest.last_name);
    setEmail(guest.email);
    setPhone(guest.phone);
    setPassport(guest.passport_data ?? "");
    setNationality(guest.nationality ?? "");
    setDateOfBirth(guest.date_of_birth ?? "");
    setNotes(guest.notes ?? "");
    setVip(guest.vip_status);
  }, [guest]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (id === undefined || id === "") {
      return;
    }
    const nat = nationality.trim().toUpperCase();
    await patchMut.mutateAsync({
      guestId: id,
      body: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        passport_data: passport.trim() === "" ? null : passport.trim(),
        nationality: nat === "" ? null : nat,
        date_of_birth: dateOfBirth === "" ? null : dateOfBirth,
        notes: notes.trim() === "" ? null : notes.trim(),
        vip_status: vip,
      },
    });
  }

  if (id === undefined || id === "") {
    return (
      <p className="text-sm text-muted-foreground">Некорректная ссылка.</p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link to="/guests">← К списку гостей</Link>
        </Button>
      </div>

      {isError ? (
        <p className="text-sm text-destructive" role="alert">
          {formatApiError(error)}
        </p>
      ) : isPending || guest === undefined ? (
        <div
          className="h-48 animate-pulse rounded-md bg-muted"
          aria-busy
          aria-label="Загрузка профиля"
        />
      ) : (
        <>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {guest.last_name} {guest.first_name}
            </h2>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {guest.id}
            </p>
          </div>

          <section className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground">
              Бронирования
            </h3>
            {guest.bookings.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Нет связанных броней в ответе API.
              </p>
            ) : (
              <div className="mt-3 overflow-x-auto rounded-md border">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 font-medium">Статус</th>
                      <th className="px-3 py-2 font-medium">Заезд</th>
                      <th className="px-3 py-2 font-medium">Выезд</th>
                      <th className="px-3 py-2 font-medium">Сумма</th>
                      <th className="px-3 py-2 font-medium">Источник</th>
                    </tr>
                  </thead>
                  <tbody>
                    {guest.bookings.map((b) => (
                      <tr key={b.id} className="border-b border-border/80">
                        <td className="px-3 py-2">{b.status}</td>
                        <td className="px-3 py-2 tabular-nums">
                          {b.check_in_date ?? "—"}
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {b.check_out_date ?? "—"}
                        </td>
                        <td className="px-3 py-2 tabular-nums">{b.total_amount}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {b.source}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground">
              Редактирование
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              <code className="rounded bg-muted px-1 font-mono text-xs">
                PATCH /guests/{"{"}id{"}"}
              </code>
            </p>
            <form
              className="mt-4 grid max-w-xl gap-4 sm:grid-cols-2"
              onSubmit={(e) => void handleSubmit(e)}
            >
              <div className="space-y-2">
                <label htmlFor="g-first" className="text-sm font-medium">
                  Имя
                </label>
                <Input
                  id="g-first"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                  }}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="g-last" className="text-sm font-medium">
                  Фамилия
                </label>
                <Input
                  id="g-last"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                  }}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="g-email" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="g-email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                  }}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="g-phone" className="text-sm font-medium">
                  Телефон
                </label>
                <Input
                  id="g-phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                  }}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="g-passport" className="text-sm font-medium">
                  Паспорт / ID
                </label>
                <Input
                  id="g-passport"
                  value={passport}
                  onChange={(e) => {
                    setPassport(e.target.value);
                  }}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="g-nat" className="text-sm font-medium">
                  Гражданство (ISO2)
                </label>
                <Input
                  id="g-nat"
                  value={nationality}
                  onChange={(e) => {
                    setNationality(e.target.value.toUpperCase());
                  }}
                  maxLength={2}
                  placeholder="RU"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="g-dob" className="text-sm font-medium">
                  Дата рождения
                </label>
                <Input
                  id="g-dob"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => {
                    setDateOfBirth(e.target.value);
                  }}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <label htmlFor="g-notes" className="text-sm font-medium">
                  Заметки
                </label>
                <Input
                  id="g-notes"
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                  }}
                />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <input
                  id="g-vip"
                  type="checkbox"
                  checked={vip}
                  className="h-4 w-4 rounded border border-input"
                  onChange={(e) => {
                    setVip(e.target.checked);
                  }}
                />
                <label htmlFor="g-vip" className="text-sm font-medium">
                  VIP
                </label>
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={patchMut.isPending}>
                  {patchMut.isPending ? "Сохраняем…" : "Сохранить"}
                </Button>
              </div>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
