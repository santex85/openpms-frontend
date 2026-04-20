import { FormEvent, useEffect, useId, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { ApiRouteHint } from "@/components/dev/ApiRouteHint";
import { DynamicExtensionForm, validateExtensionFormData } from "@/components/extensions/DynamicExtensionForm";
import { Button } from "@/components/ui/button";
import { DatePickerField } from "@/components/ui/date-picker-field";
import { Input } from "@/components/ui/input";
import { usePatchGuest } from "@/hooks/useGuestMutations";
import { capitalizeGuestName } from "@/lib/capitalizeGuestName";
import type { CountryPackExtensionRead } from "@/types/country-pack";
import type { GuestDetailRead } from "@/types/guests";
import { formatIsoDateLocal } from "@/utils/boardDates";
import { formatShortLocaleDate } from "@/utils/formatLocaleDate";

export type GuestProfileFormProps =
  | {
      variant: "page";
      guest: GuestDetailRead;
      guestId: string;
      packExtensions: CountryPackExtensionRead[] | undefined;
      editing: boolean;
      onEditingChange: (next: boolean) => void;
      /** e.g. delete guest — rendered beside the Edit control */
      extraActions?: ReactNode;
    }
  | {
      variant: "dialog";
      guest: GuestDetailRead;
      guestId: string;
      packExtensions: CountryPackExtensionRead[] | undefined;
      onClose: () => void;
      onSaved?: () => void;
      /** When set, invalidates booking detail after PATCH (guest list on booking page). */
      bookingId?: string;
    };

export function GuestProfileForm(props: GuestProfileFormProps) {
  const { t, i18n } = useTranslation();
  const patchMut = usePatchGuest();
  const reactId = useId();
  const idPrefix = props.variant === "dialog" ? `${reactId}-` : "";

  const editing =
    props.variant === "dialog" ? true : props.editing;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [passport, setPassport] = useState("");
  const [nationality, setNationality] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [notes, setNotes] = useState("");
  const [vip, setVip] = useState(false);
  const [extensionData, setExtensionData] = useState<Record<string, unknown>>(
    {}
  );
  const [extensionErrors, setExtensionErrors] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    const guest = props.guest;
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
  }, [props.guest]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    const { guestId } = props;
    const exts = props.packExtensions ?? [];
    if (exts.length > 0) {
      const ve = validateExtensionFormData(exts, extensionData);
      if (Object.keys(ve).length > 0) {
        setExtensionErrors(ve);
        return;
      }
      setExtensionErrors({});
    }
    const nat = nationality.trim().toUpperCase();
    const bookingId =
      props.variant === "dialog" ? props.bookingId : undefined;

    await patchMut.mutateAsync({
      guestId,
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
      bookingId,
    });

    if (props.variant === "page") {
      props.onEditingChange(false);
    } else {
      props.onSaved?.();
      props.onClose();
    }
  }

  function resetFromGuest(): void {
    const guest = props.guest;
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
  }

  const packExtensions = props.packExtensions ?? [];

  return (
    <>
      <section
        className={
          props.variant === "dialog"
            ? "space-y-4"
            : "rounded-lg border border-border bg-card p-4"
        }
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          {props.variant === "page" ? (
            <h3 className="text-sm font-semibold text-foreground">
              {t("guests.profileSection", { defaultValue: "Профиль" })}
            </h3>
          ) : null}
          {props.variant === "page" && !props.editing ? (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  props.onEditingChange(true);
                }}
              >
                {t("common.edit")}
              </Button>
              {"extraActions" in props ? props.extraActions : null}
            </div>
          ) : null}
        </div>
        {props.variant === "page" ? (
          <ApiRouteHint className="mt-1">
            <code className="rounded bg-muted px-1 font-mono text-xs">
              PATCH /guests/{"{"}id{"}"}
            </code>
          </ApiRouteHint>
        ) : null}
        {!editing ? (
          <dl className="mt-4 grid max-w-xl gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">
                {t("guests.form.firstName", { defaultValue: "Имя" })}
              </dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {capitalizeGuestName(props.guest.first_name) || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                {t("guests.form.lastName", { defaultValue: "Фамилия" })}
              </dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {capitalizeGuestName(props.guest.last_name) || "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="mt-0.5 break-all">{props.guest.email || "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">
                {t("guests.form.phone", { defaultValue: "Телефон" })}
              </dt>
              <dd className="mt-0.5">{props.guest.phone || "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">
                {t("guests.form.passport", { defaultValue: "Паспорт / ID" })}
              </dt>
              <dd className="mt-0.5">{props.guest.passport_data ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                {t("guests.form.nationality", { defaultValue: "Гражданство" })}
              </dt>
              <dd className="mt-0.5">{props.guest.nationality ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">
                {t("guests.form.dob", { defaultValue: "Дата рождения" })}
              </dt>
              <dd className="mt-0.5 tabular-nums">
                {props.guest.date_of_birth !== undefined &&
                props.guest.date_of_birth !== null &&
                props.guest.date_of_birth !== ""
                  ? formatShortLocaleDate(
                      props.guest.date_of_birth,
                      i18n.language
                    )
                  : "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">
                {t("guests.form.notes", { defaultValue: "Заметки" })}
              </dt>
              <dd className="mt-0.5">{props.guest.notes ?? "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-muted-foreground">VIP</dt>
              <dd className="mt-0.5">
                {props.guest.vip_status ? "Да" : "Нет"}
              </dd>
            </div>
          </dl>
        ) : (
          <form
            className="mt-4 grid max-w-xl gap-4 sm:grid-cols-2"
            onSubmit={(e) => void handleSubmit(e)}
          >
            <div className="space-y-2">
              <label htmlFor={`${idPrefix}g-first`} className="text-sm font-medium">
                Имя
              </label>
              <Input
                id={`${idPrefix}g-first`}
                value={firstName}
                onChange={(e) => {
                  setFirstName(e.target.value);
                }}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor={`${idPrefix}g-last`} className="text-sm font-medium">
                Фамилия
              </label>
              <Input
                id={`${idPrefix}g-last`}
                value={lastName}
                onChange={(e) => {
                  setLastName(e.target.value);
                }}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label htmlFor={`${idPrefix}g-email`} className="text-sm font-medium">
                Email
              </label>
              <Input
                id={`${idPrefix}g-email`}
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                }}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label htmlFor={`${idPrefix}g-phone`} className="text-sm font-medium">
                Телефон
              </label>
              <Input
                id={`${idPrefix}g-phone`}
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                }}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label htmlFor={`${idPrefix}g-passport`} className="text-sm font-medium">
                Паспорт / ID
              </label>
              <Input
                id={`${idPrefix}g-passport`}
                value={passport}
                onChange={(e) => {
                  setPassport(e.target.value);
                }}
              />
            </div>
            <div className="space-y-2">
              <label htmlFor={`${idPrefix}g-nat`} className="text-sm font-medium">
                Гражданство
              </label>
              <Input
                id={`${idPrefix}g-nat`}
                value={nationality}
                onChange={(e) => {
                  setNationality(e.target.value.toUpperCase());
                }}
                maxLength={2}
                placeholder="RU"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor={`${idPrefix}g-dob`} className="text-sm font-medium">
                Дата рождения
              </label>
              <DatePickerField
                id={`${idPrefix}g-dob`}
                value={dateOfBirth}
                onChange={setDateOfBirth}
                max={formatIsoDateLocal(new Date())}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <label htmlFor={`${idPrefix}g-notes`} className="text-sm font-medium">
                Заметки
              </label>
              <Input
                id={`${idPrefix}g-notes`}
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                }}
              />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                id={`${idPrefix}g-vip`}
                type="checkbox"
                checked={vip}
                className="h-4 w-4 rounded border border-input"
                onChange={(e) => {
                  setVip(e.target.checked);
                }}
              />
              <label htmlFor={`${idPrefix}g-vip`} className="text-sm font-medium">
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
                  if (props.variant === "page") {
                    props.onEditingChange(false);
                    resetFromGuest();
                  } else {
                    props.onClose();
                  }
                }}
              >
                {t("common.cancel")}
              </Button>
            </div>
          </form>
        )}
      </section>

      {packExtensions.length > 0 ? (
        <section
          id={props.variant === "page" ? "extension-fields" : undefined}
          className={
            props.variant === "dialog"
              ? "mt-4 rounded-lg border border-border bg-card p-4"
              : "rounded-lg border border-border bg-card p-4 scroll-mt-20"
          }
        >
          <h3 className="text-sm font-semibold text-foreground">
            {t("extensions.guest.sectionTitle")}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("extensions.guest.sectionIntro")}
          </p>
          {editing ? (
            <div className="mt-4">
              <DynamicExtensionForm
                extensions={packExtensions}
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
                props.guest.extension_data !== undefined &&
                  props.guest.extension_data !== null
                  ? props.guest.extension_data
                  : {},
                null,
                2
              )}
            </pre>
          )}
        </section>
      ) : null}
    </>
  );
}
