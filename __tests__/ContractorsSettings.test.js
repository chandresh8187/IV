import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Alert, Text, TouchableOpacity } from 'react-native';
import {
  createContractorApi,
  updateContractorApi,
  deleteContractorApi,
} from '../src/api/contractorApi';
import { useSelector } from 'react-redux';
import { useQuery, useMutation } from '@tanstack/react-query';
import ContractorsScreen from '../src/screens/settings/ContractorsScreen';
import SettingsMenuScreen from '../src/screens/settings/SettingsMenuScreen';

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
const mockInvalidate = jest.fn();
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: () => ({ invalidateQueries: mockInvalidate }),
}));
jest.mock('react-native-paper', () => ({ TextInput: 'TextInput' }));
jest.mock(
  'react-native-paper/lib/module/components/TextInput/TextInput',
  () => 'TextInput',
);
jest.mock('lucide-react-native', () => ({
  HardHat: 'HardHat',
  Plus: 'Plus',
  Save: 'Save',
  CheckCircle2: 'CheckCircle2',
  Pencil: 'Pencil',
  Trash2: 'Trash2',
}));
jest.mock('../src/components/ModuleMenu', () => 'ModuleMenu');
jest.mock('../src/api/contractorApi', () => ({
  createContractorApi: jest.fn(),
  updateContractorApi: jest.fn(),
  deleteContractorApi: jest.fn(),
  getContractorDirectoryApi: jest.fn(),
}));
jest.mock('../src/utils/responsive', () => ({
  useResponsive: () => ({ contentMaxWidth: 920 }),
  centeredContent: () => ({ maxWidth: 920 }),
}));
let tree;
let mutate;
let refetch;
const text = () =>
  tree.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat()
    .join(' ');
const input = label =>
  tree.root.findAllByType('TextInput').find(node => node.props.label === label);
const mutationOptions = api =>
  useMutation.mock.calls
    .filter(([options]) => options.mutationFn === api)
    .at(-1)[0];
const tap = label =>
  act(() =>
    tree.root
      .findAllByType(TouchableOpacity)
      .find(node => node.props.accessibilityLabel === label)
      .props.onPress(),
  );
beforeEach(() => {
  jest.clearAllMocks();
  useSelector.mockReturnValue({ role: 'plant_manager' });
  mutate = jest.fn();
  refetch = jest.fn();
  useQuery.mockReturnValue({
    data: {
      data: [
        { id: 1, name: 'Bintu' },
        { id: 2, name: 'Bhagat' },
      ],
    },
    refetch,
  });
  useMutation.mockReturnValue({ mutate, isPending: false });
});
afterEach(() => {
  if (tree) act(() => tree.unmount());
  tree = null;
});
const render = () =>
  act(() => {
    tree = renderer.create(<ContractorsScreen />);
  });

test('lists and searches contractors using a directory-only query', () => {
  render();
  expect(text()).toContain('Bintu');
  expect(text()).toContain('Bhagat');
  expect(useQuery.mock.calls.at(-1)[0].queryKey).toEqual([
    'contractors',
    'directory',
  ]);
  act(() => input('Search contractors').props.onChangeText('BHAG'));
  expect(text()).not.toContain('Bintu');
  expect(text()).toContain('Bhagat');
});
test('validates empty and duplicate names then saves a normalized contractor', () => {
  render();
  tap('Add contractor');
  tap('Save contractor');
  expect(text()).toContain('Enter a contractor name.');
  act(() => input('Contractor name').props.onChangeText(' bintu '));
  tap('Save contractor');
  expect(mutate).not.toHaveBeenCalled();
  expect(text()).toContain('already exists');
  act(() => input('Contractor name').props.onChangeText('  New   Contractor '));
  tap('Save contractor');
  expect(mutate).toHaveBeenCalledWith('New Contractor');
  act(() => mutationOptions(createContractorApi).onSuccess());
  expect(input('Contractor name')).toBeUndefined();
  expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['contractors'] });
  expect(text()).toContain('Contractor added successfully');
});
test('failed save retains the form and cancel clears it', () => {
  render();
  tap('Add contractor');
  act(() => input('Contractor name').props.onChangeText('New'));
  act(() =>
    mutationOptions(createContractorApi).onError({
      response: { data: { message: 'Connection failed' } },
    }),
  );
  expect(text()).toContain('Connection failed');
  expect(input('Contractor name').props.value).toBe('New');
  tap('Cancel adding contractor');
  tap('Add contractor');
  expect(input('Contractor name').props.value).toBe('');
});
test('permission overrides hide add controls and gate fetching', () => {
  useSelector.mockReturnValue({
    role: 'plant_manager',
    permissions: ['contractors.view'],
  });
  render();
  expect(text()).toContain('Bintu');
  expect(tree.root.findAllByType(TouchableOpacity)).toHaveLength(0);
  useSelector.mockReturnValue({ role: 'plant_manager', permissions: [] });
  act(() => tree.update(<ContractorsScreen />));
  expect(useQuery.mock.calls.at(-1)[0].enabled).toBe(false);
  expect(text()).toContain('do not have contractor access');
});
test('load errors expose retry and empty lists show the add prompt', () => {
  useQuery.mockReturnValue({ isError: true, refetch });
  render();
  tap('Retry contractors');
  expect(refetch).toHaveBeenCalled();
  useQuery.mockReturnValue({ data: { data: [] }, refetch });
  act(() => tree.update(<ContractorsScreen />));
  expect(text()).toContain('No contractors added yet');
});
test('Settings menu opens the new Contractors route', () => {
  const navigate = jest.fn();
  act(() => {
    tree = renderer.create(<SettingsMenuScreen navigation={{ navigate }} />);
  });
  const menu = tree.root.findByType('ModuleMenu');
  const action = menu.props.actions.find(item => item.title === 'Contractors');
  expect(action).toBeDefined();
  act(() => menu.props.onSelect(action));
  expect(navigate).toHaveBeenCalledWith('Contractors');
});

test('edits a contractor by ID and permits keeping its own name', () => {
  render();
  tap('Edit Bintu');
  expect(input('Contractor name').props.value).toBe('Bintu');
  tap('Save contractor');
  expect(mutate).toHaveBeenCalledWith({ id: 1, name: 'Bintu' });
  act(() => input('Contractor name').props.onChangeText('Bintu Team'));
  tap('Save contractor');
  expect(mutate).toHaveBeenLastCalledWith({ id: 1, name: 'Bintu Team' });
  act(() => mutationOptions(updateContractorApi).onSuccess());
  expect(text()).toContain('Contractor updated successfully');
});
test('delete requires confirmation and displays linked-production errors', () => {
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  render();
  tap('Delete Bintu');
  expect(mutate).not.toHaveBeenCalled();
  act(() => alert.mock.calls.at(-1)[2][1].onPress());
  expect(mutate).toHaveBeenCalledWith(1);
  act(() =>
    mutationOptions(deleteContractorApi).onError({
      response: { data: { message: 'Linked to production' } },
    }),
  );
  expect(alert).toHaveBeenLastCalledWith(
    'Could not delete contractor',
    'Linked to production',
  );
  alert.mockRestore();
});
