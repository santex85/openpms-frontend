import { useLayoutEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";

import { GuestProfileForm } from "@/components/guests/GuestProfileForm";
import { Button } from "@/components/ui/button";
import { useCountryPackExtensions } from "@/hooks/useCountryPackExtensions";
import { useGuest } from "@/hooks/useGuest";
import { capitalizeGuestName } from "@/lib/capitalizeGuestName";
import {
  bookingSourceLabel,
  bookingStatusLabel,
} from "@/lib/i18n/domainLabels";
import { showApiRouteHints } from "@/lib/showApiRouteHints";
import { formatApiError } from "@/lib/formatApiError";
import { formatShortLocaleDate } from "@/utils/formatLocaleDate";

function guestInitials(first: string, last: string): string {
  const a = last.trim().charAt(0) || first.trim().charAt(0) || "?";
  const b = first.trim().charAt(0) || "";
  return (a + b).toUpperCase().slice(0, 2);
}

export function GuestDetailPage() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: guest, isPending, isError, error } = useGuest(id);
  const { data: packExtensions } = useCountryPackExtensions(true);
  const [editingProfile, setEditingProfile] = useState(false);

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

          <GuestProfileForm
            variant="page"
            guest={guest}
            guestId={id}
            packExtensions={packExtensions}
            editing={editingProfile}
            onEditingChange={setEditingProfile}
          />
        </>
      )}
    </div>
  );
}
