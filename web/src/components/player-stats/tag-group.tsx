import type { VariantProps } from 'class-variance-authority';

import { Badge, type badgeVariants } from '@/components/ui/badge';
import { classifyPlayer } from '@/features/player-stats/tagging';
import { useI18n } from '@/i18n';
import type { GameStats, OverlayTag, PostflopTag, PreflopTag } from '@/types';

type PlayerTag = PreflopTag | PostflopTag | OverlayTag;
type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

const tagVariants: Record<PlayerTag, BadgeVariant> = {
  'Sample too low': 'secondary',
  'Nit': 'outline',
  'TAG': 'info',
  'Tight-passive': 'warning',
  'LAG': 'info',
  'Loose-balanced': 'success',
  'Loose-passive': 'warning',
  'Maniac': 'danger',
  'Fit-or-fold': 'warning',
  'Showdown caller': 'warning',
  'Showdown-heavy': 'warning',
  'Postflop passive': 'secondary',
  'Postflop aggressor': 'danger',
  'Postflop balanced': 'success',
  '3-Bet pressure': 'danger',
  'Low 3-Bet': 'outline',
  'Low C-Bet': 'secondary',
};

function PlayerTagChip({ tag }: { tag: PlayerTag }) {
  const { t } = useI18n();

  return (
    <Badge
      variant={tagVariants[tag]}
      className="min-h-6 rounded-full px-2.5 font-bold"
    >
      {t.tags[tag]}
    </Badge>
  );
}

export function TagGroup({ stats }: { stats: GameStats | undefined }) {
  const tags = classifyPlayer(stats);
  const values =
    tags.preflop === 'Sample too low'
      ? [tags.preflop]
      : [tags.preflop, tags.postflop, ...tags.overlays];
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((tag) => (
        <PlayerTagChip
          tag={tag}
          key={tag}
        />
      ))}
    </div>
  );
}
