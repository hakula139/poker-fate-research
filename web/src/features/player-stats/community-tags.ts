/// Canonical community tag list in display order. The `CommunityTag` union is
/// derived from this tuple, so adding or reordering a tag happens in one place.
export const communityTags = [
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
] as const;

export type CommunityTag = (typeof communityTags)[number];

/// Public display threshold: a community tag is surfaced once this many distinct
/// voters agree. Shared with the Worker, which gates the same value in SQL.
export const communityTagThreshold = 3;
