export const planningFormFields = item => ({
  planning_item_id: item ? Number(item.planning_item_id) : null,
  planning_id: item ? String(item.planning_id || item.id) : '',
  challan_no: item?.challan_no || '',
  party_name: item?.party_name || '',
  material: item?.material_description || '',
  material_description: item?.material_description || '',
});

export const getDefaultProductionSelection = (
  defaults,
  planning,
  contractors,
) => {
  const candidates = planning.filter(
    item =>
      Number(item.remaining_qty) > 0 &&
      defaults?.default_planning_item_id &&
      Number(item.planning_item_id) ===
        Number(defaults.default_planning_item_id),
  );
  const contractor = contractors.find(
    item => Number(item.id) === Number(defaults?.default_contractor_id),
  );
  return {
    ...planningFormFields(candidates.length === 1 ? candidates[0] : null),
    contractor_id: contractor ? Number(contractor.id) : null,
  };
};
