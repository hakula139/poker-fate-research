export const storageKeys = {
  locale: 'poker-fate.locale',
  themeMode: 'poker-fate.theme-mode',
  voterId: 'poker-fate.voter-id',
} as const;

export type StorageKey = (typeof storageKeys)[keyof typeof storageKeys];

export function readString(key: StorageKey): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeString(key: StorageKey, value: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore unavailable storage; the app can continue with in-memory defaults.
  }
}

/// Returns a stable anonymous voter id, generating and persisting one on first use.
export function getVoterId(): string {
  const existing = readString(storageKeys.voterId);
  if (existing && existing.length >= 8) {
    return existing;
  }

  const id = crypto.randomUUID();
  writeString(storageKeys.voterId, id);
  return id;
}
