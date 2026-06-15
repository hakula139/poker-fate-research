import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

import { themeModes, type ThemeMode } from '../theme';

const themeIcons = {
  system: MonitorIcon,
  light: SunIcon,
  dark: MoonIcon,
};

export function ThemeControl({
  labelClass,
  themeMode,
  onThemeModeChange,
}: {
  labelClass: string;
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <span className={labelClass}>Theme</span>
      <ToggleGroup
        type="single"
        value={themeMode}
        onValueChange={(mode) => {
          if (mode) {
            onThemeModeChange(mode as ThemeMode);
          }
        }}
        aria-label="Theme"
      >
        {themeModes.map((mode) => {
          const Icon = themeIcons[mode.id];
          return (
            <ToggleGroupItem value={mode.id} key={mode.id} aria-label={mode.label} size="sm">
              <Icon />
              {mode.label}
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </div>
  );
}
