import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import { ONBOARDING_STEPS } from "@/components/onboarding/onboardingSteps";
import { Button } from "@/components/ui/button";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { ONBOARDING_STEP_STORAGE_KEY } from "@/lib/constants";
import { cn } from "@/lib/utils";

function readStepIndex(): number {
  try {
    const raw = localStorage.getItem(ONBOARDING_STEP_STORAGE_KEY);
    const n = raw === null ? 0 : Number.parseInt(raw, 10);
    if (
      Number.isFinite(n) &&
      n >= 0 &&
      n < ONBOARDING_STEPS.length
    ) {
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

export type OnboardingChecklistVariant = "page" | "modal";

export interface OnboardingChecklistProps {
  variant: OnboardingChecklistVariant;
  /** After user clicks a step action link (close modal, etc.). */
  onStepNavigate?: () => void;
  /** After «Пропустить» or when leaving via skip link from modal. */
  onDismiss?: () => void;
}

export function OnboardingChecklist({
  variant,
  onStepNavigate,
  onDismiss,
}: OnboardingChecklistProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { stepDone, allDone } = useOnboardingProgress();

  const [activeStep, setActiveStep] = useState(() => readStepIndex());

  useEffect(() => {
    writeStepIndex(activeStep);
  }, [activeStep]);

  const goNextIncomplete = useCallback(() => {
    const next = stepDone.findIndex((d) => !d);
    if (next === -1) {
      onDismiss?.();
      navigate("/", { replace: true });
      return;
    }
    setActiveStep(next);
  }, [navigate, onDismiss, stepDone]);

  const handleSkipClick = useCallback(() => {
    onDismiss?.();
  }, [onDismiss]);

  const intro =
    variant === "page" ? (
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t("onboarding.pageTitle")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("onboarding.pageSubtitle")}
        </p>
      </div>
    ) : null;

  return (
    <div
      className={cn(
        "space-y-6",
        variant === "page" && "mx-auto max-w-2xl space-y-8"
      )}
    >
      {intro}

      <ol className="space-y-3">
        {ONBOARDING_STEPS.map((step, index) => {
          const done = stepDone[index];
          const isActive = index === activeStep;
          return (
            <li key={step.titleKey}>
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
                      {t(step.titleKey)}
                    </span>
                  </div>
                  {done ? (
                    <span className="text-xs font-medium text-muted-foreground">
                      {t("onboarding.done")}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground pl-9">
                  {t(step.descriptionKey)}
                </p>
                <div className="pl-9">
                  <Button variant="outline" size="sm" asChild>
                    <Link
                      to={step.href}
                      onClick={() => {
                        onStepNavigate?.();
                      }}
                    >
                      {t(step.actionKey)}
                    </Link>
                  </Button>
                </div>
              </button>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={goNextIncomplete}>
          {allDone ? t("onboarding.toDashboard") : t("onboarding.nextIncomplete")}
        </Button>
        <Button type="button" variant="ghost" asChild>
          <Link to="/" onClick={handleSkipClick}>
            {t("onboarding.skip")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
