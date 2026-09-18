import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Animated, PanResponder, Text, View } from 'react-native';
import {
  closestPlanningPosition,
  movePlanningItem,
  movedPlanningIndex,
} from '../src/utils/planningOrder';
import ReorderablePlanningFlow from '../src/components/ReorderablePlanningFlow';

jest.mock('lucide-react-native', () => ({ GripVertical: 'GripVertical' }));
const items = [
  { id: 11, item_name: 'W Beam', completed_qty: 50, planned_qty: 100 },
  { id: 12, item_name: 'Column', completed_qty: 0, planned_qty: 100 },
  { id: 13, item_name: 'Angle', completed_qty: 0, planned_qty: 100 },
];

describe('playlist-style planning flow', () => {
  test('moves 3 to 1 while shifting other items and preserving production totals and IDs', () => {
    const reordered = movePlanningItem(items, 2, 0);
    expect(reordered.map(item => item.item_name)).toEqual([
      'Angle',
      'W Beam',
      'Column',
    ]);
    expect(reordered[1]).toBe(items[0]);
    expect(reordered[1].completed_qty).toBe(50);
    expect(items.map(item => item.id)).toEqual([11, 12, 13]);
    expect(movePlanningItem(reordered, 0, 2)).toEqual(items);
  });
  test('moving the first item to the end preserves the order of the others', () => {
    expect(movePlanningItem(items, 0, 2).map(item => item.id)).toEqual([
      12, 13, 11,
    ]);
  });
  test.each([
    [0, 2, 0, 1],
    [1, 2, 0, 2],
    [2, 2, 0, 0],
    [1, 0, 2, 0],
    [2, 0, 2, 1],
    [0, 0, 2, 2],
    [null, 2, 0, null],
  ])(
    'keeps the editing form attached to its original item: %s moving %s to %s',
    (index, from, to, expected) => {
      expect(movedPlanningIndex(index, from, to)).toBe(expected);
    },
  );
  test.each([
    [-1, 0],
    [0, 4],
    [0, 0],
  ])(
    'invalid or unchanged positions %s / %s leave the array alone',
    (from, to) => {
      expect(movePlanningItem(items, from, to)).toBe(items);
    },
  );
  test('drop targeting supports variable-height cards', () => {
    const layouts = [
      { y: 0, height: 100 },
      { y: 110, height: 180 },
      { y: 300, height: 100 },
    ];
    expect(closestPlanningPosition(layouts, 45, 2)).toBe(0);
    expect(closestPlanningPosition(layouts, 180, 2)).toBe(1);
    expect(closestPlanningPosition([], 45, 2)).toBe(2);
  });
});

describe('planning drag handles', () => {
  let tree;
  let handlers;
  let onReorder;
  let onDraggingChange;
  beforeEach(() => {
    handlers = [];
    onReorder = jest.fn();
    onDraggingChange = jest.fn();
    jest.spyOn(PanResponder, 'create').mockImplementation(config => {
      handlers.push(config);
      return { panHandlers: {} };
    });
    jest.spyOn(global, 'requestAnimationFrame').mockImplementation(() => 1);
    jest.spyOn(global, 'cancelAnimationFrame').mockImplementation(() => {});
    act(() => {
      tree = renderer.create(
        <ReorderablePlanningFlow
          items={items}
          onReorder={onReorder}
          onDraggingChange={onDraggingChange}
          renderItem={item => <Text>{item.item_name}</Text>}
        />,
      );
    });
    tree.root.findAllByType(Animated.View).forEach((row, index) => {
      act(() =>
        row.props.onLayout({
          nativeEvent: { layout: { y: index * 110, height: 100 } },
        }),
      );
    });
  });
  afterEach(() => {
    act(() => tree.unmount());
    jest.restoreAllMocks();
  });
  test('dragging third card onto first commits the move only on release', () => {
    const handle = handlers[2];
    act(() => handle.onPanResponderGrant({}, { y0: 270 }));
    act(() => handle.onPanResponderMove({}, { dy: -220, moveY: 50 }));
    expect(onReorder).not.toHaveBeenCalled();
    act(() => handle.onPanResponderRelease());
    expect(onReorder).toHaveBeenCalledWith(2, 0, items);
    expect(onDraggingChange.mock.calls.map(call => call[0])).toEqual([
      true,
      false,
    ]);
  });
  test('a realtime refresh during a drag keeps the original queue snapshot', () => {
    const handle = handlers[2];
    act(() => handle.onPanResponderGrant({}, { y0: 270 }));
    act(() => {
      tree.update(
        <ReorderablePlanningFlow
          items={[items[1], items[0], items[2]]}
          onReorder={onReorder}
          onDraggingChange={onDraggingChange}
          renderItem={item => <Text>{item.item_name}</Text>}
        />,
      );
    });
    act(() => handle.onPanResponderMove({}, { dy: -220, moveY: 50 }));
    act(() => handle.onPanResponderRelease());
    expect(onReorder).toHaveBeenCalledWith(2, 0, items);
  });
  test('cancelling a drag leaves the saved order untouched', () => {
    const handle = handlers[2];
    act(() => handle.onPanResponderGrant({}, { y0: 270 }));
    act(() => handle.onPanResponderMove({}, { dy: -220, moveY: 50 }));
    act(() => handle.onPanResponderTerminate());
    expect(onReorder).not.toHaveBeenCalled();
    expect(onDraggingChange).toHaveBeenLastCalledWith(false);
  });
  test('screen-reader users can adjust positions without dragging', () => {
    const handle = tree.root
      .findAllByType(View)
      .find(node => node.props.accessibilityLabel === 'Reorder Angle');
    act(() =>
      handle.props.onAccessibilityAction({
        nativeEvent: { actionName: 'decrement' },
      }),
    );
    expect(onReorder).toHaveBeenCalledWith(2, 1, items);
  });
});
