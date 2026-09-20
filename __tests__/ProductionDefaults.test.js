import { getDefaultProductionSelection } from '../src/utils/productionDefaults';

const plans = [
  {
    planning_id: 10,
    planning_item_id: 20,
    challan_no: '123-1',
    material_description: 'MS W BEAM 1.7mm',
    remaining_qty: 10,
  },
  {
    planning_id: 10,
    planning_item_id: 21,
    challan_no: '123-2',
    material_description: 'MS COLUMN',
    remaining_qty: 15,
  },
];
const contractors = [{ id: 2, name: 'Bintu' }];
test('defaults select the exact material item and contractor by ID', () => {
  expect(
    getDefaultProductionSelection(
      { default_planning_item_id: 21, default_contractor_id: 2 },
      plans,
      contractors,
    ),
  ).toMatchObject({
    planning_id: '10',
    planning_item_id: 21,
    challan_no: '123-2',
    material: 'MS COLUMN',
    contractor_id: 2,
  });
});
test('completed/deleted defaults never fall back to a different material or contractor', () => {
  expect(
    getDefaultProductionSelection(
      { default_planning_item_id: 20, default_contractor_id: 99 },
      [{ ...plans[0], remaining_qty: 0 }, plans[1]],
      contractors,
    ),
  ).toMatchObject({ planning_item_id: null, contractor_id: null });
  expect(
    getDefaultProductionSelection(
      { default_planning_id: 10, default_planning_item_id: null },
      [plans[1]],
      contractors,
    ).planning_item_id,
  ).toBeNull();
});
