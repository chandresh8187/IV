import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import ContractorScreen from '../src/screens/common/ContractorScreen';
import { getContractProductionApi } from '../src/api/contractorApi';

jest.mock('@tanstack/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('@react-navigation/native', () => ({ useFocusEffect: jest.fn() }));
jest.mock('react-native-dropdown-picker', () => 'MonthPicker');
jest.mock('../src/api/contractorApi', () => ({
  getContractProductionApi: jest.fn(),
}));
jest.mock('../src/api/financialYearsApi', () => ({
  getCurrentFinancialYearApi: jest.fn(),
}));
jest.mock('../src/utils/responsive', () => ({
  useResponsive: () => ({}),
  centeredContent: () => ({}),
}));

let tree, year, report, reportOptions;
const refetch = jest.fn();
const button = label =>
  tree.root
    .findAllByType(TouchableOpacity)
    .find(node =>
      node.findAllByType(Text).some(text => text.props.children === label),
    );
const texts = () =>
  tree.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat()
    .join(' ');
beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-09-20T06:00:00Z'));
  year = { id: 1, financial_year: '2026-27', start_date: '2026-04-01' };
  report = {
    data: {
      data: {
        summaries: [
          {
            contractor_id: 1,
            contractor_name: 'Bhagat',
            entry_count: 2,
            qty: 5,
            ms_kg: 80,
            gi_kg: 88,
          },
          {
            contractor_id: 2,
            contractor_name: 'Bintu',
            entry_count: 0,
            qty: 0,
            ms_kg: 0,
            gi_kg: 0,
          },
        ],
        totals: { entry_count: 2, qty: 5, ms_kg: 80, gi_kg: 88 },
      },
    },
    refetch,
  };
  useQuery.mockImplementation(options => {
    if (options.queryKey[0] === 'current-financial-year')
      return { data: { data: year }, refetch };
    reportOptions = options;
    return report;
  });
});
afterEach(() => {
  if (tree) act(() => tree.unmount());
  tree = null;
  jest.useRealTimers();
  jest.clearAllMocks();
});
const render = () =>
  act(() => {
    tree = renderer.create(<ContractorScreen />);
  });

test('opens current month with both contractors, combined totals and zero production', () => {
  render();
  expect(texts()).toContain('September 2026');
  expect(texts()).toContain('Bhagat');
  expect(texts()).toContain('Bintu');
  expect(texts()).toContain('All contractors');
  expect(texts()).not.toContain('Coming soon');
  reportOptions.queryFn();
  expect(getContractProductionApi).toHaveBeenCalledWith({
    month: 9,
    financial_year_id: 1,
  });
});
test('12 financial-year months fetch only after confirmation and January uses ending year', () => {
  render();
  act(() => button('Fetch Previous Production').props.onPress());
  const picker = tree.root.findByType('MonthPicker');
  expect(picker.props.items).toHaveLength(12);
  expect(picker.props.items[0].label).toBe('April 2026');
  expect(picker.props.items[11].label).toBe('March 2027');
  act(() => picker.props.setValue(() => 1));
  expect(reportOptions.queryKey.at(-1)).toBe(9);
  act(() => button('Fetch Production').props.onPress());
  expect(texts()).toContain('January 2027');
  reportOptions.queryFn();
  expect(getContractProductionApi).toHaveBeenCalledWith({
    month: 1,
    financial_year_id: 1,
  });
});
test('changing Settings financial year resets the report and uses a separate cache key', () => {
  render();
  year = { id: 2, financial_year: '2024-25', start_date: '2024-04-01' };
  act(() => tree.update(<ContractorScreen />));
  expect(texts()).toContain('September 2024');
  expect(reportOptions.queryKey).toContain(2);
  reportOptions.queryFn();
  expect(getContractProductionApi).toHaveBeenCalledWith({
    month: 9,
    financial_year_id: 2,
  });
});
test('report errors hide totals and offer retry', () => {
  report.isError = true;
  report.error = {
    response: { data: { message: 'Please refresh the financial year.' } },
  };
  render();
  expect(texts()).toContain('Please refresh the financial year.');
  expect(texts()).not.toContain('Bhagat');
  act(() => button('Retry production').props.onPress());
  expect(refetch).toHaveBeenCalled();
});
test('missing financial year prevents report loading', () => {
  year = null;
  reportOptions = null;
  render();
  expect(reportOptions).toBeNull();
  expect(texts()).toContain('Set a current financial year');
});
