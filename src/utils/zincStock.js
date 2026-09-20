// Configured zinc density 7.13 g/cm³ (7,130 kg/m³); 5 m x 1 m footprint.
export const ZINC_DENSITY_G_CM3 = 7.13;
export const ZINC_KG_PER_MM = 35.65;
export const ZINC_DEPTH_MM = 1250;

export const zincKg = value =>
  Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });

export function parseZincAmount(value, allowZero = false) {
  const text = String(value).trim();
  if (!/^\d+(\.\d{1,3})?$/.test(text)) return null;
  const amount = Number(text);
  return Number.isFinite(amount) &&
    amount >= (allowZero ? 0 : 0.001) &&
    amount <= 1000000000
    ? amount
    : null;
}

export function zincTransferPreview(stock, amount) {
  const kg = parseZincAmount(amount);
  if (kg == null)
    return {
      error: 'Enter kilograms greater than zero, with up to 3 decimal places.',
    };
  const grams = Math.round(kg * 1000);
  const plantGrams = Math.round(stock.plant_kg * 1000);
  const kettleGrams = Math.round(stock.kettle_kg * 1000);
  if (grams > plantGrams) return { error: 'Not enough zinc in plant stock.' };
  if (kettleGrams + grams > Math.round(stock.capacity_kg * 1000))
    return { error: 'This transfer exceeds the tank volume.' };
  return {
    plant_kg: (plantGrams - grams) / 1000,
    kettle_kg: (kettleGrams + grams) / 1000,
    level_mm: (kettleGrams + grams) / 1000 / stock.kg_per_mm,
  };
}
