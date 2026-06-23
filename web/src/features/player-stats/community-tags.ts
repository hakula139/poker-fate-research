import type { CommunityTag } from '@/types';

/// Public display threshold: a community tag is surfaced once this many distinct
/// voters agree. Kept in sync with the Worker constant of the same value.
export const communityTagThreshold = 10;

export const communityTagOrder: CommunityTag[] = [
  'Bluff-heavy',
  'Tilts easily',
  'Hero caller',
  'Slow-roller',
  'Limper',
  'Overfolds',
  'Overplays',
  'Min-raiser',
  'Blind stealer',
  'Bumhunter',
  'Donk bettor',
];
