import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Alert, Text, TouchableOpacity } from 'react-native';
import { useSelector } from 'react-redux';
import { useMutation, useQuery } from '@tanstack/react-query';
import ContractorScreen from '../src/screens/common/ContractorScreen';
import { formatDateForApi } from '../src/utils/format';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: () => ({ invalidateQueries: jest.fn() }),
}));
jest.mock('@react-native-community/datetimepicker', () => 'DateTimePicker');
jest.mock('../src/utils/responsive', () => ({
  useResponsive: () => ({ contentMaxWidth: 920 }),
  centeredContent: () => ({ maxWidth: 920 }),
}));
jest.mock('../src/api/contractorApi', () => ({
  createContractorApi: jest.fn(),
  getContractorsApi: jest.fn(),
  getContractorReportApi: jest.fn(),
  saveContractorAssignmentApi: jest.fn(),
}));

let tree;
let mutate;
const today = formatDateForApi(new Date());
const production = {
  contractor_id: 1,
  contractor_name: 'Contractor A',
  shift_date: today,
  shift_name: 'day',
  shift_count: 1,
  entry_count: 2,
  qty: 15,
  ms_kg: 1500,
  gi_kg: 1605,
};
const texts = () =>
  tree.root
    .findAllByType(Text)
    .map(node => React.Children.toArray(node.props.children).join(''));
const tap = label =>
  act(() =>
    tree.root
      .findAllByType(TouchableOpacity)
      .find(node => node.props.children?.props?.children === label)
      .props.onPress(),
  );

beforeEach(() => {
  mutate = jest.fn();
  useSelector.mockReturnValue({ role: 'plant_manager' });
  useMutation.mockReturnValue({ mutate, isPending: false });
  useQuery.mockImplementation(({ queryKey }) => ({
    data: {
      data:
        queryKey[0] === 'contractors'
          ? {
              contractors: [
                { id: 1, name: 'Contractor A' },
                { id: 2, name: 'Contractor B' },
              ],
              assignments: [
                {
                  id: 3,
                  contractor_id: 1,
                  contractor_name: 'Contractor A',
                  shift_name: 'day',
                  effective_from: today,
                },
              ],
            }
          : {
              from: '2026-04-01',
              to: '2027-03-31',
              financial_year: '2026-27',
              summaries: [production],
              shifts: [production],
            },
    },
  }));
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(() => {
  if (tree) act(() => tree.unmount());
  tree = null;
  jest.restoreAllMocks();
});

test('report renders weight totals and switches to tonnes', () => {
  act(() => {
    tree = renderer.create(<ContractorScreen />);
  });
  expect(texts()).toContain('1,605.00 kg');
  tap('Tonnes (t)');
  expect(texts()).toContain('1.605 t');
  expect(texts()).toContain('Date-wise shift breakdown');
});

test('existing repeating assignment is preselected and saved only after confirmation', () => {
  act(() => {
    tree = renderer.create(<ContractorScreen />);
  });
  tap('Shift assignments');
  tap('Save repeating assignment');
  expect(mutate).not.toHaveBeenCalled();
  const buttons = Alert.alert.mock.calls.at(-1)[2];
  act(() => buttons[1].onPress());
  expect(mutate).toHaveBeenCalledWith({
    shift_name: 'day',
    effective_from: today,
    contractor_id: 1,
    expected_id: 3,
    expected_contractor_id: 1,
  });
});

test('admin can view assignments but cannot add or assign contractors by default', () => {
  useSelector.mockReturnValue({ role: 'admin' });
  act(() => {
    tree = renderer.create(<ContractorScreen />);
  });
  tap('Shift assignments');
  expect(texts()).toContain('Repeating assignments');
  expect(texts()).not.toContain('Save repeating assignment');
  expect(texts()).not.toContain('Add contractor');
});
