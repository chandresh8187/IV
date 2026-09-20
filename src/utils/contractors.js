export const activeContractorRule = (
  assignments,
  shift,
  date,
  rotations = [],
) => {
  const legacy = assignments
    .filter(rule => rule.shift_name === shift && rule.effective_from <= date)
    .sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0];
  const rule = rotations
    .filter(item => item.effective_from <= date)
    .sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0];
  if (!rule || (legacy && legacy.effective_from > rule.effective_from))
    return legacy;
  const monthIndex = value =>
    Number(value.slice(0, 4)) * 12 + Number(value.slice(5, 7));
  const swap =
    Number(rule.rotate_monthly) === 1 &&
    (monthIndex(date) - monthIndex(rule.effective_from)) % 2 === 1;
  const slot = swap ? (shift === 'day' ? 'night' : 'day') : shift;
  return {
    contractor_id: rule[`${slot}_contractor_id`],
    contractor_name: rule[`${slot}_contractor_name`],
    effective_from: rule.effective_from,
  };
};

export const contractorMonth = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export const offsetContractorMonth = (month, offset) => {
  const [year, value] = month.split('-').map(Number);
  return contractorMonth(new Date(year, value - 1 + offset, 1));
};

export const contractorWeight = (kg, unit) =>
  (Number(kg || 0) / (unit === 't' ? 1000 : 1)).toLocaleString('en-IN', {
    minimumFractionDigits: unit === 't' ? 3 : 2,
    maximumFractionDigits: unit === 't' ? 3 : 2,
  });
