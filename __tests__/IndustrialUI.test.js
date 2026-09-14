import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';
import ModuleMenu from '../src/components/ModuleMenu';
import ProductionTable from '../src/components/ProductionTable';
import { COLORS, PAPER_THEME } from '../src/assets/Colors';
import { useResponsive } from '../src/utils/responsive';

jest.mock('lucide-react-native', () => ({
  ChevronRight: 'ChevronRight',
  ArrowUpRight: 'ArrowUpRight',
  Factory: 'Factory',
  Settings2: 'Settings2',
}));
jest.mock('../src/utils/responsive', () => ({
  useResponsive: jest.fn(() => ({ isTablet: false, wideMaxWidth: undefined })),
  centeredContent: () => ({}),
}));

function textContent(tree) {
  return tree.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat()
    .join(' ');
}

describe('industrial interface', () => {
  let tree;
  beforeEach(() => {
    useResponsive.mockReturnValue({
      isTablet: false,
      width: 393,
      fontScale: 1,
    });
  });
  afterEach(() => {
    if (tree) act(() => tree.unmount());
  });

  test('module directory preserves navigation and shows descriptive actions', () => {
    const onSelect = jest.fn();
    const action = {
      title: 'Live Production',
      description: 'Review shift entries',
      screen: 'LiveProduction',
      icon: 'Factory',
      primary: true,
    };
    act(() => {
      tree = renderer.create(
        <ModuleMenu
          title="Production"
          eyebrow="OPERATIONS"
          description="Plant modules"
          actions={[action]}
          onSelect={onSelect}
        />,
      );
    });
    const button = tree.root.findByType(TouchableOpacity);
    expect(button.props.accessibilityHint).toBe('Review shift entries');
    expect(button.props.accessibilityRole).toBe('button');
    act(() => button.props.onPress());
    expect(onSelect).toHaveBeenCalledWith(action);
  });

  test('module directory handles an account without available modules', () => {
    act(() => {
      tree = renderer.create(
        <ModuleMenu title="Production" actions={[]} onSelect={jest.fn()} />,
      );
    });
    expect(textContent(tree)).toContain('No modules are available');
    expect(tree.root.findAllByType(TouchableOpacity)).toHaveLength(0);
  });

  test.each([
    [{ isTablet: false, width: 393, fontScale: 1 }, 3],
    [{ isTablet: false, width: 320, fontScale: 1 }, 2],
    [{ isTablet: false, width: 393, fontScale: 1.3 }, 2],
    [{ isTablet: true, width: 800, fontScale: 1 }, 4],
  ])('module tiles adapt without dropping actions: %j', (viewport, columns) => {
    useResponsive.mockReturnValue(viewport);
    const actions = Array.from({ length: 6 }, (_, index) => ({
      title: `Module ${index}`,
      screen: `screen-${index}`,
      icon: 'Factory',
    }));
    act(() => {
      tree = renderer.create(
        <ModuleMenu
          title="Production"
          actions={actions}
          onSelect={jest.fn()}
        />,
      );
    });
    const buttons = tree.root.findAllByType(TouchableOpacity);
    expect(buttons).toHaveLength(6);
    expect(buttons[0].props.style[1].width).toBe(`${100 / columns - 3}%`);
  });

  test('production register retains every coating column and formatted readings', () => {
    act(() => {
      tree = renderer.create(
        <ProductionTable
          rows={[
            {
              id: 1,
              sr_no: 1,
              production_time: '13:05:00',
              challan_no: 'DC/01',
              c1: 81,
              c2: 82,
              c3: 83,
              c4: 84,
              c5: 85,
              avg_coating: 83,
            },
          ]}
        />,
      );
    });
    const text = textContent(tree);
    [
      'ENTRY',
      'PROCESS / OUTPUT',
      'C1',
      'C2',
      'C3',
      'C4',
      'C5',
      'DC/01',
      '81',
      '85',
    ].forEach(value => expect(text).toContain(value));
    expect(text).toContain('01:05 PM');
  });

  test('production register renumbers sorted rows and keeps actions on the original entry', () => {
    const rows = [
      { id: 41, sr_no: 90, production_time: '22:55:00' },
      { id: 42, sr_no: 91, production_time: '21:12:00' },
    ];
    const onEdit = jest.fn();
    const table = (data, rowLimit) => (
      <ProductionTable
        rows={data}
        shiftName="night"
        rowLimit={rowLimit}
        renderAction={item => (
          <TouchableOpacity onPress={() => onEdit(item.id)}>
            <Text>Edit entry</Text>
          </TouchableOpacity>
        )}
      />
    );
    act(() => {
      tree = renderer.create(table(rows));
    });
    const cells = tree.root
      .findAllByType(Text)
      .map(node => node.props.children);
    const first = cells.indexOf('09:12 PM');
    const second = cells.indexOf('10:55 PM');
    expect(first).toBeLessThan(second);
    expect(cells[first - 1]).toBe('1');
    expect(cells[second - 1]).toBe('2');
    act(() => tree.root.findAllByType(TouchableOpacity)[0].props.onPress());
    expect(onEdit).toHaveBeenLastCalledWith(42);
    // Updating a time repositions the same entry and changes only display order.
    const editedRows = [{ ...rows[0], production_time: '20:00:00' }, rows[1]];
    act(() => tree.update(table(editedRows, 1)));
    expect(textContent(tree)).toContain('08:00 PM');
    expect(textContent(tree)).not.toContain('09:12 PM');
    act(() => tree.root.findAllByType(TouchableOpacity)[0].props.onPress());
    expect(onEdit).toHaveBeenLastCalledWith(41);
  });

  test('production register supports empty data and optional entry controls', () => {
    act(() => {
      tree = renderer.create(
        <ProductionTable
          rows={[]}
          emptyMessage="No entries in this shift"
          renderAction={() => null}
        />,
      );
    });
    expect(textContent(tree)).toContain('No entries in this shift');
    expect(textContent(tree)).toContain('CONTROL');
  });

  test('normal text and semantic button colors meet AA contrast on white', () => {
    const luminance = hex => {
      const channels = hex
        .slice(1)
        .match(/../g)
        .map(value => parseInt(value, 16) / 255)
        .map(value =>
          value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
        );
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    [
      COLORS.text,
      COLORS.gray,
      COLORS.muted,
      COLORS.accent,
      COLORS.coral,
      COLORS.success,
      COLORS.danger,
      COLORS.warning,
    ].forEach(color => {
      expect(1.05 / (luminance(color) + 0.05)).toBeGreaterThanOrEqual(4.5);
    });
    expect(PAPER_THEME.roundness).toBe(12);
  });
});
