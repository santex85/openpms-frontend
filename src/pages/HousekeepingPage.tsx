export function HousekeepingPage() {
  const columns = [
    { id: "dirty", title: "Грязный" },
    { id: "cleaning", title: "Убирается" },
    { id: "clean", title: "Чистый" },
    { id: "inspected", title: "Проверен" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Housekeeping</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Канбан-заглушка: на мобильном — горизонтальный скролл колонок.
          Подключение к{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            /housekeeping
          </code>{" "}
          на следующем шаге.
        </p>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-4 md:overflow-visible">
        {columns.map((col) => (
          <div
            key={col.id}
            className="w-[min(85vw,280px)] shrink-0 rounded-md border border-border bg-card p-3 md:w-auto md:shrink"
          >
            <h3 className="text-sm font-semibold text-foreground">{col.title}</h3>
            <p className="mt-3 text-xs text-muted-foreground">
              Перетащите карточки номеров сюда после интеграции API.
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
