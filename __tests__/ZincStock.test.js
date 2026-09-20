import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import { useQuery, useMutation } from '@tanstack/react-query';
import ZincStockScreen from '../src/screens/common/ZincStockScreen';
import { parseZincAmount, zincTransferPreview } from '../src/utils/zincStock';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('@react-navigation/native', () => ({ useFocusEffect: jest.fn() }));
const mockInvalidate = jest.fn(),
  mockSetData = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: () => ({
    invalidateQueries: mockInvalidate,
    setQueryData: mockSetData,
  }),
}));
jest.mock('react-native-paper', () => ({ TextInput: 'TextInput' }));
jest.mock(
  'react-native-paper/lib/module/components/TextInput/TextInput',
  () => 'TextInput',
);
jest.mock('lucide-react-native', () => ({
  Factory: 'Factory',
  Package: 'Package',
  ArrowRightLeft: 'ArrowRightLeft',
}));
jest.mock('../src/components/ZincTankVisual', () => 'ZincTankVisual');
jest.mock('../src/api/zincStockApi', () => ({
  getZincStockApi: jest.fn(),
  getZincMovementsApi: jest.fn(),
  saveZincMovementApi: jest.fn(),
}));
jest.mock('../src/utils/responsive', () => ({
  useResponsive: () => ({}),
  centeredContent: () => ({}),
}));
let tree, stock, mutate, mutationOptions, queryResult;
const texts = () =>
  tree.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat()
    .join(' ');
const button = label =>
  tree.root
    .findAllByType(TouchableOpacity)
    .find(node =>
      node.findAllByType(Text).some(text => text.props.children === label),
    );
const tap = label => act(() => button(label).props.onPress());
const input = label =>
  tree.root.findAllByType('TextInput').find(node => node.props.label === label);
const change = (label, value) =>
  act(() => input(label).props.onChangeText(value));
const render = () =>
  act(() => {
    tree = renderer.create(<ZincStockScreen />);
  });
beforeEach(() => {
  jest.clearAllMocks();
  useSelector.mockReturnValue({ role: 'plant_manager' });
  stock = {
    initialized: true,
    plant_kg: 9989,
    kettle_kg: 0,
    kg_per_mm: 35.65,
    revision: 1,
    capacity_kg: 44562.5,
    level_mm: 0,
    fill_percent: 0,
    tank: { length_m: 5, width_m: 1, depth_mm: 1250 },
  };
  queryResult = { refetch: jest.fn() };
  useQuery.mockImplementation(({ queryKey }) =>
    queryKey[0] === 'zinc-stock'
      ? { ...queryResult, data: { data: stock } }
      : { data: { data: [] } },
  );
  mutate = jest.fn();
  useMutation.mockImplementation(options => {
    mutationOptions = options;
    return { mutate, isPending: false };
  });
});
afterEach(() => {
  if (tree) act(() => tree.unmount());
  tree = null;
});

test('plant and kettle options display balances and preview exact transfer', () => {
  render();
  tap('Stock in Kettle');
  tap('Add zinc to kettle');
  change('Zinc amount (kg)', '1000');
  expect(texts()).toContain('8,989');
  expect(texts()).toContain('28.1');
  tap('Confirm transfer');
  expect(mutate.mock.calls[0][0]).toMatchObject({
    action: 'transfer',
    amount_kg: 1000,
    expected_revision: 1,
  });
  const next = {
    ...stock,
    plant_kg: 8989,
    kettle_kg: 1000,
    level_mm: 1000 / 35.65,
    revision: 2,
  };
  act(() =>
    mutationOptions.onSuccess({ data: next, message: 'Zinc transferred.' }),
  );
  expect(mockSetData).toHaveBeenCalledWith(['zinc-stock'], {
    data: next,
    message: 'Zinc transferred.',
  });
  expect(mockInvalidate).toHaveBeenCalledWith({
    queryKey: ['zinc-stock-movements'],
  });
});
test('invalid and excessive transfers never submit', () => {
  render();
  tap('Stock in Kettle');
  tap('Add zinc to kettle');
  for (const value of ['-1', '0', 'NaN', '10000']) {
    change('Zinc amount (kg)', value);
    tap('Confirm transfer');
  }
  expect(mutate).not.toHaveBeenCalled();
  expect(texts()).toContain('Not enough zinc');
});
test('receipt adds only to plant and a network retry preserves request ID and revision', () => {
  render();
  tap('Add zinc to plant');
  change('Zinc amount (kg)', '1000');
  tap('Save plant receipt');
  const first = mutate.mock.calls[0][0];
  act(() => mutationOptions.onError(new Error('timeout')));
  stock = { ...stock, plant_kg: 10989, revision: 2 };
  act(() => tree.update(<ZincStockScreen />));
  tap('Save plant receipt');
  expect(mutate.mock.calls[1][0]).toEqual(first);
  expect(first.action).toBe('receive');
});
test('opening stock requires explicit balances and accepts fill height in mm', () => {
  stock = { ...stock, initialized: false, revision: 0, level_mm: null };
  render();
  tap('Save opening stock');
  expect(mutate).not.toHaveBeenCalled();
  change('Opening plant stock (kg)', '9989');
  tap('mm');
  change('Kettle fill height from bottom (mm)', '1000');
  tap('Save opening stock');
  expect(mutate.mock.calls[0][0]).toMatchObject({
    action: 'initialize',
    plant_kg: 9989,
    kettle_kg: 35650,
    kg_per_mm: 35.65,
  });
});
test('manager can replace both balances and the correction is audited', () => {
  render();
  tap('Change plant and kettle stock');
  expect(input('Plant stock (kg)').props.value).toBe('9989');
  expect(input('Kettle stock (kg)').props.value).toBe('0');
  change('Plant stock (kg)', '8500');
  change('Kettle stock (kg)', '16500');
  change('Note (optional)', 'Physical stock verification');
  tap('Save changed balances');
  expect(mutate.mock.calls[0][0]).toMatchObject({
    action: 'adjust',
    plant_kg: 8500,
    kettle_kg: 16500,
    kg_per_mm: 35.65,
    note: 'Physical stock verification',
    expected_revision: 1,
  });
});
test('changed kettle balance may be entered as measured millimetres', () => {
  render();
  tap('Change plant and kettle stock');
  tap('mm');
  change('Kettle fill height from bottom (mm)', '500');
  tap('Save changed balances');
  expect(mutate.mock.calls[0][0]).toMatchObject({
    action: 'adjust',
    plant_kg: 9989,
    kettle_kg: 17825,
  });
});
test('view-only users cannot mutate and revoked view access disables queries', () => {
  useSelector.mockReturnValue({
    role: 'admin',
    permissions: ['zinc_stock.view'],
  });
  render();
  expect(button('Add zinc to plant')).toBeUndefined();
  tap('Stock in Kettle');
  expect(button('Add zinc to kettle')).toBeUndefined();
  useSelector.mockReturnValue({ role: 'admin', permissions: [] });
  act(() => tree.update(<ZincStockScreen />));
  expect(texts()).toContain('do not have zinc stock access');
  expect(useQuery.mock.calls.at(-1)[0].enabled).toBe(false);
});
test('API errors do not present cached balances as current', () => {
  queryResult.isError = true;
  render();
  expect(texts()).toContain('Could not load zinc stock');
  expect(button('Stock in Plant')).toBeUndefined();
  tap('Retry stock');
  expect(mockInvalidate).toHaveBeenCalled();
});
test('weight parsing and capacity prevent tiny negative balances and overflowing tank', () => {
  expect(parseZincAmount('1.0001')).toBeNull();
  expect(parseZincAmount('')).toBeNull();
  expect(parseZincAmount('0', true)).toBe(0);
  expect(
    zincTransferPreview({ ...stock, plant_kg: 0.3, kettle_kg: 0 }, '0.1')
      .plant_kg,
  ).toBe(0.2);
  expect(
    zincTransferPreview({ ...stock, kettle_kg: 44562.5 }, '1').error,
  ).toContain('tank volume');
});
