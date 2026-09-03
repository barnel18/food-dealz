import { describe, expect, it } from 'vitest';
import { parseKrogerSize } from './kroger';

describe('parseKrogerSize', () => {
  it('parses simple sizes', () => {
    expect(parseKrogerSize('16 oz', 'UNIT')).toEqual({ quantity: 16, unit: 'oz' });
    expect(parseKrogerSize('2 lb', 'UNIT')).toEqual({ quantity: 2, unit: 'lb' });
    expect(parseKrogerSize('64 fl oz', 'UNIT')).toEqual({ quantity: 64, unit: 'fl_oz' });
    expect(parseKrogerSize('12 ct', 'UNIT')).toEqual({ quantity: 12, unit: 'each' });
    expect(parseKrogerSize('1 gal', 'UNIT')).toEqual({ quantity: 1, unit: 'gallon' });
  });
  it('uses the measured total for count/size pairs', () => {
    expect(parseKrogerSize('8 ct / 30.4 ounce', 'UNIT', 'Kroger 80/20 Ground Beef Patties')).toEqual({ quantity: 30.4, unit: 'oz' });
  });
  it('prefers a larger total stated in the description', () => {
    expect(parseKrogerSize('3 ct / 1 lb', 'UNIT', 'Kroger 80/20 Ground Beef Packs 3 LB BIG DEAL!')).toEqual({ quantity: 3, unit: 'lb' });
  });
  it('treats weight-sold items without a size as per pound', () => {
    expect(parseKrogerSize('', 'WEIGHT')).toEqual({ quantity: 1, unit: 'lb' });
    expect(parseKrogerSize(undefined, 'UNIT')).toEqual({ quantity: 1, unit: 'each' });
  });
});
