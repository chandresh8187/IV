import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Alert, Text, TouchableOpacity } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import HistoricalProductionEditScreen from '../src/screens/History/HistoricalProductionEditScreen';
import ProductionEntryForm from '../src/components/ProductionEntryForm';
import { updateHistoricalProductionApi } from '../src/api/historyApi';

jest.mock('@tanstack/react-query', () => ({
  useMutation: jest.fn(),
  useQueryClient: jest.fn(),
}));
jest.mock('../src/api/historyApi', () => ({
  updateHistoricalProductionApi: jest.fn(),
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
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('lucide-react-native', () => ({ Clock3: 'Clock3', X: 'X' }));
jest.mock('../src/utils/responsive', () => ({
  getGridColumns: jest.requireActual('../src/utils/responsive').getGridColumns,
  useResponsive: () => ({ workspaceFormMaxWidth: 1120 }),
  centeredContent: () => ({ maxWidth: 1120 }),
}));

const item = {
  id: 42,
  shift_id: 2,
  planning_id: 5,
  planning_item_id: 8,
  challan_no: 'DC/2025-26/123-1',
  party_name: 'Plant',
  material: 'MS W BEAM 1.7mm',
  production_time: '21:12:00',
  dipping_qty: 25,
  kettle_temperature: 450,
  ms_weight: 100,
  gi_weight: 107,
  c1: 80,
  c2: 90,
  c3: 100,
  c4: 110,
  c5: 120,
};
let tree;
let mutate;
let goBack;
let invalidateQueries;
let coatingRefs;
const input = label =>
  tree.root.findAllByType('TextInput').find(node => node.props.label === label);
const texts = () =>
  tree.root
    .findAllByType(Text)
    .map(node => React.Children.toArray(node.props.children).join(''));
const save = () =>
  act(() =>
    tree.root
      .findAllByType(TouchableOpacity)
      .find(node =>
        node
          .findAllByType(Text)
          .some(child => child.props.children === 'SAVE PRODUCTION ENTRY'),
      )
      .props.onPress(),
  );
beforeEach(() => {
  mutate = jest.fn();
  goBack = jest.fn();
  invalidateQueries = jest.fn();
  coatingRefs = {};
  useMutation.mockReturnValue({ mutate, isPending: false });
  useQueryClient.mockReturnValue({ invalidateQueries });
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  act(() => {
    tree = renderer.create(
      <HistoricalProductionEditScreen
        route={{ params: { item, date: '2026-03-12', shift_name: 'night' } }}
        navigation={{ goBack }}
      />,
      {
        createNodeMock: element => {
          if (/^C[1-5]$/.test(element.props.label || '')) {
            const ref = coatingRefs[element.props.label] || {
              focus: jest.fn(),
              blur: jest.fn(),
            };
            coatingRefs[element.props.label] = ref;
            return ref;
          }
          return null;
        },
      },
    );
  });
});
afterEach(() => {
  act(() => tree.unmount());
  jest.restoreAllMocks();
});

test('history uses the exact shared live form, cards, previews and read-only planning context', () => {
  expect(tree.root.findByType(ProductionEntryForm)).toBeTruthy();
  for (const title of [
    'Production Details',
    'Weight Details',
    'Coating Details',
    'Zinc Consumption',
    'Average Coating',
    '7.00%',
    'DC/2025-26/123-1',
  ])
    expect(texts()).toContain(title);
  expect(texts().some(text => text.includes('2026-03-12 · NIGHT shift'))).toBe(
    true,
  );
  expect(input('Challan No')).toBeUndefined();
  expect(input('Material')).toBeUndefined();
  expect(tree.root.findAllByType('DropDownPicker')).toHaveLength(0);
  expect(input('C5').props.value).toBe('120');
});

test('shared time picker edits the time and history save preserves original identity', async () => {
  const button = tree.root
    .findAllByType(TouchableOpacity)
    .find(node =>
      node
        .findAllByType('TextInput')
        .some(child => child.props.label === 'Production Time'),
    );
  act(() => button.props.onPress());
  const picker = tree.root.findByType('DateTimePicker');
  expect(picker.props.is24Hour).toBe(false);
  act(() =>
    picker.props.onChange({ type: 'set' }, new Date(2026, 2, 12, 22, 15)),
  );
  act(() => input('Dipping Qty').props.onChangeText('30'));
  save();
  const body = mutate.mock.calls[0][0];
  expect(body.production_time).toBe('22:15:00');
  expect(body.dipping_qty).toBe(30);
  expect(body).not.toHaveProperty('shift_id');
  expect(body).not.toHaveProperty('planning_id');
  expect(body).not.toHaveProperty('challan_no');
  await useMutation.mock.calls.at(-1)[0].mutationFn(body);
  expect(updateHistoricalProductionApi).toHaveBeenCalledWith({ id: 42, body });
});

test('invalid quantity is blocked and failed saves keep form values', () => {
  act(() => input('Dipping Qty').props.onChangeText('0'));
  save();
  expect(mutate).not.toHaveBeenCalled();
  act(() => input('Dipping Qty').props.onChangeText('30'));
  act(() =>
    useMutation.mock.calls
      .at(-1)[0]
      .onError({ response: { data: { message: 'Only 20 remain' } } }),
  );
  expect(input('Dipping Qty').props.value).toBe('30');
  expect(goBack).not.toHaveBeenCalled();
});

test('successful history edits refresh summaries, planning and contractor totals', () => {
  act(() => useMutation.mock.calls.at(-1)[0].onSuccess({ message: 'Saved' }));
  for (const key of [
    'history-shift-table',
    'history-material-summary',
    'history-planning-summary',
    'history-party-summary',
    'production-planning',
    'contractor-report',
  ])
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: [key] });
  expect(goBack).not.toHaveBeenCalled();
  act(() => Alert.alert.mock.calls.at(-1)[2][0].onPress());
  expect(goBack).toHaveBeenCalledTimes(1);
});

test('coating boxes wait for two digits and advance on three or keyboard Next', () => {
  act(() => input('C1').props.onChangeText('85'));
  expect(input('C1').props.value).toBe('85');
  expect(coatingRefs.C2.focus).not.toHaveBeenCalled();
  act(() => input('C1').props.onSubmitEditing());
  expect(coatingRefs.C2.focus).toHaveBeenCalledTimes(1);
  act(() => input('C1').props.onChangeText('850'));
  expect(input('C1').props.value).toBe('850');
  expect(coatingRefs.C2.focus).toHaveBeenCalledTimes(2);
  act(() => input('C1').props.onChangeText('85'));
  expect(coatingRefs.C2.focus).toHaveBeenCalledTimes(2);
  expect(texts()).toContain('101');
});

test('Backspace only navigates backwards from an empty coating box', () => {
  const backspace = label =>
    act(() => input(label).props.onKeyPress({ nativeEvent: { key: 'Backspace' } }));
  backspace('C2');
  expect(coatingRefs.C1.focus).not.toHaveBeenCalled();
  act(() => input('C2').props.onChangeText(''));
  backspace('C2');
  expect(coatingRefs.C1.focus).toHaveBeenCalledTimes(1);
  expect(input('C1').props.value).toBe('80');
  act(() => input('C1').props.onChangeText(''));
  expect(() => backspace('C1')).not.toThrow();
});

test('coating inputs reject invalid readings and finish without automatically saving', () => {
  for (const value of ['1234', 'a85', '8.5', '-85']) {
    act(() => input('C1').props.onChangeText(value));
    expect(input('C1').props.value).toBe('80');
  }
  act(() => input('C5').props.onChangeText('125'));
  expect(input('C5').props.value).toBe('125');
  act(() => input('C5').props.onSubmitEditing());
  expect(coatingRefs.C5.blur).toHaveBeenCalledTimes(1);
  expect(mutate).not.toHaveBeenCalled();
  expect(input('C1').props.selectTextOnFocus).toBe(true);
  expect(input('C1').props.submitBehavior).toBe('submit');
  expect(input('C5').props.returnKeyType).toBe('done');
});
