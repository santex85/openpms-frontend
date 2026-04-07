import { FormEvent, useEffect, useLayoutEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ApiRouteHint } from "@/components/dev/ApiRouteHint";
import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Input } from "@/components/ui/input";
import { DynamicExtensionForm, validateExtensionFormData } from "@/components/extensions/DynamicExtensionForm";
import { useCountryPackExtensions } from "@/hooks/useCountryPackExtensions";
import { useGuest } from "@/hooks/useGuest";
import { usePatchGuest } from "@/hooks/useGuestMutations";
import { capitalizeGuestName } from "@/lib/capitalizeGuestName";
import {
  bookingSourceLabel,
  bookingStatusLabel,
} from "@/lib/i18n/domainLabels";
import { showApiRouteHints } from "@/lib/showApiRouteHints";
import { formatApiError } from "@/lib/formatApiError";
import { formatIsoDateLocal } from "@/utils/boardDates";
import { formatShortLocaleDate } from "@/utils/formatLocaleDate";

function guestInitials(first: string, last: string): string {
  const a = last.trim().charAt(0) || first.trim().charAt(0) || "?";
  const b = first.trim().charAt(0) || "";
  return (a + b).toUpperCase().slice(0, 2);
}

export function GuestDetailPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: guest, isPending, isError, error } = useGuest(id);
  const { data: packExtensions } = useCountryPackExtensions(true);
  const patchMut = usePatchGuest();
  const [editingProfile, setEditingProfile] = useState(false);
  const [extensionData, setExtensionData] = useState<Record<string, unknown>>(
    {}
  );
  const [extensionErrors, setExtensionErrors] = useState<
    Record<string, string>
  >({});

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
    setExtensionData(
      guest.extension_data !== undefined && guest.extension_data !== null
        ? { ...guest.extension_data }
        : {}
    );
    setExtensionErrors({});
  }, [guest]);

  useLayoutEffect(() => {
    if (
      guest === undefined ||
      window.location.hash !== "#extension-fields"
    ) {
      return;
    }
    queueMicrotask(() => {
      document
        .getElementById("extension-fields")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [guest]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    if (id === undefined || id === "") {
      return;
    }
    const exts = packExtensions ?? [];
    if (exts.length > 0) {
      const ve = validateExtensionFormData(exts, extensionData);
      if (Object.keys(ve).length > 0) {
        setExtensionErrors(ve);
        return;
      }
      setExtensionErrors({});
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
        extension_data:
          Object.keys(extensionData).length > 0 ? extensionData : null,
      },
    });
    setEditingProfile(false);
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
          <div className="flex items-start gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground"
              aria-hidden
            >
              {guestInitials(guest.first_name, guest.last_name)}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {capitalizeGuestName(guest.last_name)}{" "}
                {capitalizeGuestName(guest.first_name)}
              </h2>
            {showApiRouteHints() ? (
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                id: {guest.id}
              </p>
            ) : null}
            </div>
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
                      <tr
                        key={b.id}
                        role="link"
                        tabIndex={0}
                        className="cursor-pointer border-b border-border/80 hover:bg-muted/40"
                        onClick={() => {
                          navigate(`/bookings/${b.id}`);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            navigate(`/bookings/${b.id}`);
                          }
                        }}
                      >
                        <td className="px-3 py-2">
                          {bookingStatusLabel(b.status)}
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {formatShortLocaleDate(
                            b.check_in_date,
                            i18n.language
                          )}
                        </td>
                        <td className="px-3 py-2 tabular-nums">
                          {formatShortLocaleDate(
                            b.check_out_date,
                            i18n.language
                          )}
                        </td>
                        <td className="px-3 py-2 tabular-nums">{b.total_amount}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {bookingSourceLabel(b.source)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">Профиль</h3>
              {!editingProfile ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingProfile(true);
                  }}
                >
                  {t("common.edit")}
                </Button>
              ) : null}
            </div>
            <ApiRouteHint className="mt-1">
              <code className="rounded bg-muted px-1 font-mono text-xs">
                PATCH /guests/{"{"}id{"}"}
              </code>
            </ApiRouteHint>
            {!editingProfile ? (
              <dl className="mt-4 grid max-w-xl gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">{t("guests.form.firstName", { defaultValue: "Имя" })}</dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {capitalizeGuestName(guest.first_name) || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t("guests.form.lastName", { defaultValue: "Фамилия" })}</dt>
                  <dd className="mt-0.5 font-medium text-foreground">
                    {capitalizeGuestName(guest.last_name) || "—"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Email</dt>
                  <dd className="mt-0.5 break-all">{guest.email || "—"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">{t("guests.form.phone", { defaultValue: "Телефон" })}</dt>
                  <dd className="mt-0.5">{guest.phone || "—"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">
                    {t("guests.form.passport", { defaultValue: "Паспорт / ID" })}
                  </dt>
                  <dd className="mt-0.5">{guest.passport_data ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    {t("guests.form.nationality", { defaultValue: "Гражданство" })}
                  </dt>
                  <dd className="mt-0.5">{guest.nationality ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">
                    {t("guests.form.dob", { defaultValue: "Дата рождения" })}
                  </dt>
                  <dd className="mt-0.5 tabular-nums">
                    {guest.date_of_birth !== undefined &&
                    guest.date_of_birth !== null &&
                    guest.date_of_birth !== ""
                      ? formatShortLocaleDate(guest.date_of_birth, i18n.language)
                      : "—"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">
                    {t("guests.form.notes", { defaultValue: "Заметки" })}
                  </dt>
                  <dd className="mt-0.5">{guest.notes ?? "—"}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">VIP</dt>
                  <dd className="mt-0.5">{guest.vip_status ? "Да" : "Нет"}</dd>
                </div>
              </dl>
            ) : (
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
                    Гражданство
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
                  <DatePickerField
                    id="g-dob"
                    value={dateOfBirth}
                    onChange={setDateOfBirth}
                    max={formatIsoDateLocal(new Date())}
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
                <div className="sticky bottom-3 z-10 mt-2 flex flex-wrap gap-2 rounded-md border border-border bg-background/95 p-3 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:col-span-2">
                  <Button type="submit" disabled={patchMut.isPending}>
                    {patchMut.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Сохраняем…
                      </>
                    ) : (
                      t("common.save")
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={patchMut.isPending}
                    onClick={() => {
                      setEditingProfile(false);
                      if (guest !== undefined) {
                        setFirstName(guest.first_name);
                        setLastName(guest.last_name);
                        setEmail(guest.email);
                        setPhone(guest.phone);
                        setPassport(guest.passport_data ?? "");
                        setNationality(guest.nationality ?? "");
                        setDateOfBirth(guest.date_of_birth ?? "");
                        setNotes(guest.notes ?? "");
                        setVip(guest.vip_status);
                        setExtensionData(
                          guest.extension_data !== undefined &&
                            guest.extension_data !== null
                            ? { ...guest.extension_data }
                            : {}
                        );
                        setExtensionErrors({});
                      }
                    }}
                  >
                    {t("common.cancel")}
                  </Button>
                </div>
              </form>
            )}
          </section>

          {(packExtensions ?? []).length > 0 ? (
            <section
              id="extension-fields"
              className="rounded-lg border border-border bg-card p-4 scroll-mt-20"
            >
              <h3 className="text-sm font-semibold text-foreground">
                {t("extensions.guest.sectionTitle")}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("extensions.guest.sectionIntro")}
              </p>
              {editingProfile ? (
                <div className="mt-4">
                  <DynamicExtensionForm
                    extensions={packExtensions ?? []}
                    value={extensionData}
                    onChange={(next) => {
                      setExtensionData(next);
                      setExtensionErrors({});
                    }}
                    disabled={patchMut.isPending}
                    errors={extensionErrors}
                  />
                </div>
              ) : (
                <pre className="mt-4 max-h-48 overflow-auto rounded-md bg-muted/50 p-3 font-mono text-xs">
                  {JSON.stringify(
                    guest.extension_data !== undefined &&
                      guest.extension_data !== null
                      ? guest.extension_data
                      : {},
                    null,
                    2
                  )}
                </pre>
              )}
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
