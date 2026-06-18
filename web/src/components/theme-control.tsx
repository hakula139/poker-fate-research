import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react';

import { labelClass } from '@/components/field-label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useI18n } from '@/i18n';
import { type ThemeMode, themeModeIds } from '@/theme';

const themeIcons = {
  system: MonitorIcon,
  light: SunIcon,
  dark: MoonIcon,
};

export function ThemeControl({
  themeMode,
  onThemeModeChange,
}: {
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="grid gap-1.5">
      <span className={labelClass}>{t.controls.theme}</span>
      <ToggleGroup
        type="single"
        value={themeMode}
        onValueChange={(mode) => {
          if (mode) {
            onThemeModeChange(mode as ThemeMode);
          }
        }}
        aria-label={t.controls.theme}
      >
        {themeModeIds.map((mode) => {
          const Icon = themeIcons[mode];
          return (
            <ToggleGroupItem
              value={mode}
              key={mode}
              aria-label={t.themes[mode]}
              size="sm"
            >
              <Icon />
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </div>
  );
}
