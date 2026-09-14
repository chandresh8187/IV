import React, { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { getGridColumns } from '../utils/responsive';

// Measure the actual available content width, including side navigation and
// split-screen. Wrappers never change keys, preserving form state on rotation.
export default function ResponsiveGrid({
  children,
  minColumnWidth = 340,
  maxColumns = 2,
  gap = 16,
}) {
  const [width, setWidth] = useState(0);
  const { fontScale } = useWindowDimensions();
  const items = React.Children.toArray(children);
  const columns = Math.min(
    items.length || 1,
    getGridColumns(width, fontScale, minColumnWidth, maxColumns, gap),
  );
  const itemStyle = {
    width: columns === 1 ? '100%' : (width - gap * (columns - 1)) / columns,
  };
  return (
    <View
      style={[styles.grid, { columnGap: gap }]}
      onLayout={event => setWidth(event.nativeEvent.layout.width)}
    >
      {items.map(child => (
        <View key={child.key} style={itemStyle}>
          {child}
        </View>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  grid: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
  },
});
