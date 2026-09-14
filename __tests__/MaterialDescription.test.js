import { formatMaterialDescription } from '../src/utils/format';

describe('production material display', () => {
  test('joins the material name and description without a plus separator', () => {
    expect(formatMaterialDescription('MS W BEAM + 1.7mm, L-4000mm'))
      .toBe('MS W BEAM 1.7mm, L-4000mm');
  });

  test('keeps plus signs inside the description after the joining separator', () => {
    expect(formatMaterialDescription('MS COLUMN + plate + bracket'))
      .toBe('MS COLUMN plate + bracket');
  });

  test('handles material-only, empty and already-combined values', () => {
    expect(formatMaterialDescription('MS W BEAM')).toBe('MS W BEAM');
    expect(formatMaterialDescription('MS W BEAM 1.7mm')).toBe('MS W BEAM 1.7mm');
    expect(formatMaterialDescription(null)).toBe('');
    expect(formatMaterialDescription('  MS COLUMN + 4mm  ')).toBe('MS COLUMN 4mm');
  });
});
