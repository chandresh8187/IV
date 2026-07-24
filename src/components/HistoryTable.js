import React, { useCallback } from 'react';
import { FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../assets/Colors';
import { formatNumber } from '../utils/format';

const HeaderCell = React.memo(function HeaderCell({ children, width }) {
  return (
    <View style={[styles.headerCell, { width }]}>
      <Text style={styles.headerCellText}>{children}</Text>
    </View>
  );
});

const Cell = React.memo(function Cell({ children, width, bold }) {
  return (
    <View style={[styles.cell, { width }]}>
      <Text
        style={[styles.cellText, bold && styles.boldCell]}
        numberOfLines={2}
      >
        {children}
      </Text>
    </View>
  );
});

const Row = React.memo(function Row({ item, index }) {
  return (
    <View style={[styles.tableRow, index % 2 === 1 && styles.altRow]}>
      <Cell width={55} bold>
        {item.sr_no}
      </Cell>
      <Cell width={90}>{item.challan_no || '-'}</Cell>
      <Cell width={150}>{item.party_name || '-'}</Cell>
      <Cell width={150}>{item.material || '-'}</Cell>
      <Cell width={90}>{item.production_time || '-'}</Cell>
      <Cell width={80}>{item.dipping_qty || '-'}</Cell>
      <Cell width={90}>
        {item.kettle_temperature ? `${item.kettle_temperature}°` : '-'}
      </Cell>
      <Cell width={90}>
        {item.ms_weight != null ? `${item.ms_weight} KG` : '-'}
      </Cell>
      <Cell width={90}>
        {item.gi_weight != null ? `${item.gi_weight} KG` : '-'}
      </Cell>
      <Cell width={90}>
        {item.zinc_percentage != null ? `${item.zinc_percentage} %` : '-'}
      </Cell>
      <Cell width={80}>{formatNumber(item.c1)}</Cell>
      <Cell width={80}>{formatNumber(item.c2)}</Cell>
      <Cell width={80}>{formatNumber(item.c3)}</Cell>
      <Cell width={80}>{formatNumber(item.c4)}</Cell>
      <Cell width={80}>{formatNumber(item.c5)}</Cell>
      <Cell width={90} bold>
        {item.avg_coating != null ? formatNumber(item.avg_coating) : '-'}
      </Cell>
    </View>
  );
});

export default function HistoryTable({ tableData = [] }) {
  const renderItem = useCallback(
    ({ item, index }) => <Row item={item} index={index} />,
    [],
  );

  return (
    <View style={styles.tableCard}>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View>
          <View style={styles.tableHeader}>
            <HeaderCell width={55}>Sr</HeaderCell>
            <HeaderCell width={90}>Challan</HeaderCell>
            <HeaderCell width={150}>Party</HeaderCell>
            <HeaderCell width={150}>Material</HeaderCell>
            <HeaderCell width={90}>Time</HeaderCell>
            <HeaderCell width={80}>Qty</HeaderCell>
            <HeaderCell width={90}>Temp</HeaderCell>
            <HeaderCell width={90}>MS</HeaderCell>
            <HeaderCell width={90}>GI</HeaderCell>
            <HeaderCell width={90}>Zn %</HeaderCell>
            <HeaderCell width={80}>C1</HeaderCell>
            <HeaderCell width={80}>C2</HeaderCell>
            <HeaderCell width={80}>C3</HeaderCell>
            <HeaderCell width={80}>C4</HeaderCell>
            <HeaderCell width={80}>C5</HeaderCell>
            <HeaderCell width={90}>Avg</HeaderCell>
          </View>

          <FlatList
            data={tableData}
            keyExtractor={(item, index) =>
              String(item.id || item.sr_no || index)
            }
            renderItem={renderItem}
            initialNumToRender={12}
            windowSize={7}
            removeClippedSubviews
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  No production entries found
                </Text>
              </View>
            }
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  tableCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
  },
  tableHeader: { flexDirection: 'row', backgroundColor: COLORS.primary },
  headerCell: {
    height: 50,
    borderRightWidth: 1,
    borderRightColor: '#3A4375',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  headerCellText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  altRow: { backgroundColor: '#FAFBFD' },
  cell: {
    minHeight: 54,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  cellText: { color: COLORS.text, fontSize: 12, textAlign: 'center' },
  boldCell: { fontWeight: '800', color: COLORS.primary },
  emptyBox: { height: 180, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: COLORS.gray, fontWeight: '700' },
});
