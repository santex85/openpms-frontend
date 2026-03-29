import { FormEvent, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateRoom } from "@/hooks/useCreateRoom";
import { useRoomTypes } from "@/hooks/useRoomTypes";
import { useRooms } from "@/hooks/useRooms";
import { canManagePropertiesFromToken } from "@/lib/jwtPayload";
import { usePropertyStore } from "@/stores/property-store";
import type { RoomCreate } from "@/types/api";

const ROOM_STATUS_PRESETS = [
  { value: "available", label: "Доступен" },
  { value: "maintenance", label: "Обслуживание" },
  { value: "out_of_order", label: "Не продаётся" },
] as const;

function formatRoomMutationError(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data !== undefined) {
    const data = err.response.data as { detail?: unknown };
    if (typeof data.detail === "string") {
      return data.detail;
    }
    if (Array.isArray(data.detail)) {
      const parts = data.detail.map((item) => {
        if (typeof item === "object" && item !== null && "msg" in item) {
          return String((item as { msg: string }).msg);
        }
        return "";
      });
      const joined = parts.filter(Boolean).join("; ");
      if (joined !== "") {
        return joined;
      }
    }
    if (err.response.status === 403) {
      return "Недостаточно прав: создание номеров доступно ролям owner и manager.";
    }
  }
  return "Не удалось создать номер.";
}

export function RoomsPage() {
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const canManage = canManagePropertiesFromToken();
  const { data: rooms, isPending, isError } = useRooms();
  const {
    data: roomTypes,
    isPending: typesPending,
    isError: typesError,
  } = useRoomTypes();
  const createMutation = useCreateRoom();

  const [roomTypeId, setRoomTypeId] = useState<string>("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<string>(ROOM_STATUS_PRESETS[0].value);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  if (selectedPropertyId === null) {
    return (
      <p className="text-sm text-muted-foreground">
        Выберите отель в шапке.
      </p>
    );
  }

  const typesReady =
    !typesPending && !typesError && roomTypes !== undefined;
  const hasRoomTypes = typesReady && roomTypes.length > 0;

  async function handleCreateRoom(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (roomTypeId === "") {
      setFormError("Выберите тип номера.");
      return;
    }
    const trimmedName = name.trim();
    if (trimmedName === "") {
      setFormError("Введите название или номер комнаты.");
      return;
    }

    const body: RoomCreate = {
      room_type_id: roomTypeId,
      name: trimmedName,
      status,
    };

    try {
      await createMutation.mutateAsync(body);
      setFormSuccess("Номер создан.");
      setName("");
    } catch (err) {
      setFormError(formatRoomMutationError(err));
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Номера</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Физические номера выбранного отеля (GET /rooms). Создание: POST /rooms.
        </p>
      </div>

      {canManage ? (
        typesError ? (
          <p className="text-sm text-destructive">
            Не удалось загрузить типы номеров.
          </p>
        ) : typesPending ? (
          <div className="h-24 animate-pulse rounded-md bg-muted" aria-hidden />
        ) : !hasRoomTypes ? (
          <p className="text-sm text-muted-foreground">
            Сначала добавьте хотя бы один тип номера (категорию).{" "}
            <Link
              to="/settings#room-types-hint"
              className="text-primary underline underline-offset-2"
            >
              Подсказка в настройках
            </Link>
            .
          </p>
        ) : (
          <form
            className="max-w-md space-y-4 rounded-lg border border-border bg-card p-4"
            onSubmit={handleCreateRoom}
          >
            {formError !== null ? (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}
            {formSuccess !== null ? (
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                {formSuccess}
              </p>
            ) : null}
            <div className="space-y-2">
              <span className="text-sm font-medium">Тип номера</span>
              <Select
                value={roomTypeId !== "" ? roomTypeId : undefined}
                onValueChange={(v) => {
                  setRoomTypeId(v);
                }}
              >
                <SelectTrigger aria-label="Тип номера">
                  <SelectValue placeholder="Выберите категорию" />
                </SelectTrigger>
                <SelectContent>
                  {roomTypes.map((rt) => (
                    <SelectItem key={rt.id} value={rt.id}>
                      {rt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label htmlFor="room-name" className="text-sm font-medium">
                Название / № комнаты
              </label>
              <Input
                id="room-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                }}
                placeholder="101"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <span className="text-sm font-medium">Статус номера</span>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger aria-label="Статус номера">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROOM_STATUS_PRESETS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Создаём…" : "Создать номер"}
            </Button>
          </form>
        )
      ) : (
        <p className="text-sm text-muted-foreground">
          Создание номеров доступно ролям owner и manager.
        </p>
      )}

      <div>
        <h3 className="mb-2 text-sm font-medium text-foreground">Список</h3>
        {isError ? (
          <p className="text-sm text-destructive">Не удалось загрузить номера.</p>
        ) : isPending ? (
          <div className="h-40 animate-pulse rounded-md bg-muted" aria-hidden />
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-3 py-2 font-medium">Название</th>
                  <th className="px-3 py-2 font-medium">Статус</th>
                  <th className="px-3 py-2 font-medium">Тип (id)</th>
                </tr>
              </thead>
              <tbody>
                {(rooms ?? []).map((r) => (
                  <tr key={r.id} className="border-b border-border/80">
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2">{r.status}</td>
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
    </div>
  );
}
