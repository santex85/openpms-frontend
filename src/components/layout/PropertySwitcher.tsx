import { useEffect } from "react";
import { Link } from "react-router-dom";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProperties } from "@/hooks/useProperties";
import { usePropertyStore } from "@/stores/property-store";

export function PropertySwitcher() {
  const { data: properties, isLoading, isError } = useProperties();
  const selectedPropertyId = usePropertyStore((s) => s.selectedPropertyId);
  const setSelectedPropertyId = usePropertyStore(
    (s) => s.setSelectedPropertyId
  );

  useEffect(() => {
    if (properties === undefined || properties.length === 0) return;
    const ids = new Set(properties.map((p) => p.id));

    if (selectedPropertyId !== null && !ids.has(selectedPropertyId)) {
      setSelectedPropertyId(properties[0].id);
      return;
    }
    if (selectedPropertyId === null) {
      setSelectedPropertyId(properties[0].id);
    }
  }, [properties, selectedPropertyId, setSelectedPropertyId]);

  if (isLoading) {
    return (
      <div
        className="h-9 w-[220px] animate-pulse rounded-md bg-muted"
        aria-hidden
      />
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Не удалось загрузить отели
      </p>
    );
  }

  if (properties === undefined || properties.length === 0) {
    return (
      <span className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        Нет отелей
        <Link
          to="/settings#properties-hotels"
          className="text-primary underline underline-offset-2"
        >
          Добавить отель
        </Link>
      </span>
    );
  }

  const propertyIds = new Set(properties.map((p) => p.id));
  const selectValue =
    selectedPropertyId !== null && propertyIds.has(selectedPropertyId)
      ? selectedPropertyId
      : properties[0].id;

  return (
    <Select value={selectValue} onValueChange={setSelectedPropertyId}>
      <SelectTrigger className="w-[220px]" aria-label="Выбор отеля">
        <SelectValue placeholder="Выберите отель" />
      </SelectTrigger>
      <SelectContent>
        {properties.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
