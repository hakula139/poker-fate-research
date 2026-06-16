import { readString, storageKeys, writeString } from './storage';

export type ThemeMode = 'system' | 'light' | 'dark';

export const themeModeIds: ThemeMode[] = ['system', 'light', 'dark'];

export function getInitialTheme(): ThemeMode {
  const stored = readString(storageKeys.themeMode);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
}

export function writeThemeMode(mode: ThemeMode): void {
  writeString(storageKeys.themeMode, mode);
}
