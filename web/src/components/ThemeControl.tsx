import { themeModes, type ThemeMode } from '../theme';

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
      <div
        className="flex rounded-md border border-[#cbd6cc] bg-white p-1 dark:border-[#40594f] dark:bg-[#14201b]"
        aria-label="Theme"
      >
        {themeModes.map((mode) => (
          <button
            aria-pressed={mode.id === themeMode}
            className={`min-h-8 rounded px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-[#23527c]/35 ${
              mode.id === themeMode
                ? 'bg-[#23527c] text-white'
                : 'text-[#304139] hover:bg-[#eef4f0] dark:text-[#c8d6d0] dark:hover:bg-[#1d2c26]'
            }`}
            key={mode.id}
            type="button"
            onClick={() => onThemeModeChange(mode.id)}
          >
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  );
}
