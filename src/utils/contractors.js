export const activeContractorRule = (assignments, shift, date) =>
  assignments
    .filter(rule => rule.shift_name === shift && rule.effective_from <= date)
    .sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0];

export const contractorWeight = (kg, unit) =>
  (Number(kg || 0) / (unit === 't' ? 1000 : 1)).toLocaleString('en-IN', {
    minimumFractionDigits: unit === 't' ? 3 : 2,
    maximumFractionDigits: unit === 't' ? 3 : 2,
  });
