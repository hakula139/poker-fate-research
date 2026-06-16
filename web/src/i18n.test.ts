import { describe, expect, it } from 'vitest';

import { localeFromLanguageTag } from './locale';

describe('locale detection', () => {
  it('maps Simplified Chinese browser locales to zh-Hans', () => {
    expect(localeFromLanguageTag('zh-Hans')).toBe('zh-Hans');
    expect(localeFromLanguageTag('zh-CN')).toBe('zh-Hans');
    expect(localeFromLanguageTag('zh-SG')).toBe('zh-Hans');
  });

  it('does not map Traditional Chinese locales without a zh-Hant catalog', () => {
    expect(localeFromLanguageTag('zh-Hant')).toBeNull();
    expect(localeFromLanguageTag('zh-TW')).toBeNull();
  });
});
