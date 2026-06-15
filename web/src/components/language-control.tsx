import { LanguagesIcon } from 'lucide-react';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { localeOptions, useI18n, type Locale } from '@/i18n';

export function LanguageControl({ labelClass }: { labelClass: string }) {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="grid gap-1.5">
      <span className={labelClass}>{t.controls.language}</span>
      <ToggleGroup
        type="single"
        value={locale}
        onValueChange={(value) => {
          if (value) {
            setLocale(value as Locale);
          }
        }}
        aria-label={t.controls.language}
      >
        {localeOptions.map((option) => (
          <ToggleGroupItem value={option.id} key={option.id} aria-label={t.languages[option.id]} size="sm">
            <LanguagesIcon />
            {t.languages[option.id]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}
