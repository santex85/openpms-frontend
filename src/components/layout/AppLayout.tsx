import { NavLink, Outlet } from "react-router-dom";

import { PropertySwitcher } from "@/components/layout/PropertySwitcher";
import { usePrefetchBoardData } from "@/hooks/usePrefetchBoardData";
import { cn } from "@/lib/utils";

const navItems: { to: string; label: string }[] = [
  { to: "/", label: "Dashboard" },
  { to: "/board", label: "Шахматка" },
  { to: "/settings", label: "Настройки" },
];

export function AppLayout() {
  usePrefetchBoardData();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-56 flex-col border-r border-border bg-card">
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
              className={({ isActive }) =>
                cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between gap-4 border-b border-border bg-background px-6">
          <h1 className="text-sm font-medium text-muted-foreground">
            Панель управления
          </h1>
          <PropertySwitcher />
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
