import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import HistoryPartySummaryScreen from '../src/screens/History/HistoryPartySummaryScreen';
jest.mock('@tanstack/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('../src/api/historyApi', () => ({
  getHistoryPartySummaryApi: jest.fn(),
}));
jest.mock('../src/utils/responsive', () => ({
  getGridColumns: jest.requireActual('../src/utils/responsive').getGridColumns,
  useResponsive: () => ({}),
  centeredContent: () => ({}),
}));

describe('party material summary', () => {
  let tree;
  afterEach(() => {
    if (tree) act(() => tree.unmount());
  });
  const renderScreen = () =>
    act(() => {
      tree = renderer.create(
        <HistoryPartySummaryScreen
          route={{ params: { date: '2026-09-14', shift_name: 'night' } }}
        />,
      );
    });
  const text = () =>
    tree.root
      .findAllByType(Text)
      .map(node => node.props.children)
      .flat()
      .join(' ');
  test('the same material stays separate for two parties and uses shift-scoped data', () => {
    useQuery.mockReturnValue({
      data: {
        data: [
          {
            party_name: 'Party A',
            item_id: 3,
            material_name: 'MS COLUMN',
            total_production_qty: 25,
          },
          {
            party_name: 'Party B',
            item_id: 3,
            material_name: 'MS COLUMN',
            total_production_qty: 50,
          },
        ],
      },
    });
    renderScreen();
    expect(text()).toContain('Party A');
    expect(text()).toContain('Party B');
    expect(text().match(/MS COLUMN/g)).toHaveLength(2);
    expect(text()).toContain('25  NOS');
    expect(text()).toContain('50  NOS');
    expect(useQuery.mock.calls.at(-1)[0].queryKey).toEqual([
      'history-party-summary',
      '2026-09-14',
      'night',
    ]);
  });
  test('empty data shows a clear empty state', () => {
    useQuery.mockReturnValue({ data: { data: [] } });
    renderScreen();
    expect(text()).toContain('No production for this shift');
  });
  test('failed requests show retry instead of stale totals', () => {
    const refetch = jest.fn();
    useQuery.mockReturnValue({ isError: true, refetch });
    renderScreen();
    expect(text()).toContain('Could not load party summary');
    act(() => tree.root.findByType(TouchableOpacity).props.onPress());
    expect(refetch).toHaveBeenCalled();
  });
});
