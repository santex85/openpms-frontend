export function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Настройки</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Разделы ниже — поэтапное подключение к OpenPMS (пользователи, ключи,
          вебхуки, свойства).
        </p>
      </div>
      <section className="space-y-2 rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">Свойства отеля</h3>
        <p className="text-sm text-muted-foreground">
          Управление отелями доступно через существующий API свойств; расширение
          формы — в бэклоге.
        </p>
      </section>
      <section className="space-y-2 rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">Пользователи</h3>
        <p className="text-sm text-muted-foreground">
          Приглашения:{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            POST /auth/invite
          </code>{" "}
          (роли owner/manager JWT).
        </p>
      </section>
      <section className="space-y-2 rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">API-ключи</h3>
        <p className="text-sm text-muted-foreground">
          Управление интеграционными ключами:{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            /api-keys
          </code>
          .
        </p>
      </section>
      <section className="space-y-2 rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">Вебхуки</h3>
        <p className="text-sm text-muted-foreground">
          Подписки и логи:{" "}
          <code className="rounded bg-muted px-1 font-mono text-xs">
            /webhooks
          </code>
          .
        </p>
      </section>
    </div>
  );
}
