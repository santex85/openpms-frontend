export function GuestsPage() {
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-semibold text-foreground">Гости</h2>
      <p className="text-sm text-muted-foreground">
        Заглушка: список гостей и поиск будут подключены к{" "}
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
          GET /guests
        </code>{" "}
        после согласования фильтров с API.
      </p>
    </div>
  );
}
