import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useQuery, useMutation } from '@tanstack/react-query';
import { editZincByproductApi } from '../src/api/zincStockApi';
import ZincStockScreen from '../src/screens/common/ZincStockScreen';
import {
  parseZincAmount,
  zincKgToMm,
  zincMmToKg,
  zincTransferPreview,
} from '../src/utils/zincStock';

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
jest.mock('react-native-paper', () => {
  const TextInput = props => require('react').createElement('TextInput', props);
  TextInput.Icon = 'TextInputIcon';
  return { TextInput };
});
jest.mock(
  'react-native-paper/lib/module/components/TextInput/TextInput',
  () => 'TextInput',
);
jest.mock('lucide-react-native', () => ({
  Pencil: 'Pencil',
  Factory: 'Factory',
  Package: 'Package',
  ArrowRightLeft: 'ArrowRightLeft',
  Settings: 'Settings',
  Plus: 'Plus',
  Search: 'Search',
  ChevronLeft: 'ChevronLeft',
  ChevronRight: 'ChevronRight',
  CalendarDays: 'CalendarDays',
  X: 'X',
  FileText: 'FileText',
}));
jest.mock(
  '../src/screens/common/ZincPurchaseScreen',
  () => 'ZincPurchaseScreen',
);
jest.mock('../src/components/ZincTankVisual', () => 'ZincTankVisual');
jest.mock('../src/api/zincStockApi', () => ({
  getZincStockApi: jest.fn(),
  getZincMovementsApi: jest.fn(),
  saveZincMovementApi: jest.fn(),
  editZincByproductApi: jest.fn().mockResolvedValue({}),
}));
jest.mock('../src/utils/responsive', () => ({
  useResponsive: () => ({}),
  centeredContent: () => ({}),
}));
let tree, stock, mutate, mutationOptions, byproductOptions, queryResult;
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
  mutationOptions = null;
  useSelector.mockReturnValue({ role: 'plant_manager' });
  stock = {
    initialized: true,
    plant_kg: 9989,
    kettle_kg: 0,
    kg_per_mm: 35.7,
    revision: 1,
    capacity_kg: 44625,
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
    if (!mutationOptions) mutationOptions = options;
    else byproductOptions = options;
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
  expect(texts()).toContain('28.0');
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
    level_mm: 1000 / 35.7,
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
test('stock tab removes plant receipt and opens kettle transfer directly in a modal', () => {
  render();
  expect(button('Add zinc to plant')).toBeUndefined();
  expect(input('Zinc amount (kg)')).toBeUndefined();
  expect(button('View Zinc Transactions')).toBeDefined();
  tap('Add zinc to kettle');
  expect(input('Zinc amount (kg)')).toBeDefined();
  tap('Cancel');
  expect(input('Zinc amount (kg)')).toBeUndefined();
});
test('opening stock is configured from the separate settings screen', () => {
  stock = { ...stock, initialized: false, revision: 0, level_mm: null };
  render();
  expect(texts()).toContain('Opening stock is not set');
  expect(texts()).toContain('Use Settings');
  expect(input('Opening plant stock (kg)')).toBeUndefined();
});
test('balance correction controls are moved out of the stock tab', () => {
  render();
  expect(button('Settings')).toBeDefined();
  expect(button('Change plant and kettle stock')).toBeUndefined();
});
test('ash and dross opens a date-only collection modal and saves ash without dross', () => {
  stock.current_zinc_rate = 200;
  render();
  tap('Ash & Dross');
  expect(texts()).toContain('RECOVERED ZINC');
  expect(input('Ash weight (kg)')).toBeUndefined();
  tap('Add');
  change('Ash weight (kg)', '100');
  change('Ash sell rate / kg', '50');
  tap('Save ash & dross entry');
  expect(mutate).toHaveBeenCalledWith(
    expect.objectContaining({
      ash_weight_kg: '100',
      ash_rate: '50',
      dross_weight_kg: 0,
      dross_rate: 0,
      transaction_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    }),
  );
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
    zincTransferPreview({ ...stock, kettle_kg: 44625 }, '1').error,
  ).toContain('tank volume');
});

test('kettle opening stock converts between millimetres and kilograms', () => {
  expect(zincMmToKg(100)).toBe(3570);
  expect(zincKgToMm(3570)).toBe(100);
  expect(zincMmToKg(1250)).toBe(44625);
});

test('transfers omit purchase references', () => {
  render();
  tap('Stock in Kettle');
  tap('Add zinc to kettle');
  change('Zinc amount (kg)', '10');
  tap('Confirm transfer');
  expect(mutate.mock.calls.at(-1)[0].batch_number).toBeUndefined();
});

test('edit collection prefills original values and retries with the same version and request ID', async () => {
  stock.current_zinc_rate = 300;
  const row = {
    id: 7,
    transaction_date: '2026-10-27',
    ash_weight_kg: 100,
    ash_rate: 50,
    dross_weight_kg: 0,
    dross_rate: 0,
    zinc_rate_snapshot: 200,
    recovered_zinc_kg: 29.5,
    note: 'October ash',
    edit_version: 'a'.repeat(64),
  };
  useQuery.mockImplementation(({ queryKey }) =>
    queryKey[0] === 'zinc-stock'
      ? { data: { data: stock } }
      : { data: { data: [row], summary: {} } },
  );
  render();
  tap('Ash & Dross');
  tap('Edit');
  expect(input('Ash weight (kg)').props.value).toBe('100');
  expect(input('Note (optional)').props.value).toBe('October ash');
  expect(texts()).toContain('Original zinc rate');
  const payload = {
    transaction_date: row.transaction_date,
    ash_weight_kg: 100,
    ash_rate: 50,
    dross_weight_kg: 0,
    dross_rate: 0,
    note: row.note,
  };
  await byproductOptions.mutationFn(payload);
  await byproductOptions.mutationFn(payload);
  expect(editZincByproductApi).toHaveBeenCalledTimes(2);
  expect(editZincByproductApi.mock.calls[0]).toEqual(
    editZincByproductApi.mock.calls[1],
  );
  expect(editZincByproductApi.mock.calls[0][1]).toMatchObject({
    edit_version: row.edit_version,
    request_id: expect.any(String),
  });
});

test('stock action row never renders raw text directly inside a View', () => {
  render();
  for (const view of tree.root.findAllByType(View)) {
    const children = React.Children.toArray(view.props.children);
    expect(
      children.filter(
        child => typeof child === 'string' || typeof child === 'number',
      ),
    ).toEqual([]);
  }
});
