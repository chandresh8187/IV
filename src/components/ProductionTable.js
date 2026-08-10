import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { COLORS } from '../assets/Colors';
import {
  formatNumber,
  formatQuantity,
  formatTime12Hour,
  formatWeight,
} from '../utils/format';

const COLUMNS = [
  { key: 'sr_no', label: 'Sr', width: 55, bold: true },
  { key: 'production_time', label: 'Time', width: 100 },
  { key: 'challan_no', label: 'Challan', width: 120 },
  { key: 'party_name', label: 'Party', width: 170 },
  { key: 'material', label: 'Material', width: 200 },
  { key: 'kettle_temperature', label: 'Kettle Temp', width: 90 },
  { key: 'dipping_qty', label: 'Dipping Qty', width: 80 },
  { key: 'ms_weight', label: 'MS', width: 100 },
  { key: 'gi_weight', label: 'GI', width: 100 },
  { key: 'zinc_percentage', label: 'Zinc %', width: 90 },
  { key: 'c1', label: 'C1', width: 70 },
  { key: 'c2', label: 'C2', width: 70 },
  { key: 'c3', label: 'C3', width: 70 },
  { key: 'c4', label: 'C4', width: 70 },
  { key: 'c5', label: 'C5', width: 70 },
  { key: 'avg_coating', label: 'Avg', width: 90, bold: true },
];

const hasValue = value =>
  value !== null && value !== undefined && value !== '';

const formatCellValue = (row, key) => {
  const value = row?.[key];

  if (key === 'production_time') return formatTime12Hour(value);
  if (key === 'dipping_qty') return formatQuantity(value, '-');
  if (key === 'kettle_temperature') {
    return hasValue(value) ? `${formatNumber(value)}\u00B0` : '-';
  }
  if (key === 'ms_weight' || key === 'gi_weight') {
    return hasValue(value) ? `${formatWeight(value)} KG` : '-';
  }
  if (key === 'zinc_percentage') {
    return hasValue(value) ? `${formatWeight(value)}%` : '-';
  }
  if (['c1', 'c2', 'c3', 'c4', 'c5', 'avg_coating'].includes(key)) {
    return formatNumber(value);
  }

  return hasValue(value) ? String(value) : '-';
};

function TableCell({ children, width, header = false, bold = false }) {
  return (
    <View
      style={[
        styles.cell,
        { width },
        header && styles.headerCell,
      ]}
    >
      <Text
        numberOfLines={3}
        style={[
          styles.cellText,
          header && styles.headerText,
          bold && !header && styles.boldText,
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

const ProductionRows = React.memo(function ProductionRows({
  rows,
  renderAction,
  emptyMessage,
}) {
  if (!rows.length) {
    return (
      <View style={styles.emptyBox}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
      </View>
    );
  }

  return rows.map((item, index) => (
    <View
      key={item.id || `${item.shift_id || 'row'}-${item.sr_no}-${index}`}
      style={[styles.row, index % 2 === 1 && styles.altRow]}
    >
      {COLUMNS.map(column => (
        <TableCell
          key={column.key}
          width={column.width}
          bold={column.bold}
        >
          {formatCellValue(item, column.key)}
        </TableCell>
      ))}

      {renderAction && (
        <View style={[styles.cell, styles.actionCell]}>
          {renderAction(item)}
        </View>
      )}
    </View>
  ));
});

export default function ProductionTable({
  rows = [],
  rowLimit,
  renderAction,
  scrollRows = false,
  emptyMessage = 'No production entries found',
  showsHorizontalScrollIndicator = true,
}) {
  const visibleRows = rowLimit ? rows.slice(0, rowLimit) : rows;
  const body = (
    <ProductionRows
      rows={visibleRows}
      renderAction={renderAction}
      emptyMessage={emptyMessage}
    />
  );

  return (
    <View style={[styles.container, scrollRows && styles.fill]}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
        style={scrollRows && styles.fill}
      >
        <View style={[styles.table, scrollRows && styles.fill]}>
          <View style={styles.headerRow}>
            {COLUMNS.map(column => (
              <TableCell key={column.key} width={column.width} header>
                {column.label}
              </TableCell>
            ))}
            {renderAction && (
              <TableCell width={110} header>
                Action
              </TableCell>
            )}
          </View>

          {scrollRows ? (
            <ScrollView style={styles.fill} nestedScrollEnabled>
              {body}
            </ScrollView>
          ) : (
            body
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fill: { flex: 1 },
  table: { backgroundColor: COLORS.white },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
  },
  row: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  altRow: { backgroundColor: COLORS.surfaceMuted },
  cell: {
    minHeight: 54,
    paddingHorizontal: 7,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  headerCell: {
    minHeight: 50,
    borderRightColor: 'rgba(255,255,255,0.22)',
  },
  cellText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerText: {
    color: COLORS.white,
    fontWeight: '800',
  },
  boldText: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  actionCell: { width: 110 },
  emptyBox: {
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '700',
  },
});
