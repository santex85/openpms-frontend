import { ChevronDown, KeyRound, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { logoutSession } from "@/api/auth";
import { Button } from "@/components/ui/button";
import { useCurrentUserQueryContext } from "@/hooks/useCurrentUserQueryContext";
import { cn } from "@/lib/utils";

export function UserMenu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data: user, isPending, isError } = useCurrentUserQueryContext();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onDoc(e: MouseEvent): void {
      if (
        rootRef.current !== null &&
        !rootRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open]);

  function handleLogout(): void {
    setOpen(false);
    logoutSession();
    navigate("/login", { replace: true });
  }

  if (isPending) {
    return (
      <div
        className="h-8 w-28 animate-pulse rounded-md bg-muted"
        aria-hidden
      />
    );
  }

  if (isError || user === undefined) {
    return null;
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="max-w-[200px] min-w-0 gap-1 pl-2 pr-1"
        title={`${user.full_name}\n${user.email}`}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => {
          setOpen((o) => !o);
        }}
      >
        <span className="min-w-0 truncate text-left font-medium">
          {user.full_name}
        </span>
        <span
          className={cn(
            "rounded bg-muted px-1.5 py-0 text-[10px] font-medium uppercase text-muted-foreground",
            "shrink-0"
          )}
        >
          {user.role}
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
      </Button>
      {open ? (
        <div
          className="absolute right-0 z-50 mt-1 min-w-[200px] rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-md"
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
            onClick={() => {
              setOpen(false);
              navigate("/settings#account-password");
            }}
          >
            <KeyRound className="h-4 w-4 shrink-0 opacity-70" />
            {t("user.changePassword")}
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 shrink-0 opacity-70" />
            {t("user.logout")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
