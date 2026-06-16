import { LanguagesIcon } from 'lucide-react';

import { FieldLabel } from '@/components/field-label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useI18n } from '@/i18n';
import { type Locale, localeOptions } from '@/locale';

export function LanguageControl() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="grid gap-1.5">
      <FieldLabel htmlFor="language">{t.controls.language}</FieldLabel>
      <Select
        value={locale}
        onValueChange={(value) => {
          setLocale(value as Locale);
        }}
      >
        <SelectTrigger
          id="language"
          className="min-w-40"
        >
          <LanguagesIcon />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {localeOptions.map((option) => (
            <SelectItem
              value={option.id}
              key={option.id}
            >
              {t.languages[option.id]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
