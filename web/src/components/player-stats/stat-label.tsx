import { useI18n } from '@/i18n';

export type StatLabelId = 'vpip' | 'pfr' | 'threeBet' | 'wtsd' | 'afq' | 'cbet';

export function StatLabel({ id, label }: { id: StatLabelId; label: string }) {
  const { t } = useI18n();

  return (
    <abbr
      className="cursor-help text-inherit no-underline"
      title={t.statDescriptions[id]}
    >
      {label}
    </abbr>
  );
}
