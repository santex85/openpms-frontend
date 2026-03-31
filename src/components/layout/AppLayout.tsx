import { Menu, Moon, Sun } from "lucide-react";
import { useState, type ReactNode } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { logoutSession } from "@/api/auth";
import { PropertySwitcher } from "@/components/layout/PropertySwitcher";
import { Button } from "@/components/ui/button";
import { usePrefetchBoardData } from "@/hooks/usePrefetchBoardData";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/stores/theme-store";

const navItems: { to: string; label: string }[] = [
  { to: "/", label: "Dashboard" },
  { to: "/board", label: "Сетка" },
  { to: "/bookings", label: "Брони" },
  { to: "/guests", label: "Гости" },
  { to: "/rates", label: "Тарифы" },
  { to: "/rooms", label: "Номера" },
  { to: "/housekeeping", label: "Housekeeping" },
  { to: "/settings", label: "Настройки" },
];

function NavClasses(isActive: boolean): string {
  return cn(
    "shrink-0 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors md:px-3 md:py-2",
    isActive
      ? "bg-accent text-accent-foreground"
      : "text-muted-foreground hover:bg-muted hover:text-foreground"
  );
}

function MainNavLinks(props: { onNavigate?: () => void }): ReactNode {
  const { onNavigate } = props;
  return (
    <>
      {navItems.map((item) => (
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

export function AppLayout() {
  usePrefetchBoardData();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const themeMode = useThemeStore((s) => s.mode);
  const toggleTheme = useThemeStore((s) => s.toggle);

  function handleLogout(): void {
    logoutSession();
    navigate("/login", { replace: true });
  }

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
            <MainNavLinks />
          </nav>
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:flex-nowrap md:flex-initial md:shrink-0">
            <PropertySwitcher />
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={handleLogout}
            >
              Выйти
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
