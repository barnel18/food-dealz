import { describe, expect, it } from 'vitest';
import { postprocess, type PostprocessContext } from './postprocess';
import type { ExtractedDeal } from './schema';

const base: ExtractedDeal = {
  title: 'Friday fish fry', item_name: 'Cod fish fry', canonical_item_slug: 'fish_fry', deal_type: 'fixed_price',
  price: 16, regular_price: null, percent_off: null, quantity: 1, unit: 'each', conditions: null,
  starts_at: null, ends_at: null, days_of_week: [5], time_window: null, evidence_quote: 'Friday fish fry $16', confidence: 0.92,
};
const ctx = (over: Partial<PostprocessContext> = {}): PostprocessContext => ({
  businessId: '00000000-0000-4000-8000-000000000001', businessCategory: 'restaurant', sourceType: 'website',
  captureId: '00000000-0000-4000-8000-000000000002', capturedAt: new Date('2026-09-03T18:00:00Z'),
  capturedText: 'Every Friday: fish fry $16, cheese curds $7. Kids eat free Sundays.', usedImages: false, autoApproveThreshold: 0.85, ...over,
});

describe('postprocess', () => {
  it('auto-approves a trusted, verifiable deal', () => {
    const { drafts, dropped } = postprocess([base], ctx());
    expect(dropped).toHaveLength(0);
    expect(drafts[0].status).toBe('approved');
    expect(drafts[0].unit_price).toBe(16);
    expect(drafts[0].days_of_week).toEqual([5]);
    expect(drafts[0].dedupe_key).toContain('fish_fry|fixed_price|16.00|1|each');
  });
  it('drops prices that are not in the source text', () => {
    const { drafts, dropped } = postprocess([{ ...base, price: 12 }], ctx());
    expect(drafts).toHaveLength(0);
    expect(dropped[0].reason).toMatch(/not found/);
  });
  it('keeps image-derived prices but forces review', () => {
    const { drafts } = postprocess([{ ...base, price: 12 }], ctx({ usedImages: true, capturedText: 'see flyer' }));
    expect(drafts[0].status).toBe('pending');
    expect(drafts[0].review_reasons.join()).toMatch(/image/);
  });
  it('never auto-approves instagram', () => {
    const { drafts } = postprocess([base], ctx({ sourceType: 'instagram' }));
    expect(drafts[0].status).toBe('pending');
  });
  it('resolves slugs from aliases and rejects cross-category slugs', () => {
    const { drafts } = postprocess([{ ...base, canonical_item_slug: null, item_name: 'fried cheese curds', title: 'Curds $7', price: 7, days_of_week: null, evidence_quote: 'cheese curds $7' }], ctx());
    expect(drafts[0].canonical_item_slug).toBe('cheese_curds');
    const { drafts: d2 } = postprocess([{ ...base, canonical_item_slug: 'ground_beef_lb', item_name: 'zzz' }], ctx());
    expect(d2[0].canonical_item_slug).toBeNull();
  });
  it('normalizes dates into the launch time zone and drops already-ended deals', () => {
    const { drafts } = postprocess([{ ...base, days_of_week: null, ends_at: '2026-09-07' }], ctx());
    expect(drafts[0].ends_at).toBe('2026-09-08T04:59:59.000Z');
    const { dropped } = postprocess([{ ...base, days_of_week: null, ends_at: '2026-09-01' }], ctx());
    expect(dropped[0].reason).toMatch(/already ended/);
  });
});
