export const emptyPlanningChallan = () => ({
  planning_source: 'in_house',
  challan_number: '',
  party_name: '',
  item_id: null,
  material_detail: '',
  planned_qty: '',
  target_zinc_percentage: '',
});
export const planningChallanNumber = item =>
  item.planning_source === 'other_party'
    ? item.challan_no || ''
    : String(item.challan_no || '').replace(/^DC\/[^/]+\//i, '');
export const planningChallanLabel = (item, year) =>
  item.planning_source === 'other_party'
    ? item.challan_number.trim()
    : `DC/${year}/${item.challan_number.trim()}`;
export function validatePlanningChallan(item) {
  const number = String(item.challan_number || '').trim();
  if (
    !number ||
    number.length > (item.planning_source === 'other_party' ? 100 : 40) ||
    Array.from(number).some(
      char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
    )
  )
    return 'Enter a challan reference using letters, numbers or symbols (up to 40 characters for in-house, 100 for other party).';
  if (!String(item.party_name || '').trim())
    return 'Enter the party / company name.';
  if (!item.item_id) return 'Select a material.';
  if (
    !Number.isInteger(Number(item.planned_qty)) ||
    Number(item.planned_qty) <= 0
  )
    return 'Planned quantity must be a positive whole number.';
  if (
    !Number.isFinite(Number(item.target_zinc_percentage)) ||
    Number(item.target_zinc_percentage) <= 0 ||
    Number(item.target_zinc_percentage) > 100
  )
    return 'Target zinc percentage must be greater than 0 and no more than 100.';
  return null;
}
