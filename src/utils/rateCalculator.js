export const defaultRateInputs = () => ({
  oldWeight: '',
  newWeight: '',
  drossing: '',
  zincRate: '',
  plantCost: '7',
  profit: '3',
});

export function calculateRate(inputs) {
  const values = {};
  const errors = {};
  const required = ['oldWeight', 'newWeight', 'zincRate'];
  for (const key of Object.keys(defaultRateInputs())) {
    const text = String(inputs[key] ?? '').trim();
    if (!text && required.includes(key)) {
      values[key] = null;
    } else if (text && !/^\d+(\.\d*)?$|^\.\d+$/.test(text)) {
      errors[key] = 'Enter a valid non-negative number.';
    } else {
      values[key] = text ? Number(text) : 0;
      if (!Number.isFinite(values[key]))
        errors[key] = 'This number is too large.';
    }
  }
  if (values.oldWeight === 0)
    errors.oldWeight = 'Old weight must be greater than zero.';
  if (
    values.oldWeight != null &&
    values.newWeight != null &&
    values.newWeight < values.oldWeight
  ) {
    errors.newWeight = 'New weight must be at least the old weight.';
  }
  const weightValid =
    !errors.oldWeight &&
    !errors.newWeight &&
    values.oldWeight > 0 &&
    values.newWeight != null;
  const weightDiff = weightValid
    ? ((values.newWeight - values.oldWeight) / values.oldWeight) * 100
    : null;
  const totalZinc =
    weightDiff != null && !errors.drossing
      ? weightDiff + values.drossing
      : null;
  const subtotal =
    totalZinc != null && values.zincRate != null && !errors.zincRate
      ? (values.zincRate * totalZinc) / 100
      : null;
  const finalRate =
    subtotal != null && !Object.keys(errors).length
      ? subtotal + values.plantCost + values.profit
      : null;
  if (
    [weightDiff, totalZinc, subtotal, finalRate].some(
      value => value != null && !Number.isFinite(value),
    )
  ) {
    return {
      errors: { ...errors, calculation: 'Values are too large to calculate.' },
      weightDiff: null,
      totalZinc: null,
      subtotal: null,
      finalRate: null,
    };
  }
  return { errors, weightDiff, totalZinc, subtotal, finalRate };
}
