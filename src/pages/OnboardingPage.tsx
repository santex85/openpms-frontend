import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { ONBOARDING_STEP_STORAGE_KEY } from "@/lib/constants";
import { useProperties } from "@/hooks/useProperties";
import { useRatePlans } from "@/hooks/useRatePlans";
import { useRoomTypes } from "@/hooks/useRoomTypes";
import { useRooms } from "@/hooks/useRooms";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    title: "Отель",
    description:
      "Создайте первый объект: название, часовой пояс, валюта, время заезда и выезда.",
    href: "/settings#properties-hotels",
    action: "Открыть настройки отеля",
  },
  {
    title: "Типы номеров",
    description:
      "Добавьте хотя бы один тип номера (вместимость, название категории).",
    href: "/settings#room-types-hint",
    action: "Типы номеров в настройках",
  },
  {
    title: "Комнаты",
    description: "Создайте физические номера и привяжите их к типам.",
    href: "/rooms",
    action: "Открыть номера",
  },
  {
    title: "Тарифы и цены",
    description:
      "Добавьте тарифный план и настройте цены для типов номеров на календаре тарифов.",
    href: "/rates",
    action: "Открыть тарифы",
  },
] as const;

function readStepIndex(): number {
  try {
    const raw = localStorage.getItem(ONBOARDING_STEP_STORAGE_KEY);
    const n = raw === null ? 0 : Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n >= 0 && n < STEPS.length) {
      return n;
    }
  } catch {
    /* ignore */
  }
  return 0;
}

function writeStepIndex(i: number): void {
  try {
    localStorage.setItem(ONBOARDING_STEP_STORAGE_KEY, String(i));
  } catch {
    /* ignore */
  }
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const { data: properties } = useProperties();
  const { data: roomTypes } = useRoomTypes();
  const { data: rooms } = useRooms();
  const { data: ratePlans } = useRatePlans();

  const [activeStep, setActiveStep] = useState(() => readStepIndex());

  useEffect(() => {
    writeStepIndex(activeStep);
  }, [activeStep]);

  const hasProperty = (properties?.length ?? 0) > 0;
  const hasRoomTypes = (roomTypes?.length ?? 0) > 0;
  const hasRooms = (rooms?.length ?? 0) > 0;
  const hasRates = (ratePlans?.length ?? 0) > 0;

  const stepDone = useMemo(
    () => [hasProperty, hasRoomTypes, hasRooms, hasRates],
    [hasProperty, hasRoomTypes, hasRooms, hasRates]
  );

  const allDone = stepDone.every(Boolean);

  const goNextIncomplete = useCallback(() => {
    const next = stepDone.findIndex((d) => !d);
    if (next === -1) {
      navigate("/", { replace: true });
      return;
    }
    setActiveStep(next);
  }, [navigate, stepDone]);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Первичная настройка
        </h1>
        <p className="text-sm text-muted-foreground">
          Пройдите шаги по порядку. Прогресс сохраняется в браузере; можно
          вернуться сюда позже из меню выбора отеля.
        </p>
      </div>

      <ol className="space-y-3">
        {STEPS.map((step, index) => {
          const done = stepDone[index];
          const isActive = index === activeStep;
          return (
            <li key={step.title}>
              <button
                type="button"
                onClick={() => {
                  setActiveStep(index);
                }}
                className={cn(
                  "flex w-full flex-col gap-3 rounded-lg border p-4 text-left transition-colors",
                  isActive
                    ? "border-primary bg-accent/30"
                    : "border-border bg-card hover:bg-muted/40"
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                        done
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                      aria-hidden
                    >
                      {done ? "✓" : index + 1}
                    </span>
                    <span className="font-medium text-foreground">
                      {step.title}
                    </span>
                  </div>
                  {done ? (
                    <span className="text-xs font-medium text-muted-foreground">
                      Готово
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground pl-9">
                  {step.description}
                </p>
                <div className="pl-9">
                  <Button variant="outline" size="sm" asChild>
                    <Link to={step.href}>{step.action}</Link>
                  </Button>
                </div>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={goNextIncomplete}>
          {allDone ? "На дашборд" : "К следующему незавершённому"}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link to="/">Пропустить</Link>
        </Button>
      </div>
    </div>
  );
}
