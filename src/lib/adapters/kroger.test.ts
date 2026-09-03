import { describe, expect, it } from 'vitest';
import { CANONICAL_ITEM_BY_SLUG } from '@/lib/taxonomy/canonical-items';
import { chooseQuantity, nameMatchesItem, parseKrogerSize, sizeCandidates } from './kroger';

const beef = CANONICAL_ITEM_BY_SLUG.get('ground_beef_lb')!;
const bananas = CANONICAL_ITEM_BY_SLUG.get('bananas_lb')!;
const bread = CANONICAL_ITEM_BY_SLUG.get('bread_loaf')!;

describe('parseKrogerSize / sizeCandidates', () => {
  it('parses simple sizes', () => {
    expect(parseKrogerSize('16 oz', 'UNIT')).toEqual({ quantity: 16, unit: 'oz' });
    expect(parseKrogerSize('2 lb', 'UNIT')).toEqual({ quantity: 2, unit: 'lb' });
    expect(parseKrogerSize('64 fl oz', 'UNIT')).toEqual({ quantity: 64, unit: 'fl_oz' });
    expect(parseKrogerSize('12 ct', 'UNIT')).toEqual({ quantity: 12, unit: 'each' });
    expect(parseKrogerSize('1 gal', 'UNIT')).toEqual({ quantity: 1, unit: 'gallon' });
  });
  it('offers per-unit×count and total readings for count/size pairs', () => {
    const c = sizeCandidates('4 ct / 5.3 oz', 'UNIT', 'Ground Beef Burgers 5.3oz/4ct');
    expect(c[0]).toEqual({ quantity: 21.2, unit: 'oz' });
    expect(c).toContainEqual({ quantity: 5.3, unit: 'oz' });
  });
  it('prefers a larger total stated in the description', () => {
    expect(parseKrogerSize('3 ct / 1 lb', 'UNIT', 'Kroger 80/20 Ground Beef Packs 3 LB BIG DEAL!')).toEqual({ quantity: 3, unit: 'lb' });
  });
  it('treats weight-sold items without a size as per pound', () => {
    expect(parseKrogerSize('', 'WEIGHT')).toEqual({ quantity: 1, unit: 'lb' });
    expect(parseKrogerSize(undefined, 'UNIT')).toEqual({ quantity: 1, unit: 'each' });
  });
});

describe('chooseQuantity', () => {
  it('picks the reading with a plausible unit price', () => {
    // 4 burgers × 5.3 oz for $10 → $7.55/lb (plausible), not 5.3 oz total → $30/lb
    const c = chooseQuantity(sizeCandidates('4 ct / 5.3 oz', 'UNIT', 'Ground Beef Burgers 5.3oz/4ct'), 10, beef)!;
    expect(c.unit).toBe('oz');
    expect(c.quantity).toBeCloseTo(21.2);
    expect(c.unitPrice).toBeCloseTo(7.55, 1);
    // 8 patties, 30.4 oz total for $12 → $6.32/lb; the 8×30.4 reading would be $0.79/lb (implausible)
    const d = chooseQuantity(sizeCandidates('8 ct / 30.4 ounce', 'UNIT', 'Kroger 80/20 Ground Beef Patties'), 12, beef)!;
    expect(d.quantity).toBeCloseTo(30.4);
    expect(d.unitPrice).toBeCloseTo(6.32, 1);
  });
  it('returns null when no reading is plausible', () => {
    expect(chooseQuantity([{ quantity: 1, unit: 'oz' }], 40, beef)).toBeNull();
  });
  it('prices per package for items compared each', () => {
    const c = chooseQuantity(sizeCandidates('20 oz', 'UNIT', 'Honey Wheat Bread'), 1.99, bread)!;
    expect(c).toMatchObject({ quantity: 1, unit: 'each', unitPrice: 1.99 });
  });
});

describe('nameMatchesItem', () => {
  it('requires whole-word terms and honours exclusions', () => {
    expect(nameMatchesItem('Fresh Bananas', bananas)).toBe(true);
    expect(nameMatchesItem('Jumex Strawberry-Banana Nectar Can', bananas)).toBe(false);
    expect(nameMatchesItem('Kroger 80/20 Ground Beef Roll 1 LB', beef)).toBe(true);
    expect(nameMatchesItem('Ground Beef Seasoning Mix', beef)).toBe(false);
  });
});
