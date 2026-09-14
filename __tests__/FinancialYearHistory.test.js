import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import HistoryListScreen from '../src/screens/History/HistoryListScreen';
import { formatDateForApi } from '../src/utils/format';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useQueryClient: jest.fn(),
}));
jest.mock('lucide-react-native', () => ({
  CalendarDays: 'CalendarDays',
  Search: 'Search',
}));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('../src/api/historyApi', () => ({
  getHistoryDatesApi: jest.fn(),
  getHistoryDateSummaryApi: jest.fn(),
}));
jest.mock('../src/api/financialYearsApi', () => ({
  getCurrentFinancialYearApi: jest.fn(),
}));
jest.mock('../src/utils/responsive', () => ({
  useResponsive: () => ({}),
  centeredContent: () => ({}),
}));

describe('financial-year production archive', () => {
  let tree;
  let year;
  let fetchQuery;
  let navigate;
  beforeEach(() => {
    year = {
      id: 3,
      financial_year: '2025-26',
      start_date: '2025-04-01',
      end_date: '2026-03-31',
    };
    fetchQuery = jest.fn().mockResolvedValue({});
    navigate = jest.fn();
    useQueryClient.mockReturnValue({ fetchQuery });
    useQuery.mockImplementation(({ queryKey }) =>
      queryKey[0] === 'current-financial-year'
        ? { data: { data: year }, isError: !year }
        : { data: { data: [{ shift_date: '2025-12-01', entry_count: 12 }] } },
    );
  });
  afterEach(() => {
    if (tree) act(() => tree.unmount());
  });
  const renderScreen = () =>
    act(() => {
      tree = renderer.create(<HistoryListScreen navigation={{ navigate }} />);
    });
  const buttonWithText = text =>
    tree.root
      .findAllByType(TouchableOpacity)
      .find(button =>
        button.findAllByType(Text).some(node => node.props.children === text),
      );

  test('picker is restricted to the selected financial year, not the current calendar year', () => {
    renderScreen();
    act(() => buttonWithText('2026-03-31').props.onPress());
    const picker = tree.root.findByType('DateTimePicker');
    expect(formatDateForApi(picker.props.minimumDate)).toBe('2025-04-01');
    expect(formatDateForApi(picker.props.maximumDate)).toBe('2026-03-31');
    expect(formatDateForApi(picker.props.value)).toBe('2026-03-31');
  });
  test('an archive date opens its existing day/night history flow', async () => {
    renderScreen();
    const dateButton = tree.root
      .findAllByType(TouchableOpacity)
      .find(button =>
        button
          .findAllByType(Text)
          .some(
            node =>
              Array.isArray(node.props.children) &&
              node.props.children.includes(' entries · View shifts'),
          ),
      );
    await act(async () => dateButton.props.onPress());
    expect(navigate).toHaveBeenCalledWith('HistoryDateDetails', {
      date: '2025-12-01',
    });
    expect(fetchQuery.mock.calls[0][0].queryKey).toEqual([
      'history-date-summary',
      '2025-12-01',
    ]);
  });
  test('no configured year blocks history fetching', () => {
    year = null;
    renderScreen();
    expect(buttonWithText('FETCH PRODUCTION').props.disabled).toBe(true);
    act(() => { buttonWithText('FETCH PRODUCTION').props.onPress(); });
    expect(fetchQuery).not.toHaveBeenCalled();
  });
  test('a request finishing after the year navigation is reset cannot reopen old history', async () => {
    let finish;
    fetchQuery.mockReturnValue(
      new Promise(resolve => {
        finish = resolve;
      }),
    );
    renderScreen();
    act(() => { buttonWithText('FETCH PRODUCTION').props.onPress(); });
    act(() => tree.unmount());
    await act(async () => finish({}));
    expect(navigate).not.toHaveBeenCalled();
    tree = null;
  });
});
