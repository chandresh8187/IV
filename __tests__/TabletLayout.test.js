import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Text, View, useWindowDimensions } from 'react-native';
import { getGridColumns, useResponsive } from '../src/utils/responsive';
import ResponsiveGrid from '../src/components/ResponsiveGrid';
import { createTabScreenOptions } from '../src/navigation/tabOptions';
jest.mock('@react-navigation/elements', () => ({
  PlatformPressable: 'PlatformPressable',
}));

jest.mock('react-native/Libraries/Utilities/useWindowDimensions', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    width: 800,
    height: 1280,
    fontScale: 1,
    scale: 1,
  })),
}));

describe('tablet responsive layouts', () => {
  let tree;
  afterEach(() => {
    if (tree) act(() => tree.unmount());
  });
  test('sidebar uses a bounded violet ripple and preserves navigation handlers', () => {
    const options = createTabScreenOptions(
      {},
      true,
    )({ route: { name: 'Production' } });
    const onPress = jest.fn();
    act(() => {
      tree = renderer.create(
        options.tabBarButton({
          onPress,
          'aria-selected': true,
          android_ripple: { borderless: true },
        }),
      );
    });
    const button = tree.root.findByType('PlatformPressable');
    expect(button.props.android_ripple.borderless).toBe(false);
    expect(button.props.android_ripple.color).toBe('rgba(101,84,192,0.10)');
    expect(button.props['aria-selected']).toBe(true);
    act(() => button.props.onPress());
    expect(onPress).toHaveBeenCalled();
    expect(
      createTabScreenOptions({}, false)({ route: { name: 'Production' } })
        .tabBarButton,
    ).toBeUndefined();
  });
  test.each([
    [393, 852, 1, false, false],
    [800, 1280, 1, true, false],
    [1280, 800, 1, true, true],
    [540, 800, 1, false, false],
    [1280, 800, 1.5, true, false],
  ])(
    '%s × %s at text scale %s uses an appropriate tablet and rail layout',
    (width, height, fontScale, tablet, rail) => {
      useWindowDimensions.mockReturnValue({
        width,
        height,
        fontScale,
        scale: 1,
      });
      let result;
      function Probe() {
        result = useResponsive();
        return null;
      }
      act(() => {
        tree = renderer.create(<Probe />);
      });
      expect(result.isTablet).toBe(tablet);
      expect(result.useNavigationRail).toBe(rail);
      expect(
        createTabScreenOptions(
          {},
          result.useNavigationRail,
        )({ route: { name: 'Production' } }).tabBarPosition,
      ).toBe(rail ? 'left' : 'bottom');
    },
  );
  test.each([
    [350, 1, 1],
    [680, 1, 1],
    [800, 1, 2],
    [1200, 1, 2],
    [800, 1.5, 1],
  ])(
    'grid at width %s and scale %s uses %s columns',
    (width, scale, columns) => {
      expect(getGridColumns(width, scale)).toBe(columns);
    },
  );
  test('grid uses measured scene width and preserves children during resizing', () => {
    useWindowDimensions.mockReturnValue({
      width: 1280,
      height: 800,
      fontScale: 1,
      scale: 1,
    });
    const mounted = jest.fn();
    function Cell({ label }) {
      React.useEffect(() => {
        mounted(label);
      }, [label]);
      return <Text>{label}</Text>;
    }
    act(() => {
      tree = renderer.create(
        <ResponsiveGrid>
          <Cell key="a" label="A" />
          <Cell key="b" label="B" />
        </ResponsiveGrid>,
      );
    });
    const grid = tree.root
      .findAllByType(View)
      .find(node => node.props.onLayout);
    act(() => grid.props.onLayout({ nativeEvent: { layout: { width: 800 } } }));
    expect(
      grid
        .findAllByType(View)
        .filter(node => node !== grid)
        .map(node => node.props.style.width),
    ).toEqual([392, 392]);
    act(() => grid.props.onLayout({ nativeEvent: { layout: { width: 480 } } }));
    expect(
      grid
        .findAllByType(View)
        .filter(node => node !== grid)
        .map(node => node.props.style.width),
    ).toEqual(['100%', '100%']);
    expect(mounted).toHaveBeenCalledTimes(2);
  });
});
