import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { Loader2 } from "lucide-react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { useLocation, useSearchParams } from "react-router-dom";
import { ApiRouteHint } from "@/components/dev/ApiRouteHint";
import { SettingsChangePasswordSection } from "@/components/settings/SettingsChangePasswordSection";
import { SettingsApiKeysSection } from "@/components/settings/SettingsApiKeysSection";
import { SettingsUsersSection } from "@/components/settings/SettingsUsersSection";
import { SettingsRoomTypesTable } from "@/components/settings/SettingsRoomTypesTable";
import { SettingsCountryPackSection } from "@/components/settings/SettingsCountryPackSection";
import { SettingsFolioCategoriesSection } from "@/components/settings/SettingsFolioCategoriesSection";
import { SettingsCountryPackExtensionsSection } from "@/components/settings/SettingsCountryPackExtensionsSection";
import { SettingsChannexSection } from "@/components/settings/SettingsChannexSection";
import { SettingsStripeSection } from "@/components/settings/SettingsStripeSection";
import { TaxConfigCard } from "@/components/settings/TaxConfigCard";
import { SettingsWebhooksSection } from "@/components/settings/SettingsWebhooksSection";
import { EmailSettingsCard } from "@/components/settings/EmailSettingsCard";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isAxiosForbidden } from "@/lib/forbiddenError";
import { toastSuccess } from "@/lib/toast";
import { useQueryClient } from "@tanstack/react-query";

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

type SettingsTab =
  | "account"
  | "property"
  | "billing"
  | "notifications"
  | "team"
  | "integrations";

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

function formatPropertyFormError(
  err: unknown,
  mode: "create" | "update",
  t: TFunction
): string {
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
        ? t("settings.err.forbiddenPropertyCreate")
        : t("settings.err.forbiddenPropertyUpdate");
    }
    if (err.response.status === 405 && mode === "update") {
      return t("settings.err.propertyPatch405");
    }
  }
  return mode === "create"
    ? t("settings.err.propertyCreateFailed")
    : t("settings.err.propertyUpdateFailed");
}

function formatRoomTypeMutationError(err: unknown, t: TFunction): string {
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
      return t("settings.err.forbiddenRoomTypeCreate");
    }
    if (err.response.status === 404) {
      return t("settings.err.propertyNotFound");
    }
  }
  return t("settings.err.roomTypeCreateFailed");
}

export function SettingsPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const stripeOauthHandled = useRef(false);
  const canManage = useCanManageProperties();

  useEffect(() => {
    if (searchParams.get("connected") !== "1") {
      stripeOauthHandled.current = false;
      return;
    }
    if (stripeOauthHandled.current) {
      return;
    }
    stripeOauthHandled.current = true;
    toastSuccess(t("stripe.oauthSuccess"));
    void queryClient.invalidateQueries({ queryKey: ["stripe"] });
    const next = new URLSearchParams(searchParams);
    next.delete("connected");
    next.delete("property_id");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, queryClient, t]);
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
      setRtFormError(t("settings.err.selectPropertyHeader"));
      return;
    }

    const nameTrim = rtName.trim();
    if (nameTrim === "") {
      setRtFormError(t("settings.err.categoryNameRequired"));
      return;
    }

    const base = Number.parseInt(rtBase, 10);
    const max = Number.parseInt(rtMax, 10);
    if (!Number.isFinite(base) || base < 1) {
      setRtFormError(t("settings.err.baseOccupancy"));
      return;
    }
    if (!Number.isFinite(max) || max < 1) {
      setRtFormError(t("settings.err.maxOccupancy"));
      return;
    }
    if (max < base) {
      setRtFormError(t("settings.err.maxLtBase"));
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
      setRtFormSuccess(t("settings.roomTypes.created"));
      setRtName("");
      setRtBase("2");
      setRtMax("4");
      setRtDialogOpen(false);
    } catch (err) {
      setRtFormError(formatRoomTypeMutationError(err, t));
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

  const [settingsTab, setSettingsTab] = useState<SettingsTab>("property");

  useEffect(() => {
    const raw = location.hash.replace(/^#/, "");
    let timerId: number | undefined;

    const scrollToId = (id: string) => {
      timerId = window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 50);
    };

    if (raw === "account-password") {
      setSettingsTab("account");
      scrollToId("account-password");
    } else if (raw === "properties-hotels" || raw === "room-types-hint") {
      setSettingsTab("property");
      scrollToId(raw);
    }

    return () => {
      if (timerId !== undefined) {
        window.clearTimeout(timerId);
      }
    };
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
      setFormError(t("settings.err.tzRequired"));
      return;
    }

    const cur = currency.trim().toUpperCase();
    if (cur.length !== 3) {
      setFormError(t("settings.err.currencyInvalid"));
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
      setFormError(t("settings.err.propertyNameRequired"));
      return;
    }

    try {
      if (selectedPropertyId !== null) {
        await updateMutation.mutateAsync({
          propertyId: selectedPropertyId,
          body,
        });
        setFormSuccess(t("settings.success.propertySaved"));
      } else {
        await createMutation.mutateAsync(body);
        setFormSuccess(t("settings.success.propertyCreated"));
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
          selectedPropertyId !== null ? "update" : "create",
          t
        )
      );
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          {t("settings.title")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("settings.subtitle")}
        </p>
      </div>

      <Tabs
        value={settingsTab}
        onValueChange={(v) => {
          setSettingsTab(v as SettingsTab);
        }}
        className="w-full"
      >
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:inline-flex sm:h-9 sm:w-auto sm:flex-nowrap sm:flex-wrap">
          <TabsTrigger value="account" className="flex-1 sm:flex-initial">
            {t("settings.tab.account")}
          </TabsTrigger>
          <TabsTrigger value="property" className="flex-1 sm:flex-initial">
            {t("settings.tab.property")}
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex-1 sm:flex-initial">
            {t("settings.tab.billing")}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex-1 sm:flex-initial">
            {t("settings.tab.notifications")}
          </TabsTrigger>
          <TabsTrigger value="team" className="flex-1 sm:flex-initial">
            {t("settings.tab.team")}
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex-1 sm:flex-initial">
            {t("settings.tab.integrations")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-6">
          <SettingsChangePasswordSection />
        </TabsContent>

        <TabsContent value="property" className="space-y-6">
      <section
        id="properties-hotels"
        className="space-y-4 rounded-lg border border-border bg-card p-4"
      >
        <h3 className="text-sm font-semibold text-foreground">
          {t("settings.property.sectionTitle")}
        </h3>
        {!canManage ? (
          <p className="text-sm text-muted-foreground">
            {t("settings.property.noPermission")}
          </p>
        ) : (
          <form
            className="max-w-md space-y-4"
            onSubmit={(e) => void handlePropertyForm(e)}
          >
            <p className="text-sm text-muted-foreground">
              {t("settings.property.timezoneIntro")}
              <a
                className="text-primary underline underline-offset-2"
                href="https://en.wikipedia.org/wiki/List_of_tz_database_time_zones"
                target="_blank"
                rel="noreferrer"
              >
                {t("settings.property.timezoneLink")}
              </a>
              ).{" "}
              {selectedPropertyId !== null ? (
                <>
                  {t("settings.property.editHint")}{" "}
                  <ApiRouteHint>PATCH /properties/{"{"}id{"}"}</ApiRouteHint>{" "}
                  <ApiRouteHint>GET /properties</ApiRouteHint>
                </>
              ) : (
                <>
                  {t("settings.property.createHint")}{" "}
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
                {t("settings.property.nameLabel")}
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
              <span className="text-sm font-medium">
                {t("settings.property.timezoneLabel")}
              </span>
              <Select
                key={selectedPropertyId ?? "new-property"}
                value={timezoneMode}
                onValueChange={(v) => {
                  setTimezoneMode(v);
                }}
              >
                <SelectTrigger aria-label={t("settings.property.timezoneAria")}>
                  <SelectValue
                    placeholder={t("settings.property.timezonePlaceholder")}
                  />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONE_PRESETS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                  <SelectItem value={CUSTOM_TZ}>
                    {t("settings.property.timezoneCustom")}
                  </SelectItem>
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
                {t("settings.property.currencyLabel")}
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
                  {t("settings.property.checkin")}
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
                  {t("settings.property.checkout")}
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
                  ? t("settings.property.submitSaving")
                  : t("settings.property.submitSave")
                : createMutation.isPending
                  ? t("settings.property.submitCreating")
                  : t("settings.property.submitCreate")}
            </Button>
          </form>
        )}
      </section>
      <SettingsCountryPackSection />
      {canManage ? <SettingsFolioCategoriesSection /> : null}
      <section
        id="room-types-hint"
        className="space-y-4 rounded-lg border border-border bg-card p-4"
      >
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {t("settings.roomTypes.sectionTitle")}
            {selectedPropertyName !== null ? (
              <span className="ml-2 font-normal text-muted-foreground">
                {" "}
                ({selectedPropertyName})
              </span>
            ) : null}
          </h3>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{t("settings.roomTypes.intro")}</span>
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
            {t("settings.roomTypes.pickProperty")}
          </p>
        ) : !canManage ? (
          <p className="text-sm text-muted-foreground">
            {t("settings.roomTypes.noPermission")}
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
              {t("settings.roomTypes.addButton")}
            </Button>

            <div>
              <h4 className="mb-2 text-xs font-medium text-muted-foreground">
                {t("settings.roomTypes.existingLabel")}
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
            <DialogTitle>{t("settings.roomTypes.dialogNewTitle")}</DialogTitle>
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
                {t("settings.roomTypes.categoryName")}
              </label>
              <Input
                id="rt-name"
                value={rtName}
                onChange={(e) => {
                  setRtName(e.target.value);
                }}
                placeholder={t("settings.roomTypes.placeholderStandard")}
                autoComplete="off"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label htmlFor="rt-base" className="text-sm font-medium">
                  {t("settings.roomTypes.baseOccupancy")}
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
                  {t("settings.roomTypes.maxOccupancy")}
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
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={createRoomTypeMutation.isPending}
              >
                {createRoomTypeMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : null}
                {createRoomTypeMutation.isPending
                  ? t("settings.roomTypes.createSubmitting")
                  : t("settings.roomTypes.createSubmit")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <SettingsCountryPackExtensionsSection canManage={canManage} />
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <TaxConfigCard canManage={canManage} />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <EmailSettingsCard canManage={canManage} />
        </TabsContent>

        <TabsContent value="team" className="space-y-6">
      <section className="space-y-3 rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">
          {t("settings.roles.sectionTitle")}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t("settings.roles.intro")}
        </p>
        <ul className="space-y-2 text-sm text-foreground">
          <li>
            <span className="font-medium">{t("role.owner")}</span> —{" "}
            {t("settings.roles.descOwner")}
          </li>
          <li>
            <span className="font-medium">{t("role.manager")}</span> —{" "}
            {t("settings.roles.descManager")}
          </li>
          <li>
            <span className="font-medium">{t("role.receptionist")}</span> —{" "}
            {t("settings.roles.descReception")}
          </li>
          <li>
            <span className="font-medium">{t("role.housekeeping")}</span> —{" "}
            {t("settings.roles.descHousekeeping")}
          </li>
          <li>
            <span className="font-medium">{t("role.viewer")}</span> —{" "}
            {t("settings.roles.descViewer")}
          </li>
        </ul>
      </section>
      <SettingsUsersSection canManage={canManage} />
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
      <SettingsStripeSection canManage={canManage} />
      <SettingsChannexSection canManage={canManage} />
      <SettingsApiKeysSection canManage={canManage} />
      <SettingsWebhooksSection canManage={canManage} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
