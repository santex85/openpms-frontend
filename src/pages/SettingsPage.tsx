import { FormEvent, useState } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateProperty } from "@/hooks/useCreateProperty";
import { canManagePropertiesFromToken } from "@/lib/jwtPayload";
import type { PropertyCreate } from "@/types/api";

const TIMEZONE_PRESETS = [
  { value: "Europe/Moscow", label: "Europe/Moscow" },
  { value: "Europe/London", label: "Europe/London" },
  { value: "Asia/Bangkok", label: "Asia/Bangkok" },
  { value: "America/New_York", label: "America/New_York" },
  { value: "UTC", label: "UTC" },
] as const;

const CUSTOM_TZ = "__custom__";

function timeToApi(value: string): string {
  const v = value.trim();
  if (/^\d{2}:\d{2}$/.test(v)) {
    return `${v}:00`;
  }
  return v;
}

function formatCreatePropertyError(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data !== undefined) {
    const data = err.response.data as { detail?: unknown };
    if (typeof data.detail === "string") {
      return data.detail;
    }
    if (Array.isArray(data.detail)) {
      const parts = data.detail.map((item) => {
        if (typeof item === "object" && item !== null && "msg" in item) {
          return String((item as { msg: string }).msg);
        }
        return "";
      });
      const joined = parts.filter(Boolean).join("; ");
      if (joined !== "") {
        return joined;
      }
    }
    if (err.response.status === 403) {
      return "Недостаточно прав: создание отеля доступно ролям owner и manager.";
    }
  }
  return "Не удалось создать отель.";
}

export function SettingsPage() {
  const canManage = canManagePropertiesFromToken();
  const createMutation = useCreateProperty();

  const [name, setName] = useState("");
  const [timezoneMode, setTimezoneMode] = useState<string>(
    TIMEZONE_PRESETS[0].value
  );
  const [timezoneCustom, setTimezoneCustom] = useState("");
  const [currency, setCurrency] = useState("");
  const [checkinTime, setCheckinTime] = useState("14:00");
  const [checkoutTime, setCheckoutTime] = useState("11:00");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  async function handleCreateProperty(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const tz =
      timezoneMode === CUSTOM_TZ
        ? timezoneCustom.trim()
        : timezoneMode.trim();
    if (tz === "") {
      setFormError("Укажите часовой пояс (IANA).");
      return;
    }

    const cur = currency.trim().toUpperCase();
    if (cur.length !== 3) {
      setFormError("Валюта: ровно 3 буквы ISO 4217 (например USD, EUR).");
      return;
    }

    const body: PropertyCreate = {
      name: name.trim(),
      timezone: tz,
      currency: cur,
      checkin_time: timeToApi(checkinTime),
      checkout_time: timeToApi(checkoutTime),
    };

    if (body.name === "") {
      setFormError("Введите название отеля.");
      return;
    }

    try {
      await createMutation.mutateAsync(body);
      setFormSuccess("Отель создан. Он выбран в переключателе в шапке.");
      setName("");
      setCurrency("");
      setTimezoneCustom("");
      setTimezoneMode(TIMEZONE_PRESETS[0].value);
      setCheckinTime("14:00");
      setCheckoutTime("11:00");
    } catch (err) {
      setFormError(formatCreatePropertyError(err));
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Настройки</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Разделы ниже — поэтапное подключение к OpenPMS (пользователи, ключи,
          вебхуки, свойства).
        </p>
      </div>
      <section
        id="properties-hotels"
        className="space-y-4 rounded-lg border border-border bg-card p-4"
      >
        <h3 className="text-sm font-semibold text-foreground">
          Свойства отеля
        </h3>
        {!canManage ? (
          <p className="text-sm text-muted-foreground">
            Создание отелей доступно ролям owner и manager. Обратитесь к
            администратору тенанта.
          </p>
        ) : (
          <form className="max-w-md space-y-4" onSubmit={handleCreateProperty}>
            <p className="text-sm text-muted-foreground">
              Новое свойство создаётся через{" "}
              <code className="rounded bg-muted px-1 font-mono text-xs">
                POST /properties
              </code>
              . Часовой пояс — имя IANA (
              <a
                className="text-primary underline underline-offset-2"
                href="https://en.wikipedia.org/wiki/List_of_tz_database_time_zones"
                target="_blank"
                rel="noreferrer"
              >
                справочник
              </a>
              ).
            </p>
            {formError !== null ? (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}
            {formSuccess !== null ? (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                {formSuccess}
              </p>
            ) : null}
            <div className="space-y-2">
              <label htmlFor="prop-name" className="text-sm font-medium">
                Название отеля
              </label>
              <Input
                id="prop-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                }}
                placeholder="Grand Hotel"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium">Часовой пояс</span>
              <Select
                value={timezoneMode}
                onValueChange={(v) => {
                  setTimezoneMode(v);
                }}
              >
                <SelectTrigger aria-label="Часовой пояс">
                  <SelectValue placeholder="Выберите" />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_PRESETS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_TZ}>Другой (вручную)</SelectItem>
                </SelectContent>
              </Select>
              {timezoneMode === CUSTOM_TZ ? (
                <Input
                  value={timezoneCustom}
                  onChange={(e) => {
                    setTimezoneCustom(e.target.value);
                  }}
                  placeholder="Europe/Berlin"
                  aria-label="IANA timezone"
                />
              ) : null}
            </div>
            <div className="space-y-2">
              <label htmlFor="prop-currency" className="text-sm font-medium">
                Валюта (ISO 4217)
              </label>
              <Input
                id="prop-currency"
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value.toUpperCase());
                }}
                placeholder="USD"
                maxLength={3}
                autoComplete="off"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label
                  htmlFor="prop-checkin"
                  className="text-sm font-medium"
                >
                  Заезд
                </label>
                <Input
                  id="prop-checkin"
                  type="time"
                  value={checkinTime}
                  onChange={(e) => {
                    setCheckinTime(e.target.value);
                  }}
                />
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="prop-checkout"
                  className="text-sm font-medium"
                >
                  Выезд
                </label>
                <Input
                  id="prop-checkout"
                  type="time"
                  value={checkoutTime}
                  onChange={(e) => {
                    setCheckoutTime(e.target.value);
                  }}
                />
              </div>
            </div>
            <Button
              type="submit"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Создаём…" : "Создать отель"}
            </Button>
          </form>
        )}
      </section>
      <section
        id="room-types-hint"
        className="space-y-2 rounded-lg border border-border bg-card p-4"
      >
        <h3 className="text-sm font-semibold text-foreground">Типы номеров</h3>
        <p className="text-sm text-muted-foreground">
          Перед добавлением физических номеров нужна хотя бы одна категория
          (тип номера). Создание через{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            POST /room-types
          </code>{" "}
          в документации API{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">/docs</code>{" "}
          (форма на фронте — позже).
        </p>
      </section>
      <section className="space-y-2 rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">Пользователи</h3>
        <p className="text-sm text-muted-foreground">
          Приглашения:{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            POST /auth/invite
          </code>{" "}
          (роли owner/manager JWT).
        </p>
      </section>
      <section className="space-y-2 rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">API-ключи</h3>
        <p className="text-sm text-muted-foreground">
          Управление интеграционными ключами:{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            /api-keys
          </code>
          .
        </p>
      </section>
      <section className="space-y-2 rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">Вебхуки</h3>
        <p className="text-sm text-muted-foreground">
          Подписки и логи:{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            /webhooks
          </code>
          .
        </p>
      </section>
    </div>
  );
}
