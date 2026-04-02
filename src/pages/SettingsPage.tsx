import { FormEvent, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { useLocation } from "react-router-dom";
import { ApiRouteHint } from "@/components/dev/ApiRouteHint";
import { SettingsChangePasswordSection } from "@/components/settings/SettingsChangePasswordSection";
import { SettingsApiKeysSection } from "@/components/settings/SettingsApiKeysSection";
import { SettingsUsersSection } from "@/components/settings/SettingsUsersSection";
import { SettingsRoomTypesTable } from "@/components/settings/SettingsRoomTypesTable";
import { SettingsWebhooksSection } from "@/components/settings/SettingsWebhooksSection";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ForbiddenMessages, isAxiosForbidden } from "@/lib/forbiddenError";
import { useCreateProperty } from "@/hooks/useCreateProperty";
import { useCanManageProperties } from "@/hooks/useAuthz";
import { useCreateRoomType } from "@/hooks/useRoomTypeMutations";
import { useProperties } from "@/hooks/useProperties";
import { useUpdateProperty } from "@/hooks/useUpdateProperty";
import { useRoomTypes } from "@/hooks/useRoomTypes";
import { usePropertyStore } from "@/stores/property-store";
import type { PropertyCreate } from "@/types/api";
import type { RoomTypeCreate } from "@/types/room-types";

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

/** API times like `14:00:00` → value for `<input type="time" />`. */
function apiTimeToInput(value: string): string {
  const v = value.trim();
  if (/^\d{2}:\d{2}/.test(v)) {
    return v.slice(0, 5);
  }
  return "00:00";
}

function formatPropertyFormError(err: unknown, mode: "create" | "update"): string {
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
    if (isAxiosForbidden(err)) {
      return mode === "create"
        ? ForbiddenMessages.propertyCreate
        : ForbiddenMessages.propertyUpdate;
    }
    if (err.response.status === 405 && mode === "update") {
      return "Сервер не поддерживает PATCH для отеля (405). Нужен другой метод или версия API.";
    }
  }
  return mode === "create"
    ? "Не удалось создать отель."
    : "Не удалось сохранить настройки отеля.";
}

function formatRoomTypeMutationError(err: unknown): string {
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
    if (isAxiosForbidden(err)) {
      return ForbiddenMessages.roomTypeCreate;
    }
    if (err.response.status === 404) {
      return "Отель не найден или не принадлежит вашей организации.";
    }
  }
  return "Не удалось создать тип номера.";
}

export function SettingsPage() {
  const location = useLocation();
  const canManage = useCanManageProperties();
  const createMutation = useCreateProperty();
  const updateMutation = useUpdateProperty();
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const { data: properties } = useProperties();
  const {
    data: roomTypes,
    isPending: roomTypesPending,
    isError: roomTypesError,
  } = useRoomTypes();
  const createRoomTypeMutation = useCreateRoomType();

  const selectedPropertyName = useMemo(() => {
    if (selectedPropertyId === null || properties === undefined) {
      return null;
    }
    return properties.find((p) => p.id === selectedPropertyId)?.name ?? null;
  }, [selectedPropertyId, properties]);

  const [rtName, setRtName] = useState("");
  const [rtBase, setRtBase] = useState("2");
  const [rtMax, setRtMax] = useState("4");
  const [rtFormError, setRtFormError] = useState<string | null>(null);
  const [rtFormSuccess, setRtFormSuccess] = useState<string | null>(null);
  const [rtDialogOpen, setRtDialogOpen] = useState(false);

  async function handleCreateRoomType(
    e: FormEvent<HTMLFormElement>
  ): Promise<void> {
    e.preventDefault();
    setRtFormError(null);
    setRtFormSuccess(null);

    if (selectedPropertyId === null) {
      setRtFormError("Выберите отель в шапке.");
      return;
    }

    const nameTrim = rtName.trim();
    if (nameTrim === "") {
      setRtFormError("Введите название категории.");
      return;
    }

    const base = Number.parseInt(rtBase, 10);
    const max = Number.parseInt(rtMax, 10);
    if (!Number.isFinite(base) || base < 1) {
      setRtFormError("Базовая вместимость — целое число от 1.");
      return;
    }
    if (!Number.isFinite(max) || max < 1) {
      setRtFormError("Максимальная вместимость — целое число от 1.");
      return;
    }
    if (max < base) {
      setRtFormError("Максимальная вместимость не может быть меньше базовой.");
      return;
    }

    const body: RoomTypeCreate = {
      property_id: selectedPropertyId,
      name: nameTrim,
      base_occupancy: base,
      max_occupancy: max,
    };

    try {
      await createRoomTypeMutation.mutateAsync(body);
      setRtFormSuccess("Тип номера создан.");
      setRtName("");
      setRtBase("2");
      setRtMax("4");
      setRtDialogOpen(false);
    } catch (err) {
      setRtFormError(formatRoomTypeMutationError(err));
    }
  }

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

  useEffect(() => {
    if (location.hash === "#account-password") {
      document
        .getElementById("account-password")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.hash]);

  useEffect(() => {
    if (selectedPropertyId === null) {
      setName("");
      setCurrency("");
      setTimezoneCustom("");
      setTimezoneMode(TIMEZONE_PRESETS[0].value);
      setCheckinTime("14:00");
      setCheckoutTime("11:00");
      return;
    }
    if (properties === undefined) {
      return;
    }
    const prop = properties.find((p) => p.id === selectedPropertyId);
    if (prop === undefined) {
      return;
    }
    setName(prop.name);
    setCurrency(prop.currency);
    const tz = (prop.timezone ?? "").trim();
    const presetHit = TIMEZONE_PRESETS.find(
      (p) => p.value.toLowerCase() === tz.toLowerCase()
    );
    if (presetHit !== undefined) {
      setTimezoneMode(presetHit.value);
      setTimezoneCustom("");
    } else if (tz !== "") {
      setTimezoneMode(CUSTOM_TZ);
      setTimezoneCustom(tz);
    } else {
      setTimezoneMode(CUSTOM_TZ);
      setTimezoneCustom("");
    }
    setCheckinTime(apiTimeToInput(prop.checkin_time));
    setCheckoutTime(apiTimeToInput(prop.checkout_time));
  }, [selectedPropertyId, properties]);

  async function handlePropertyForm(e: FormEvent<HTMLFormElement>) {
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
      if (selectedPropertyId !== null) {
        await updateMutation.mutateAsync({
          propertyId: selectedPropertyId,
          body,
        });
        setFormSuccess("Настройки отеля сохранены.");
      } else {
        await createMutation.mutateAsync(body);
        setFormSuccess("Отель создан. Он выбран в переключателе в шапке.");
        setName("");
        setCurrency("");
        setTimezoneCustom("");
        setTimezoneMode(TIMEZONE_PRESETS[0].value);
        setCheckinTime("14:00");
        setCheckoutTime("11:00");
      }
    } catch (err) {
      setFormError(
        formatPropertyFormError(
          err,
          selectedPropertyId !== null ? "update" : "create"
        )
      );
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
      <SettingsChangePasswordSection />
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
          <form
            className="max-w-md space-y-4"
            onSubmit={(e) => void handlePropertyForm(e)}
          >
            <p className="text-sm text-muted-foreground">
              Часовой пояс — имя IANA (
              <a
                className="text-primary underline underline-offset-2"
                href="https://en.wikipedia.org/wiki/List_of_tz_database_time_zones"
                target="_blank"
                rel="noreferrer"
              >
                справочник
              </a>
              ).{" "}
              {selectedPropertyId !== null ? (
                <>
                  Редактируете выбранный в шапке отель.{" "}
                  <ApiRouteHint>PATCH /properties/{"{"}id{"}"}</ApiRouteHint>{" "}
                  <ApiRouteHint>GET /properties</ApiRouteHint>
                </>
              ) : (
                <>
                  Новый отель создаётся через API. Выберите отель в шапке, чтобы
                  править существующий.{" "}
                  <ApiRouteHint>POST /properties</ApiRouteHint>
                </>
              )}
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
                key={selectedPropertyId ?? "new-property"}
                value={timezoneMode}
                onValueChange={(v) => {
                  setTimezoneMode(v);
                }}
              >
                <SelectTrigger aria-label="Часовой пояс">
                  <SelectValue placeholder="Выберите часовой пояс" />
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
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              ) : null}
              {selectedPropertyId !== null
                ? updateMutation.isPending
                  ? "Сохраняем…"
                  : "Сохранить"
                : createMutation.isPending
                  ? "Создаём…"
                  : "Создать отель"}
            </Button>
          </form>
        )}
      </section>
      <section
        id="room-types-hint"
        className="space-y-4 rounded-lg border border-border bg-card p-4"
      >
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Типы номеров
            {selectedPropertyName !== null ? (
              <span className="ml-2 font-normal text-muted-foreground">
                ({selectedPropertyName})
              </span>
            ) : null}
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>Категории для физических номеров выбранного отеля.</span>
            <ApiRouteHint>POST /room-types</ApiRouteHint>
          </p>
        </div>

        {rtFormSuccess !== null ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            {rtFormSuccess}
          </p>
        ) : null}

        {selectedPropertyId === null ? (
          <p className="text-sm text-muted-foreground">
            Выберите отель в шапке, чтобы добавить или просмотреть типы номеров.
          </p>
        ) : !canManage ? (
          <p className="text-sm text-muted-foreground">
            Создание типов номеров доступно ролям owner и manager.
          </p>
        ) : (
          <>
            <Button
              type="button"
              onClick={() => {
                setRtFormError(null);
                setRtDialogOpen(true);
              }}
            >
              Добавить тип номера
            </Button>

            <div>
              <h4 className="mb-2 text-xs font-medium text-muted-foreground">
                Уже созданные
              </h4>
              <SettingsRoomTypesTable
                roomTypes={roomTypes}
                isPending={roomTypesPending}
                isError={roomTypesError}
              />
            </div>
          </>
        )}
      </section>

      <Dialog open={rtDialogOpen} onOpenChange={setRtDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Новый тип номера</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => void handleCreateRoomType(e)}
          >
            {rtFormError !== null ? (
              <p className="text-sm text-destructive" role="alert">
                {rtFormError}
              </p>
            ) : null}
            <div className="space-y-2">
              <label htmlFor="rt-name" className="text-sm font-medium">
                Название категории
              </label>
              <Input
                id="rt-name"
                value={rtName}
                onChange={(e) => {
                  setRtName(e.target.value);
                }}
                placeholder="Стандарт"
                autoComplete="off"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label htmlFor="rt-base" className="text-sm font-medium">
                  Базовая вместимость
                </label>
                <Input
                  id="rt-base"
                  type="number"
                  min={1}
                  value={rtBase}
                  onChange={(e) => {
                    setRtBase(e.target.value);
                  }}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="rt-max" className="text-sm font-medium">
                  Макс. вместимость
                </label>
                <Input
                  id="rt-max"
                  type="number"
                  min={1}
                  value={rtMax}
                  onChange={(e) => {
                    setRtMax(e.target.value);
                  }}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setRtDialogOpen(false);
                }}
              >
                Отмена
              </Button>
              <Button
                type="submit"
                disabled={createRoomTypeMutation.isPending}
              >
                {createRoomTypeMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : null}
                {createRoomTypeMutation.isPending
                  ? "Создаём…"
                  : "Создать тип номера"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <section className="space-y-3 rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">Роли и права</h3>
        <p className="text-sm text-muted-foreground">
          Справочное описание модели доступа OpenPMS (настройка через приглашение
          пользователей ниже).
        </p>
        <ul className="space-y-2 text-sm text-foreground">
          <li>
            <span className="font-medium">Владелец</span> — полный доступ к
            отелям, тарифам, пользователям и интеграциям.
          </li>
          <li>
            <span className="font-medium">Менеджер</span> — операционное
            управление бронями, номерами, тарифами; без смены владельца тенанта.
          </li>
          <li>
            <span className="font-medium">Рецепция</span> — брони, гости,
            фолио, сетка размещения.
          </li>
          <li>
            <span className="font-medium">Горничные</span> — статусы уборки и
            канбан Housekeeping.
          </li>
          <li>
            <span className="font-medium">Наблюдатель</span> — только чтение
            согласованных разделов.
          </li>
        </ul>
      </section>
      <SettingsUsersSection canManage={canManage} />
      <SettingsApiKeysSection canManage={canManage} />
      <SettingsWebhooksSection canManage={canManage} />
    </div>
  );
}
