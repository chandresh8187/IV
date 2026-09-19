import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import ProductionPlanningScreen from '../src/screens/common/ProductionPlanningScreen';
import {
  emptyPlanningChallan,
  planningChallanNumber,
  planningChallanLabel,
  validatePlanningChallan,
} from '../src/utils/planningChallan';

jest.mock('react-redux', () => ({
  useSelector: () => ({ role: 'plant_manager' }),
}));
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
jest.mock('react-native-paper', () => ({ TextInput: 'TextInput' }));
jest.mock(
  'react-native-paper/lib/module/components/TextInput/TextInput',
  () => 'TextInput',
);
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
}));
jest.mock('react-native-dropdown-picker', () => 'DropDownPicker');
jest.mock(
  '../src/components/ResponsiveGrid',
  () =>
    ({ children }) =>
      children,
);
jest.mock('../src/utils/responsive', () => ({
  useResponsive: () => ({}),
  centeredContent: () => ({}),
}));
jest.mock('../src/api/productionPlanningApi', () => ({
  createProductionPlanningApi: jest.fn(),
  updateProductionPlanningApi: jest.fn(),
  deleteProductionPlanningApi: jest.fn(),
  getProductionPlanningApi: jest.fn(),
}));
jest.mock('../src/api/itemsApi', () => ({ getItemsApi: jest.fn() }));
jest.mock('../src/api/financialYearsApi', () => ({
  getCurrentFinancialYearApi: jest.fn(),
}));
jest.mock('../src/utils/serverProductionReport', () => ({
  downloadProductionPlanningFile: jest.fn(),
}));

let tree;
let mutate;
let records;
const tap = label =>
  act(() =>
    tree.root
      .findAllByType(TouchableOpacity)
      .find(node => node.props.children?.props?.children === label)
      .props.onPress(),
  );
const change = (id, value) =>
  act(() =>
    tree.root
      .findAllByType('TextInput')
      .find(node => node.props.testID === id)
      .props.onChangeText(value),
  );
const item = {
  id: 8,
  planning_source: 'in_house',
  challan_no: 'DC/2025-26/001',
  item_id: 2,
  party_name: 'Plant',
  planned_qty: 100,
  completed_qty: 40,
  remaining_qty: 60,
  target_zinc_percentage: 6.5,
  material_description: 'MS W BEAM',
};
beforeEach(() => {
  records = [];
  mutate = jest.fn();
  useMutation.mockReturnValue({ mutate, isPending: false });
  useQuery.mockImplementation(({ queryKey }) => ({
    data: {
      data:
        queryKey[0] === 'production-planning'
          ? records
          : queryKey[0] === 'items'
          ? [{ id: 2, item_name: 'MS W BEAM' }]
          : { id: 1, financial_year: '2026-27' },
    },
  }));
});
afterEach(() => {
  if (tree) act(() => tree.unmount());
  tree = null;
});
test('external challans preserve slashes and letters while internal ones use the year prefix', () => {
  const external = {
    ...emptyPlanningChallan(),
    planning_source: 'other_party',
    challan_number: 'ABC/9-A',
    party_name: 'Party',
    item_id: 2,
    planned_qty: '50',
    target_zinc_percentage: '6.5',
  };
  expect(validatePlanningChallan(external)).toBeNull();
  expect(planningChallanLabel(external, '2026-27')).toBe('ABC/9-A');
  expect(
    planningChallanNumber({
      planning_source: 'other_party',
      challan_no: 'ABC/9-A',
    }),
  ).toBe('ABC/9-A');
  expect(
    validatePlanningChallan({ ...external, planning_source: 'in_house' }),
  ).toBeNull();
  expect(
    planningChallanLabel(
      { ...external, planning_source: 'in_house', challan_number: '007' },
      '2026-27',
    ),
  ).toBe('DC/2026-27/007');
});
test.each(['123-1', '123-2', 'AB/7', '123_A', '123.1', 'ABC#7'])(
  'in-house reference %s survives validation and editing',
  suffix => {
    const form = {
      ...emptyPlanningChallan(),
      challan_number: suffix,
      party_name: 'Plant',
      item_id: 2,
      planned_qty: '100',
      target_zinc_percentage: '6.5',
    };
    expect(validatePlanningChallan(form)).toBeNull();
    expect(
      planningChallanNumber({
        planning_source: 'in_house',
        challan_no: planningChallanLabel(form, '2026-27'),
      }),
    ).toBe(suffix);
  },
);
test('in-house input has a text keyboard and saves the hyphenated suffix', () => {
  act(() => {
    tree = renderer.create(
      <ProductionPlanningScreen navigation={{ navigate: jest.fn() }} />,
    );
  });
  tap('Add production planning');
  const input = tree.root
    .findAllByType('TextInput')
    .find(node => node.props.testID === 'challan_number');
  expect(input.props.keyboardType).toBe('default');
  change('challan_number', '123-2');
  change('party_name', 'Plant');
  change('planned_qty', '100');
  change('target_zinc_percentage', '6.5');
  act(() => tree.root.findByType('DropDownPicker').props.setValue(() => 2));
  tap('Save planning');
  expect(mutate.mock.calls[0][0].body.items[0]).toMatchObject({
    planning_source: 'in_house',
    challan_number: '123-2',
  });
});
test('new planning saves a single other-party challan directly, without an Add to Flow step', () => {
  act(() => {
    tree = renderer.create(
      <ProductionPlanningScreen navigation={{ navigate: jest.fn() }} />,
    );
  });
  tap('Add production planning');
  tap('Other party');
  change('challan_number', 'SUP/2026/A-7');
  change('party_name', 'Supplier');
  change('planned_qty', '100');
  change('target_zinc_percentage', '6.5');
  act(() => tree.root.findByType('DropDownPicker').props.setValue(() => 2));
  tap('Save planning');
  const payload = mutate.mock.calls[0][0].body;
  expect(payload.financial_year_id).toBe(1);
  expect(payload.items).toHaveLength(1);
  expect(payload.items[0]).toMatchObject({
    planning_source: 'other_party',
    challan_number: 'SUP/2026/A-7',
    item_id: 2,
  });
  expect(
    tree.root
      .findAllByType(Text)
      .some(
        node =>
          node.props.children === 'Production queue · top flow runs first',
      ),
  ).toBe(false);
});
test('editing one old grouped challan retains every item ID and original financial year', () => {
  records = [
    {
      id: 7,
      financial_year: '2025-26',
      items: [item, { ...item, id: 9, challan_no: 'DC/2025-26/002' }],
    },
  ];
  act(() => {
    tree = renderer.create(
      <ProductionPlanningScreen navigation={{ navigate: jest.fn() }} />,
    );
  });
  tap('Edit challan');
  change('material_detail', '1.7mm');
  tap('Save planning');
  expect(mutate.mock.calls[0][0]).toMatchObject({
    id: 7,
    body: {
      items: [
        { id: 8, challan_number: '001', material_detail: '1.7mm' },
        { id: 9, challan_number: '002' },
      ],
    },
  });
});
