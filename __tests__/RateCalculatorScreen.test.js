import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { TextInput, Text } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import RateCalculatorScreen from '../src/screens/common/RateCalculatorScreen';

jest.mock('react-redux', () => ({
  useSelector: () => ({ role: 'superadmin' }),
}));
jest.mock('@react-navigation/native', () => ({ useFocusEffect: jest.fn() }));
jest.mock('../src/utils/responsive', () => ({
  useResponsive: () => ({ isTablet: true, contentMaxWidth: 920 }),
  centeredContent: () => ({ maxWidth: 920 }),
}));

test('six editable inputs calculate live and reset on screen re-entry', () => {
  let tree;
  act(() => {
    tree = renderer.create(<RateCalculatorScreen />);
  });
  const input = id =>
    tree.root.findAllByType(TextInput).find(node => node.props.testID === id);
  const change = (id, value) => act(() => input(id).props.onChangeText(value));
  expect(tree.root.findAllByType(TextInput)).toHaveLength(6);
  expect(input('plantCost').props.value).toBe('7');
  expect(input('profit').props.value).toBe('3');
  change('oldWeight', '414');
  change('newWeight', '443');
  change('zincRate', '446');
  expect(
    tree.root
      .findAllByType(Text)
      .find(node => node.props.testID === 'finalRate').props.children,
  ).toBe('₹41.24');
  change('plantCost', '5.5');
  change('profit', '8');
  act(() => useFocusEffect.mock.calls.at(-1)[0]());
  expect(input('plantCost').props.value).toBe('7');
  expect(input('profit').props.value).toBe('3');
  expect(input('oldWeight').props.value).toBe('');
  act(() => tree.unmount());
});
