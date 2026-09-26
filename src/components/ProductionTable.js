import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { COLORS, UI } from '../assets/Colors';
import { sortProductionEntries } from '../utils/productionOrder';
import {
  formatMaterialDescription,
  formatNumber,
  formatQuantity,
  formatTime12Hour,
  formatWeight,
} from '../utils/format';

const COLUMNS = [
  { key: 'row_number', label: 'No.', width: 55, bold: true },
  { key: 'production_time', label: 'Time', width: 100 },
  { key: 'challan_no', label: 'Challan', width: 120 },
  { key: 'party_name', label: 'Party', width: 170 },
  { key: 'material', label: 'Material', width: 200 },
  { key: 'kettle_temperature', label: 'Kettle °C', width: 90 },
  { key: 'dipping_qty', label: 'Qty\nNOS', width: 80 },
  { key: 'ms_weight', label: 'MS KG', width: 100 },
  { key: 'gi_weight', label: 'GI KG', width: 100 },
  { key: 'zinc_percentage', label: 'Zinc %', width: 90 },
  { key: 'production_cost', label: 'Pro. cost\n₹/KG', width: 110, bold: true },
  { key: 'c1', label: 'C1', width: 70 },
  { key: 'c2', label: 'C2', width: 70 },
  { key: 'c3', label: 'C3', width: 70 },
  { key: 'c4', label: 'C4', width: 70 },
  { key: 'c5', label: 'C5', width: 70 },
  { key: 'avg_coating', label: 'Avg\nµm', width: 90, bold: true },
];

const hasValue = value => value !== null && value !== undefined && value !== '';

const formatCellValue = (row, key) => {
  const value = row?.[key];

  if (key === 'material') return formatMaterialDescription(value) || '-';
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
  if (key === 'production_cost') {
    return hasValue(value) ? `₹${formatNumber(value)}/KG` : '-';
  }
  if (['c1', 'c2', 'c3', 'c4', 'c5', 'avg_coating'].includes(key)) {
    return formatNumber(value);
  }

  return hasValue(value) ? String(value) : '-';
};

function TableCell({ children, width, header = false, bold = false }) {
  return (
    <View style={[styles.cell, { width }, header && styles.headerCell]}>
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
  columns,
  renderAction,
}) {
  if (!rows.length) {
    return null;
  }

  return rows.map((item, index) => (
    <View
      key={item.id || `${item.shift_id || 'row'}-${item.sr_no}-${index}`}
      style={[styles.row, index % 2 === 1 && styles.altRow]}
    >
      {columns.map(column => (
        <TableCell key={column.key} width={column.width} bold={column.bold}>
          {column.key === 'row_number'
            ? String(index + 1)
            : formatCellValue(item, column.key)}
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
  shiftName,
  rowLimit,
  renderAction,
  scrollRows = false,
  emptyMessage = 'No production entries found',
  showsHorizontalScrollIndicator = true,
  showProductionCost = false,
}) {
  const sortedRows = React.useMemo(
    () => sortProductionEntries(rows, shiftName),
    [rows, shiftName],
  );
  const visibleRows = rowLimit ? sortedRows.slice(0, rowLimit) : sortedRows;
  const visibleColumns = React.useMemo(
    () =>
      showProductionCost
        ? COLUMNS
        : COLUMNS.filter(column => column.key !== 'production_cost'),
    [showProductionCost],
  );
  const body = (
    <ProductionRows
      rows={visibleRows}
      columns={visibleColumns}
      renderAction={renderAction}
    />
  );

  return (
    <View style={[styles.container, scrollRows && styles.fill]}>
      <View style={styles.registerMeta}>
        <Text style={styles.registerCount}>{visibleRows.length} ENTRIES</Text>
        <Text style={styles.scrollHint}>Swipe to view columns →</Text>
      </View>
      {!visibleRows.length && (
        <View style={styles.emptyNotice}>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={showsHorizontalScrollIndicator}
        style={scrollRows && styles.fill}
      >
        <View style={[styles.table, scrollRows && styles.fill]}>
          <View style={styles.groupRow}>
            <Text style={[styles.groupLabel, styles.entryGroup]}>ENTRY</Text>
            <Text style={[styles.groupLabel, styles.materialGroup]}>
              CHALLAN / MATERIAL
            </Text>
            <Text
              style={[
                styles.groupLabel,
                styles.processGroup,
                !showProductionCost && styles.processGroupWithoutCost,
              ]}
            >
              PROCESS / OUTPUT
            </Text>
            <Text style={[styles.groupLabel, styles.coatingGroup]}>
              COATING READINGS · µm
            </Text>
            {renderAction && (
              <Text style={[styles.groupLabel, styles.actionGroup]}>
                CONTROL
              </Text>
            )}
          </View>
          <View style={styles.headerRow}>
            {visibleColumns.map(column => (
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
    borderRadius: UI.radiusSmall,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  registerMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  registerCount: {
    color: COLORS.gray,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.7,
    fontVariant: ['tabular-nums'],
  },
  scrollHint: { color: COLORS.gray, fontSize: 11 },
  emptyNotice: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surfaceMuted,
  },
  entryGroup: { width: 155 },
  materialGroup: { width: 490 },
  processGroup: { width: 570 },
  processGroupWithoutCost: { width: 460 },
  coatingGroup: { width: 440 },
  actionGroup: { width: 110 },
  fill: { flex: 1 },
  table: { backgroundColor: COLORS.white },
  groupRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceMuted,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  groupLabel: {
    color: COLORS.gray,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.9,
    textAlign: 'center',
    paddingVertical: 9,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.accentSoft,
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
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  headerCell: {
    minHeight: 50,
    borderRightColor: COLORS.border,
  },
  cellText: {
    color: COLORS.text,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
    textAlign: 'center',
  },
  headerText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  boldText: {
    color: COLORS.text,
    fontWeight: '600',
  },
  actionCell: { width: 110 },
  emptyText: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '600',
  },
});
