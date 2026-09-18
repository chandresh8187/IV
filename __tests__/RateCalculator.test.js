import { calculateRate, defaultRateInputs } from '../src/utils/rateCalculator';

const sample = {
  ...defaultRateInputs(),
  oldWeight: '414',
  newWeight: '443',
  zincRate: '446',
};
test('matches the spreadsheet example and preserves intermediate precision', () => {
  const result = calculateRate({ ...sample, plantCost: '5.5' });
  expect(result.errors).toEqual({});
  expect(result.weightDiff).toBeCloseTo(7.0048309179, 8);
  expect(result.totalZinc).toBe(result.weightDiff);
  expect(result.subtotal.toFixed(2)).toBe('31.24');
  expect(result.finalRate.toFixed(2)).toBe('39.74');
});
test('uses requested defaults and adds drossing in percentage points', () => {
  expect(calculateRate(sample).finalRate.toFixed(2)).toBe('41.24');
  const result = calculateRate({ ...sample, drossing: '1.5' });
  expect(result.totalZinc).toBeCloseTo(result.weightDiff + 1.5);
  expect(result.finalRate).toBeCloseTo((result.totalZinc * 446) / 100 + 10);
});
test('empty required inputs never show a misleading final rate', () => {
  expect(calculateRate(defaultRateInputs()).finalRate).toBeNull();
  expect(calculateRate({ ...sample, zincRate: '' }).finalRate).toBeNull();
});
test.each([
  ['oldWeight', '0'],
  ['oldWeight', '-1'],
  ['newWeight', '400'],
  ['zincRate', '1.2.3'],
  ['drossing', 'abc'],
  ['profit', '-2'],
])('invalid %s=%s is flagged', (key, value) => {
  const result = calculateRate({ ...sample, [key]: value });
  expect(result.errors[key]).toBeTruthy();
  expect(result.finalRate).toBeNull();
});
test('zero zinc rate and identical weights are valid', () => {
  expect(calculateRate({ ...sample, zincRate: '0' }).finalRate).toBe(10);
  expect(calculateRate({ ...sample, newWeight: '414' }).weightDiff).toBe(0);
});
