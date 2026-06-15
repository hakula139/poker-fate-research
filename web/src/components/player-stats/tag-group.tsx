import type { VariantProps } from 'class-variance-authority';

import { Badge, type badgeVariants } from '@/components/ui/badge';
import { classifyPlayer } from '@/tagging';
import type { GameStats, PostflopTag, PreflopTag } from '@/types';

type PlayerTag = PreflopTag | PostflopTag;
type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;

const tagVariants: Record<PlayerTag, BadgeVariant> = {
  'Sample too low': 'secondary',
  Nit: 'outline',
  TAG: 'info',
  'Tight-passive': 'warning',
  LAG: 'info',
  'Loose-balanced': 'success',
  'Loose-passive': 'warning',
  Maniac: 'danger',
  'Fit-or-fold': 'warning',
  'Showdown caller': 'warning',
  'Showdown-heavy': 'warning',
  'Postflop passive': 'secondary',
  'Postflop aggressor': 'danger',
  'Postflop balanced': 'success',
};

function PlayerTagChip({ tag }: { tag: PlayerTag }) {
  return (
    <Badge variant={tagVariants[tag]} className="min-h-6 rounded-full px-2.5 font-bold">
      {tag}
    </Badge>
  );
}

export function TagGroup({ stats }: { stats: GameStats | undefined }) {
  const tags = classifyPlayer(stats);
  const values =
    tags.preflop === 'Sample too low' ? [tags.preflop] : [tags.preflop, tags.postflop];
  return (
    <div className="flex flex-wrap gap-1.5">
      {values.map((tag) => (
        <PlayerTagChip tag={tag} key={tag} />
      ))}
    </div>
  );
}
