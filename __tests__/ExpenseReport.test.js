import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import ExpenseReportScreen from '../src/screens/common/ExpenseReportScreen';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('@react-navigation/native', () => ({ useFocusEffect: callback => callback() }));
jest.mock('@tanstack/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('../src/api/expenseReportApi', () => ({ getExpenseReportApi: jest.fn() }));
jest.mock('../src/utils/serverExpenseReport', () => ({ downloadExpenseReport: jest.fn() }));
jest.mock('../src/utils/responsive', () => ({ useResponsive: () => ({}), centeredContent: () => null }));

let tree;
const report = {
  period: { month: '2026-09' },
  totals: {
    running_plant_cost: 4.64, total_expense: 191691.1,
    plant_zinc_stock_kg: 7000, purchased_zinc_kg: 47817,
    total_ms_production_kg: 537000, average_ms_production_per_day_kg: 41307.692,
    production_days: 13, average_zinc_consumption_percent: 6.78,
    net_zinc_consumed_kg: 36408.6, gross_zinc_consumed_kg: 37000, recovered_zinc_kg: 591.4,
  },
  expenses: Object.fromEntries([
    'salary_per_day', 'hardware_per_day', 'maintenance_per_day', 'zinc_spray_per_day',
    'electricity_per_day', 'gas_per_day', 'chemicals_per_day', 'ms_wire_per_day',
    'rent_expense', 'acid_expense', 'crane_expense', 'other_expense',
  ].map(key => [key, 100])),
};
const text = () => tree.root.findAllByType(Text).map(node => node.props.children).flat(Infinity).join(' ');

beforeEach(() => {
  useSelector.mockReturnValue({ role: 'superadmin' });
  useQuery.mockReturnValue({ data: { data: report }, refetch: jest.fn(), isRefetching: false });
});
afterEach(() => { if (tree) act(() => tree.unmount()); tree = null; });

test('shows running cost first with production and zinc metrics', () => {
  act(() => { tree = renderer.create(<ExpenseReportScreen navigation={{ navigate: jest.fn() }} />); });
  expect(text()).toContain('RUNNING PLANT COST');
  expect(text()).toContain('4.64');
  expect(text()).toContain('47,817 kg');
  expect(text()).toContain('537 ton');
  expect(text()).toContain('6.78%');
  expect(text()).toContain('All expenses');
});

test('settings button opens expense settings', () => {
  const navigation = { navigate: jest.fn() };
  act(() => { tree = renderer.create(<ExpenseReportScreen navigation={navigation} />); });
  const button = tree.root.findAllByType(TouchableOpacity).find(node => node.findAllByType(Text).some(item => item.props.children === 'Settings'));
  act(() => button.props.onPress());
  expect(navigation.navigate).toHaveBeenCalledWith('ExpenseSettings');
});
