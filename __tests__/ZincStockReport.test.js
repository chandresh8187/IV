import React from 'react';
import { act, create } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import ZincStockReportScreen from '../src/screens/common/ZincStockReportScreen';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('@react-navigation/native', () => ({ useFocusEffect: jest.fn() }));
jest.mock('@tanstack/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('../src/api/zincStockApi', () => ({ getZincMovementsApi: jest.fn() }));
jest.mock('../src/utils/serverZincStockReport', () => ({ downloadZincStockReport: jest.fn() }));
const text = tree => tree.root.findAllByType(Text).map(node => node.props.children).flat().join(' ');
let tree;
afterEach(() => { if (tree) act(() => tree.unmount()); tree = null; });
beforeEach(() => {
  useSelector.mockReturnValue({ role: 'admin', permissions: ['zinc_stock.view'] });
  useQuery.mockReturnValue({ refetch: jest.fn(), data: { pagination: { has_more: true }, data: [
    { id: 1, movement_type: 'production_summary', transaction_date: '2026-10-15', shift_name: 'night', amount_kg: 45 },
    { id: 2, movement_type: 'receive', transaction_date: '2026-10-16', amount_kg: 500, plant_after_kg: 2000, kettle_after_kg: 1000, batch_number: 'B-12', invoice_number: 'INV/44' },
  ] } });
});

test('view-only users see shift summaries and receipt references', () => {
  act(() => { tree = create(<ZincStockReportScreen navigation={{ navigate: jest.fn() }} />); });
  expect(text(tree)).toContain('Night shift');
  expect(text(tree)).toContain('Production usage');
  expect(text(tree)).toContain('45 kg');
  expect(text(tree)).toContain('Batch:  B-12');
  expect(text(tree)).toContain('Invoice:  INV/44');
  const next = tree.root.findAllByType(TouchableOpacity).find(node => node.findAllByType(Text).some(t => t.props.children === 'Next'));
  act(() => next.props.onPress());
  expect(useQuery.mock.calls.at(-1)[0].queryKey).toEqual(['zinc-stock-movements', 2]);
});

test('revoked view permission disables transaction fetching', () => {
  useSelector.mockReturnValue({ role: 'admin', permissions: [] });
  act(() => { tree = create(<ZincStockReportScreen navigation={{ navigate: jest.fn() }} />); });
  expect(text(tree)).toContain('do not have zinc stock access');
  expect(useQuery.mock.calls.at(-1)[0].enabled).toBe(false);
});


test('production summary displays each batch and invoice quantity', () => {
  useQuery.mockReturnValue({ refetch: jest.fn(), data: { pagination: { has_more: false }, data: [
    { id: 7, movement_type: 'production_summary', transaction_date: '2026-10-16', shift_name: 'day', amount_kg: 5000,
      batch_allocations: [
        { lot_key: 'receipt:1', receipt_id: 1, batch_number: '123456', invoice_number: 'INV-1', amount_kg: 3000 },
        { lot_key: 'receipt:2', receipt_id: 2, batch_number: '654321', invoice_number: 'INV-2', amount_kg: 2000 },
      ] },
  ] } });
  act(() => { tree = create(<ZincStockReportScreen navigation={{ navigate: jest.fn() }} />); });
  const content = text(tree);
  expect(content).toContain('3,000');
  expect(content).toContain('2,000');
  expect(content).toContain('123456');
  expect(content).toContain('654321');
  expect(content).toContain('INV-1');
  expect(content).toContain('INV-2');
});
