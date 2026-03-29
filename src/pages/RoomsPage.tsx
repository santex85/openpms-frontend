import { useRooms } from "@/hooks/useRooms";
import { usePropertyStore } from "@/stores/property-store";

export function RoomsPage() {
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const { data: rooms, isPending, isError } = useRooms();

  if (selectedPropertyId === null) {
    return (
      <p className="text-sm text-muted-foreground">
        Выберите отель в шапке.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Номера</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Физические номера выбранного отеля (GET /rooms).
        </p>
      </div>
      {isError ? (
        <p className="text-sm text-destructive">Не удалось загрузить номера.</p>
      ) : isPending ? (
        <div className="h-40 animate-pulse rounded-md bg-muted" aria-hidden />
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full min-w-[400px] text-left text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-3 py-2 font-medium">Название</th>
                <th className="px-3 py-2 font-medium">Тип номера (id)</th>
              </tr>
            </thead>
            <tbody>
              {(rooms ?? []).map((r) => (
                <tr key={r.id} className="border-b border-border/80">
                  <td className="px-3 py-2">{r.name}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    {r.room_type_id}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
