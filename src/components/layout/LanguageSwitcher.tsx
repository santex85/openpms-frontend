import { useTranslation } from "react-i18next";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SUPPORTED_LANGS,
  UI_SELECTABLE_LANGS,
  isUISelectableLang,
  type SupportedLang,
  type UISelectableLang,
} from "@/i18n";
import { cn } from "@/lib/utils";

function isSupportedLang(code: string): code is SupportedLang {
  return (SUPPORTED_LANGS as readonly string[]).includes(code);
}

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const lang = (i18n.language ?? "ru").split("-")[0] ?? "ru";
  const normalized = isSupportedLang(lang) ? lang : "ru";
  const value: UISelectableLang = isUISelectableLang(normalized)
    ? normalized
    : "ru";

  return (
    <Select
      value={value}
      onValueChange={(v) => {
        void i18n.changeLanguage(v as UISelectableLang);
      }}
    >
      <SelectTrigger
        className={cn("h-8 w-[4.25rem] shrink-0 px-2 text-xs font-medium")}
        aria-label={t("lang.label")}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent align="end">
        {UI_SELECTABLE_LANGS.map((code) => (
          <SelectItem key={code} value={code}>
            {t(`lang.${code}`)}
          </SelectItem>
        ))}
        {SUPPORTED_LANGS.filter(
          (code) => !(UI_SELECTABLE_LANGS as readonly string[]).includes(code)
        ).map((code) => (
          <SelectItem key={code} value={code} disabled className="text-muted-foreground">
            {t(`lang.${code}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
