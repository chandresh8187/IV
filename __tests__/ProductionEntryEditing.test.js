import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Alert, Text, TouchableOpacity } from 'react-native';
import { TextInput } from 'react-native-paper';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import ProductionScreen from '../src/screens/superadmin/ProductionScreen';

jest.mock('@react-navigation/native', () => ({ useFocusEffect: jest.fn() }));
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: () => ({}),
}));
jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('lucide-react-native', () => ({
  Clock3: 'Clock3',
  Plus: 'Plus',
  LockKeyhole: 'LockKeyhole',
  Pencil: 'Pencil',
  X: 'X',
}));
jest.mock('react-native-paper', () => ({ TextInput: 'TextInput' }));
jest.mock(
  'react-native-paper/lib/module/components/TextInput/TextInput',
  () => 'TextInput',
);
jest.mock('react-native-dropdown-picker', () => 'DropDownPicker');
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: 'SafeAreaView',
}));
jest.mock('../src/utils/responsive', () => ({
  getGridColumns: jest.requireActual('../src/utils/responsive').getGridColumns,
  useResponsive: () => ({}),
  centeredContent: () => ({}),
}));
jest.mock('../src/components/ShiftCorrectionControls', () => () => null);
jest.mock('../src/components/AnimatedRefreshButton', () => () => null);
jest.mock('../src/components/ProductionTable', () => {
  const ReactMock = require('react');
  return ({ rows, renderAction }) => (
    <>
      {rows.map(row => (
        <ReactMock.Fragment key={row.id}>
          {renderAction?.(row)}
        </ReactMock.Fragment>
      ))}
    </>
  );
});
jest.mock('../src/api/productionApi', () => ({
  getProductionsApi: jest.fn(),
  grantProductionEditApi: jest.fn(),
  saveProductionApi: jest.fn(),
}));
jest.mock('../src/api/userApi', () => ({ getUsersApi: jest.fn() }));
jest.mock('../src/api/shiftApi', () => ({
  getProductionShiftStatusApi: jest.fn(),
  getCorrectionPlanningItemsApi: jest.fn(),
}));
jest.mock('../src/api/productionPlanningApi', () => ({
  getAvailablePlanningApi: jest.fn(),
}));

const entry = {
  id: 41,
  sr_no: 7,
  can_edit: true,
  planning_id: 12,
  planning_item_id: 18,
  challan_no: 'OLD-12',
  material: 'MS W BEAM 1.7mm',
  production_time: '13:30:00',
  dipping_qty: 25,
  ms_weight: 100,
  gi_weight: 107,
};
const plan = {
  id: 20,
  planning_item_id: 24,
  challan_no: 'NEW-20',
  material_description: 'MS COLUMN 3mm',
  remaining_qty: 100,
};

describe('production editing via row actions', () => {
  let tree;
  let mutate;
  let alert;
  beforeEach(() => {
    mutate = jest.fn();
    alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    useSelector.mockReturnValue({ role: 'superadmin' });
    useMutation.mockReturnValue({ mutate, isPending: false });
    useQuery.mockImplementation(({ queryKey }) => {
      const results = {
        productions: { data: [entry] },
        'available-production-planning': { data: [plan] },
        'shift-status': {
          data: { active_shift: { id: 3, shift_date: '2026-09-13' } },
        },
      };
      return { data: results[queryKey[0]], refetch: jest.fn() };
    });
  });
  afterEach(() => {
    if (tree) act(() => tree.unmount());
    alert.mockRestore();
  });
  const renderScreen = () =>
    act(() => {
      tree = renderer.create(<ProductionScreen />);
    });
  const input = label =>
    tree.root.findAllByType(TextInput).find(node => node.props.label === label);
  const press = label =>
    act(() => {
      tree.root
        .findAllByType(TouchableOpacity)
        .find(node => node.props.accessibilityLabel === label)
        .props.onPress();
    });
  const save = () =>
    act(() => {
      tree.root
        .findAllByType(TouchableOpacity)
        .find(node =>
          node
            .findAllByType(Text)
            .some(text => text.props.children === 'SAVE PRODUCTION ENTRY'),
        )
        .props.onPress();
    });

  test.each([
    ['admin', 20],
    ['supervisor', 10],
    ['plant_manager', 10],
    ['superadmin', 10],
  ])(
    '%s views shift %s when correction mode is active',
    (role, expectedShift) => {
      useSelector.mockReturnValue({ role });
      const previousQuery = useQuery.getMockImplementation();
      useQuery.mockImplementation(options =>
        options.queryKey[0] === 'shift-status'
          ? {
              data: {
                data: {
                  correction_mode: true,
                  shift_revision: 5,
                  active_shift: { id: 20, shift_name: 'day' },
                  production_shift: { id: 10, shift_name: 'night' },
                },
              },
            }
          : previousQuery(options),
      );
      useQuery.mockClear();
      renderScreen();
      const productionQuery = useQuery.mock.calls.find(
        ([options]) => options.queryKey[0] === 'productions',
      )[0];
      expect(productionQuery.queryKey).toEqual([
        'productions',
        expectedShift,
        role === 'admin' ? 0 : 5,
      ]);
    },
  );

  test.each(['superadmin', 'plant_manager', 'admin', 'supervisor'])(
    'adding requires no SR input for %s',
    role => {
      useSelector.mockReturnValue({ role, permissions: ['production.save'] });
      renderScreen();
      press('Add production entry');
      expect(tree.root.findByType('DropDownPicker').props.value).toBeNull();
      act(() =>
        tree.root.findByType('DropDownPicker').props.setValue(() => 24),
      );
      expect(input('Sr No')).toBeUndefined();
      expect(input('Sr No (auto)')).toBeUndefined();
      expect(input('Production Time').props.value).toBe('');
      const qtyInput = tree.root
        .findAllByType(TextInput)
        .find(node => /Dipping/.test(node.props.label));
      act(() => qtyInput.props.onChangeText('10'));
      // Choose a production time through the existing picker flow.
      const timeButton = tree.root
        .findAllByType(TouchableOpacity)
        .find(node =>
          node
            .findAllByType(TextInput)
            .some(field => field.props.label === 'Production Time'),
        );
      act(() => timeButton.props.onPress());
      act(() =>
        tree.root
          .findByType('DateTimePicker')
          .props.onChange({ type: 'set' }, new Date(2026, 8, 13, 14, 0)),
      );
      expect(qtyInput.props.value).toBe('10');
      save();
      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          entry_id: 0,
          sr_no: '8',
          planning_item_id: 24,
          challan_no: 'NEW-20',
          dipping_qty: 10,
        }),
      );
    },
  );

  test.each(['superadmin', 'supervisor'])(
    'Edit opens the selected row by ID without an SR input for %s',
    role => {
      useSelector.mockReturnValue({ role });
      renderScreen();
      press('Edit production entry 41');
      expect(input('Sr No')).toBeUndefined();
      save();
      expect(mutate).toHaveBeenCalledWith(
        expect.objectContaining({
          entry_id: 41,
          sr_no: '7',
          planning_item_id: 18,
          challan_no: 'OLD-12',
          dipping_qty: 25,
        }),
      );
    },
  );

  test('supervisor add keeps automatic next SR after editing', () => {
    useSelector.mockReturnValue({ role: 'supervisor' });
    renderScreen();
    press('Edit production entry 41');
    press('Close production form');
    press('Add production entry');
    expect(input('Sr No (auto)')).toBeUndefined();
    expect(input('Production Time').props.value).toBe('');
  });

  test('any pending challan can be selected and the balance follows the selected quantity', () => {
    const previousQuery = useQuery.getMockImplementation();
    useQuery.mockImplementation(options =>
      options.queryKey[0] === 'available-production-planning'
        ? {
            data: {
              data: [
                plan,
                {
                  ...plan,
                  id: 21,
                  planning_item_id: 99,
                  challan_no: 'PARTY/99',
                  completed_qty: 40,
                  planned_qty: 100,
                  remaining_qty: 60,
                },
              ],
            },
          }
        : previousQuery(options),
    );
    renderScreen();
    press('Add production entry');
    act(() => tree.root.findByType('DropDownPicker').props.setValue(() => 99));
    const picker = tree.root.findByType('DropDownPicker');
    expect(picker.props.value).toBe(99);
    expect(picker.props.items).toHaveLength(2);
    const quantity = tree.root
      .findAllByType(TextInput)
      .find(node => /Dipping/.test(node.props.label));
    act(() => quantity.props.onChangeText('10'));
    const texts = tree.root
      .findAllByType(Text)
      .map(node => React.Children.toArray(node.props.children).join(''));
    expect(texts).toContain('PARTY/99');
    expect(
      texts.some(text => /Balance after this entry: 50 NOS/.test(text)),
    ).toBe(true);
  });

  test('a removed or completed selected challan cannot silently switch to another material', () => {
    renderScreen();
    press('Add production entry');
    act(() => tree.root.findByType('DropDownPicker').props.setValue(() => 24));
    const qtyInput = tree.root
      .findAllByType(TextInput)
      .find(node => /Dipping/.test(node.props.label));
    act(() => qtyInput.props.onChangeText('10'));
    const timeButton = tree.root
      .findAllByType(TouchableOpacity)
      .find(node =>
        node
          .findAllByType(TextInput)
          .some(field => field.props.label === 'Production Time'),
      );
    act(() => timeButton.props.onPress());
    act(() =>
      tree.root
        .findByType('DateTimePicker')
        .props.onChange({ type: 'set' }, new Date(2026, 8, 13, 14, 0)),
    );
    const previousQuery = useQuery.getMockImplementation();
    useQuery.mockImplementation(options =>
      options.queryKey[0] === 'available-production-planning'
        ? { data: { data: [{ ...plan, planning_item_id: 99 }] } }
        : previousQuery(options),
    );
    act(() => tree.update(<ProductionScreen />));
    save();
    expect(mutate).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledWith(
      'Select a planning challan',
      expect.any(String),
    );
  });
});
