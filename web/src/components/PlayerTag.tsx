import type { PostflopTag, PreflopTag } from '../types';

type PlayerTag = PreflopTag | PostflopTag;
type TagVariant = 'default' | 'blue' | 'green' | 'orange' | 'red' | 'purple' | 'slate';

const tagVariantClasses: Record<TagVariant, string> = {
  default: 'bg-[#e5ece9] text-[#3a554c] dark:bg-[#263933] dark:text-[#bfd8ce]',
  blue: 'bg-[#dfeceb] text-[#174d5b] dark:bg-[#203d44] dark:text-[#b7dde5]',
  green: 'bg-[#e2eadf] text-[#385a31] dark:bg-[#263d2a] dark:text-[#c8e4be]',
  orange: 'bg-[#f0e3d2] text-[#76511e] dark:bg-[#47331d] dark:text-[#f0c987]',
  red: 'bg-[#f2dada] text-[#842d2d] dark:bg-[#4a2727] dark:text-[#f0b4b4]',
  purple: 'bg-[#e8e4f2] text-[#4a3b73] dark:bg-[#332f46] dark:text-[#d7d0f0]',
  slate: 'bg-[#eceff2] text-[#5b6670] dark:bg-[#2b3440] dark:text-[#c8d2dc]',
};

const tagVariants: Record<PlayerTag, TagVariant> = {
  'Sample too low': 'slate',
  Nit: 'purple',
  TAG: 'blue',
  'Tight-passive': 'orange',
  LAG: 'blue',
  'Loose-balanced': 'green',
  'Loose-passive': 'orange',
  Maniac: 'red',
  'Fit-or-fold': 'orange',
  'Showdown caller': 'orange',
  'Showdown-heavy': 'orange',
  'Postflop passive': 'slate',
  'Postflop aggressor': 'red',
  'Postflop balanced': 'default',
};

export function PlayerTagChip({ tag }: { tag: PlayerTag }) {
  return (
    <span
      className={`inline-flex min-h-6 items-center rounded-full px-2.5 text-xs font-extrabold ${tagVariantClasses[tagVariants[tag]]}`}
    >
      {tag}
    </span>
  );
}
