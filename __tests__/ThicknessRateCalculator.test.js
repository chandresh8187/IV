import { calculateThicknessRate, zincRangeForThickness } from '../src/utils/thicknessRateCalculator';

test('2 mm selects the exact 7% reference and keeps the existing cost formula', () => {
  expect(zincRangeForThickness('2')).toEqual({ min: 7, max: 7 });
  const result = calculateThicknessRate({ thickness: '2', zincPercentage: '7', drossing: '0', zincRate: '105', plantCost: '7', profit: '3' });
  expect(result.totalZinc).toBe(7);
  expect(result.subtotal).toBe(7.35);
  expect(result.finalRate).toBe(17.35);
});

test('range percentages can be adjusted but not beyond the chart', () => {
  expect(zincRangeForThickness('2.5')).toEqual({ min: 6, max: 6.5 });
  expect(calculateThicknessRate({ thickness: '2.5', zincPercentage: '6', zincRate: '100' }).finalRate).toBe(6);
  expect(calculateThicknessRate({ thickness: '2.5', zincPercentage: '7', zincRate: '100' }).errors.zincPercentage).toBeTruthy();
});

test('intermediate thickness interpolates neighbouring reference ranges', () => {
  expect(zincRangeForThickness('2.25')).toEqual({ min: 6.5, max: 6.75 });
});
