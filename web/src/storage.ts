export const storageKeys = {
  locale: 'poker-fate.locale',
  themeMode: 'poker-fate.theme-mode',
} as const;

export type StorageKey = (typeof storageKeys)[keyof typeof storageKeys];

export function readString(key: StorageKey): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(key);
}

export function writeString(key: StorageKey, value: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(key, value);
}
