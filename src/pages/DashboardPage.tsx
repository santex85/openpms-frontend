import { useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { apiClient } from "@/lib/api";

export function DashboardPage() {
  const [requestStatus, setRequestStatus] = useState<string | null>(null);

  async function handleProbeRequest(): Promise<void> {
    setRequestStatus("…");
    try {
      await apiClient.get("/__openpms_probe", {
        validateStatus: () => true,
      });
      setRequestStatus("Запрос отправлен — проверьте вкладку Network (Authorization).");
    } catch {
      setRequestStatus("Запрос отправлен — проверьте вкладку Network (Authorization).");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Dashboard</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Обзор и быстрые действия. Календарь размещений и остатки по дням — на
          странице{" "}
          <Link
            to="/board"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Шахматка
          </Link>
          .
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <Dialog>
          <DialogTrigger asChild>
            <Button type="button" variant="outline">
              Открыть модалку (Dialog)
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Пример модального окна</DialogTitle>
              <DialogDescription>
                Компонент Dialog из shadcn/ui подключён и готов к использованию.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button">Понятно</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <Button type="button" variant="secondary" onClick={handleProbeRequest}>
          Отправить тестовый запрос (Axios)
        </Button>
      </div>
      {requestStatus !== null ? (
        <p className="text-sm text-muted-foreground">{requestStatus}</p>
      ) : null}
    </div>
  );
}
