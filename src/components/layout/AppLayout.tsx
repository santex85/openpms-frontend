import { Menu, Moon, Sun } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";

import { CurrentUserQueryProvider } from "@/contexts/current-user-query-provider";
import { PropertySwitcher } from "@/components/layout/PropertySwitcher";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/button";
import { usePrefetchBoardData } from "@/hooks/usePrefetchBoardData";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useCanViewAuditLog } from "@/hooks/useAuthz";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/stores/theme-store";

function buildNavItems(includeAudit: boolean): { to: string; label: string }[] {
  const items: { to: string; label: string }[] = [
    { to: "/", label: "Dashboard" },
    { to: "/board", label: "Сетка" },
    { to: "/bookings", label: "Брони" },
    { to: "/guests", label: "Гости" },
    { to: "/rates", label: "Тарифы" },
    { to: "/rooms", label: "Номера" },
    { to: "/housekeeping", label: "Housekeeping" },
  ];
  if (includeAudit) {
    items.push({ to: "/audit-log", label: "Аудит" });
  }
  items.push({ to: "/settings", label: "Настройки" });
  return items;
}

function NavClasses(isActive: boolean): string {
  return cn(
    "shrink-0 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors md:px-3 md:py-2",
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
  usePrefetchBoardData();
  const canViewAudit = useCanViewAuditLog();
  const navItems = useMemo(() => buildNavItems(canViewAudit), [canViewAudit]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const themeMode = useThemeStore((s) => s.mode);
  const toggleTheme = useThemeStore((s) => s.toggle);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex h-14 items-center gap-2 px-3 md:hidden">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="shrink-0"
            aria-label="Меню"
            aria-expanded={mobileOpen}
            onClick={() => {
              setMobileOpen((o) => !o);
            }}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold tracking-tight text-foreground">
            OpenPMS
          </span>
        </div>
        {mobileOpen ? (
          <nav className="flex max-h-[50vh] flex-col gap-0.5 overflow-y-auto border-t border-border p-2 md:hidden">
            <MainNavLinks
              items={navItems}
              onNavigate={() => {
                setMobileOpen(false);
              }}
            />
          </nav>
        ) : null}
        <div className="flex h-14 min-h-14 items-center gap-2 border-t border-border px-4 sm:px-6 md:border-t-0 md:px-6">
          <span className="hidden shrink-0 text-sm font-semibold tracking-tight text-foreground md:inline">
            OpenPMS
          </span>
          <nav
            className="hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto overscroll-x-contain md:flex"
            aria-label="Основные разделы"
          >
            <MainNavLinks items={navItems} />
          </nav>
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:flex-nowrap md:flex-initial md:shrink-0">
            <PropertySwitcher />
            <UserMenu />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              aria-label={
                themeMode === "dark"
                  ? "Переключить на светлую тему"
                  : "Переключить на тёмную тему"
              }
              onClick={() => {
                toggleTheme();
              }}
            >
              {themeMode === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </header>
      <main className="min-h-0 flex-1 overflow-auto p-4 sm:p-6">
        <Outlet />
      </main>
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
