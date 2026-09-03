import { describe, expect, it } from 'vitest';
import { computeUnitPrice, convertQuantity } from './unit-price';

describe('convertQuantity', () => {
  it('converts within a family', () => {
    expect(convertQuantity(16, 'oz', 'lb')).toBeCloseTo(1);
    expect(convertQuantity(64, 'fl_oz', 'gallon')).toBeCloseTo(0.5);
    expect(convertQuantity(18, 'each', 'dozen')).toBeCloseTo(1.5);
    expect(convertQuantity(1, 'kg', 'lb')).toBeCloseTo(2.2046, 3);
  });
  it('refuses cross-family conversions', () => {
    expect(convertQuantity(1, 'lb', 'each')).toBeNull();
    expect(convertQuantity(2, 'slice', 'each')).toBeNull();
  });
});

describe('computeUnitPrice', () => {
  it('handles per-pound and per-ounce pricing', () => {
    expect(computeUnitPrice({ dealType: 'fixed_price', price: 3.99, regularPrice: null, percentOff: null, quantity: 1, unit: 'lb' }, 'lb')).toBe(3.99);
    expect(computeUnitPrice({ dealType: 'fixed_price', price: 2.5, regularPrice: null, percentOff: null, quantity: 8, unit: 'oz' }, 'lb')).toBe(5);
  });
  it('handles bundles, bogo, percent off', () => {
    expect(computeUnitPrice({ dealType: 'bundle', price: 8, regularPrice: null, percentOff: null, quantity: 2, unit: 'slice' }, 'slice')).toBe(4);
    expect(computeUnitPrice({ dealType: 'bogo', price: 10, regularPrice: null, percentOff: null, quantity: 1, unit: 'each' }, 'each')).toBe(5);
    expect(computeUnitPrice({ dealType: 'percent_off', price: null, regularPrice: 20, percentOff: 50, quantity: 1, unit: 'each' }, 'each')).toBe(10);
  });
  it('is null when not computable', () => {
    expect(computeUnitPrice({ dealType: 'percent_off', price: null, regularPrice: null, percentOff: 50, quantity: 1, unit: 'each' }, 'each')).toBeNull();
    expect(computeUnitPrice({ dealType: 'free_item', price: null, regularPrice: null, percentOff: null, quantity: 1, unit: 'each' }, 'each')).toBeNull();
    expect(computeUnitPrice({ dealType: 'fixed_price', price: 5, regularPrice: null, percentOff: null, quantity: 1, unit: 'lb' }, 'each')).toBeNull();
  });
});
