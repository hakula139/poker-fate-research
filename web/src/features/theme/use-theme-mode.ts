import { useEffect, useState } from 'react';

import { getInitialTheme, type ThemeMode, writeThemeMode } from '@/theme';

export function useThemeMode() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialTheme);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');

    function applyTheme() {
      const dark = themeMode === 'dark' || (themeMode === 'system' && media.matches);
      document.documentElement.classList.toggle('dark', dark);
      document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    }

    writeThemeMode(themeMode);
    applyTheme();
    if (themeMode === 'system') {
      media.addEventListener('change', applyTheme);
      return () => {
        media.removeEventListener('change', applyTheme);
      };
    }
  }, [themeMode]);

  return { setThemeMode, themeMode };
}
