import { describe, expect, it } from 'vitest';

import { communityTagOrder, communityTagThreshold } from './community-tags';

describe('community tag presets', () => {
  it('keeps presets in display order without duplicates', () => {
    expect(communityTagOrder).toEqual([
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
    ]);
    expect(new Set(communityTagOrder).size).toBe(communityTagOrder.length);
  });

  it('uses the public display threshold shared with the worker', () => {
    expect(communityTagThreshold).toBe(10);
  });
});
