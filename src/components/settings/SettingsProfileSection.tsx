import axios from "axios";
import { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { patchMeProfile } from "@/api/auth";
import { ApiRouteHint } from "@/components/dev/ApiRouteHint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authQueryKeyPart } from "@/lib/authQueryKey";
import { formatApiError } from "@/lib/formatApiError";
import { toastError, toastSuccess } from "@/lib/toast";
import { useCurrentUserQueryContext } from "@/hooks/useCurrentUserQueryContext";

export function SettingsProfileSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const authKey = authQueryKeyPart();
  const userQ = useCurrentUserQueryContext();
  const user = userQ.data;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    if (user !== undefined) {
      setFullName(user.full_name);
      setEmail(user.email);
    }
  }, [user]);

  const patchMut = useMutation({
    mutationFn: patchMeProfile,
    onSuccess: (next) => {
      void queryClient.invalidateQueries({
        queryKey: ["auth", "me", authKey],
      });
      setFullName(next.full_name);
      setEmail(next.email);
      toastSuccess(t("settings.profile.saved"));
    },
    onError: (err: unknown) => {
      if (axios.isAxiosError(err)) {
        const st = err.response?.status;
        if (st === 404 || st === 405) {
          setUnsupported(true);
          return;
        }
      }
      toastError(formatApiError(err));
    },
  });

  async function onSubmit(e: FormEvent<HTMLFormElement>): Promise<void> {
    e.preventDefault();
    setFormError(null);
    const fn = fullName.trim();
    const em = email.trim();
    if (fn === "") {
      setFormError(t("settings.profile.err.name"));
      return;
    }
    if (em === "") {
      setFormError(t("settings.profile.err.email"));
      return;
    }
    await patchMut.mutateAsync({ full_name: fn, email: em });
  }

  if (userQ.isPending) {
    return (
      <div className="h-24 animate-pulse rounded-md bg-muted" aria-hidden />
    );
  }

  if (userQ.isError || user === undefined) {
    return null;
  }

  return (
    <section id="account-profile" className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground">
          {t("settings.profile.title")}
        </h3>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{t("settings.profile.intro")}</span>
          <ApiRouteHint>PATCH /auth/me</ApiRouteHint>
        </p>
      </div>
      {unsupported ? (
        <p className="text-sm text-amber-800 dark:text-amber-200/90" role="status">
          {t("settings.profile.unsupported")}
        </p>
      ) : null}
      <form className="max-w-md space-y-4" onSubmit={(e) => void onSubmit(e)}>
        {formError !== null ? (
          <p className="text-sm text-destructive" role="alert">
            {formError}
          </p>
        ) : null}
        <div className="space-y-2">
          <label htmlFor="profile-name" className="text-sm font-medium">
            {t("settings.profile.fullName")}
          </label>
          <Input
            id="profile-name"
            value={fullName}
            disabled={unsupported || patchMut.isPending}
            onChange={(ev) => {
              setFullName(ev.target.value);
            }}
            autoComplete="name"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="profile-email" className="text-sm font-medium">
            {t("settings.profile.email")}
          </label>
          <Input
            id="profile-email"
            type="email"
            value={email}
            disabled={unsupported || patchMut.isPending}
            onChange={(ev) => {
              setEmail(ev.target.value);
            }}
            autoComplete="email"
          />
        </div>
        <Button type="submit" disabled={unsupported || patchMut.isPending}>
          {patchMut.isPending ? t("settings.profile.saving") : t("settings.profile.save")}
        </Button>
      </form>
    </section>
  );
}
