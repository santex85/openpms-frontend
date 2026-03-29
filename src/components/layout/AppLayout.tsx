import { Menu } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { logoutSession } from "@/api/auth";
import { PropertySwitcher } from "@/components/layout/PropertySwitcher";
import { Button } from "@/components/ui/button";
import { usePrefetchBoardData } from "@/hooks/usePrefetchBoardData";
import { cn } from "@/lib/utils";

const navItems: { to: string; label: string }[] = [
  { to: "/", label: "Dashboard" },
  { to: "/board", label: "Шахматка" },
  { to: "/bookings", label: "Брони" },
  { to: "/guests", label: "Гости" },
  { to: "/rates", label: "Тарифы" },
  { to: "/rooms", label: "Номера" },
  { to: "/housekeeping", label: "Housekeeping" },
  { to: "/settings", label: "Настройки" },
];

function NavClasses(isActive: boolean): string {
  return cn(
    "whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-accent text-accent-foreground"
      : "text-muted-foreground hover:bg-muted hover:text-foreground"
  );
}

export function AppLayout() {
  usePrefetchBoardData();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout(): void {
    logoutSession();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-border bg-card md:flex">
        <div className="border-b border-border px-4 py-4">
          <span className="text-sm font-semibold tracking-tight text-foreground">
            OpenPMS
          </span>
        </div>
        <nav className="flex flex-col gap-0.5 p-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => NavClasses(isActive)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="flex h-14 items-center gap-2 border-b border-border px-3 md:hidden">
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
            <span className="text-sm font-semibold text-foreground">
              OpenPMS
            </span>
          </div>
          {mobileOpen ? (
            <nav className="flex max-h-[50vh] flex-col gap-0.5 overflow-y-auto border-b border-border p-2 md:hidden">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === "/"}
                  onClick={() => {
                    setMobileOpen(false);
                  }}
                  className={({ isActive }) => NavClasses(isActive)}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          ) : null}
          <div className="flex h-14 flex-wrap items-center justify-between gap-2 px-4 py-2 sm:px-6">
            <h1 className="text-sm font-medium text-muted-foreground">
              Панель управления
            </h1>
            <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
              <PropertySwitcher />
              <Button
                type="button"
                variant="outline"
                size="sm"
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
    </div>
  );
}
