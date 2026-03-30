/** Копирование в буфер; при ошибке — проброс для обработки вызывающим. */
export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}
