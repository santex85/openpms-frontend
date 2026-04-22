import { Menu, Moon, Sun, SunMedium } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router-dom";

import { CurrentUserQueryProvider } from "@/contexts/current-user-query-provider";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { BrandMark } from "@/components/brand/BrandMark";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { PropertySwitcher } from "@/components/layout/PropertySwitcher";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/button";
import { usePrefetchBoardData } from "@/hooks/usePrefetchBoardData";
import { useSyncPropertyCountryPack } from "@/hooks/useSyncPropertyCountryPack";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/stores/theme-store";

function buildNavItems(t: (k: string) => string): { to: string; label: string }[] {
  return [
    { to: "/", label: t("nav.overview") },
    { to: "/board", label: t("nav.board") },
    { to: "/bookings", label: t("nav.bookings") },
    { to: "/guests", label: t("nav.guests") },
    { to: "/rates", label: t("nav.rates") },
    { to: "/rooms", label: t("nav.rooms") },
    { to: "/housekeeping", label: t("nav.housekeeping") },
    { to: "/settings", label: t("nav.settings") },
  ];
}

function NavClasses(isActive: boolean): string {
  return cn(
    "shrink-0 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors lg:px-3 lg:py-2",
    isActive
      ? "bg-accent text-accent-foreground"
      : "text-muted-foreground hover:bg-muted hover:text-foreground"
  );
}

function MainNavLinks(props: {
  onNavigate?: () => void;
  items: { to: string; label: string }[];
}): ReactNode {
  const { onNavigate, items } = props;
  return (
    <>
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          onClick={onNavigate}
          className={({ isActive }) => NavClasses(isActive)}
        >
          {item.label}
        </NavLink>
      ))}
    </>
  );
}

function AppLayoutShell() {
  const { t } = useTranslation();
  usePrefetchBoardData();
  useSyncPropertyCountryPack();
  const navItems = useMemo(() => buildNavItems(t), [t]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const themeMode = useThemeStore((s) => s.mode);
  const toggleTheme = useThemeStore((s) => s.toggle);

  const themeLabel =
    themeMode === "light"
      ? t("theme.light")
      : themeMode === "neutral"
        ? t("theme.neutral")
        : t("theme.dark");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 print:hidden">
        <div className="flex h-14 min-h-14 items-center gap-2 px-3 sm:px-6">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0 lg:hidden"
            aria-label={t("nav.menu")}
            aria-expanded={mobileOpen}
            onClick={() => {
              setMobileOpen((o) => !o);
            }}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <span className="flex shrink-0 items-center gap-2 text-sm font-semibold tracking-tight text-foreground">
            <BrandMark className="shrink-0" />
            {t("brand.name")}
          </span>
          <nav
            className="hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto overscroll-x-contain lg:flex"
            aria-label={t("nav.mainSections")}
          >
            <MainNavLinks items={navItems} />
          </nav>
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:flex-nowrap lg:flex-initial lg:shrink-0">
            <LanguageSwitcher />
            <PropertySwitcher />
            <UserMenu />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              aria-label={themeLabel}
              title={t("theme.tooltip", { mode: themeLabel })}
              onClick={() => {
                toggleTheme();
              }}
            >
              {themeMode === "light" ? (
                <Sun className="h-4 w-4" />
              ) : themeMode === "neutral" ? (
                <SunMedium className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        {mobileOpen ? (
          <nav
            className="flex max-h-[50vh] flex-col gap-0.5 overflow-y-auto border-t border-border p-2 lg:hidden"
            aria-label={t("nav.mainSections")}
          >
            <MainNavLinks
              items={navItems}
              onNavigate={() => {
                setMobileOpen(false);
              }}
            />
          </nav>
        ) : null}
      </header>
      <main className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
        <div className="mx-auto w-full max-w-screen-2xl">
          <Outlet />
        </div>
      </main>
      <OnboardingModal />
    </div>
  );
}

export function AppLayout() {
  const currentUserQuery = useCurrentUser();
  return (
    <CurrentUserQueryProvider value={currentUserQuery}>
      <AppLayoutShell />
    </CurrentUserQueryProvider>
  );
}
