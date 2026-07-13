import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

const COLORS = {
  primary: '#232B5D',
  accent: '#39A9E6',
  bg: '#F5F8FC',
  white: '#FFFFFF',
  text: '#1F2544',
  gray: '#6B7280',
  border: '#E5E7EB',
};

export default function HistoryFullTableScreen({ route }) {
  const { tableData = [] } = route.params;

  return (
    <ScrollView style={[styles.container, styles.safe]}>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Cell width={55} header>
              Sr
            </Cell>
            <Cell width={110} header>
              Time
            </Cell>
            <Cell width={130} header>
              Challan
            </Cell>
            <Cell width={180} header>
              Party
            </Cell>
            <Cell width={220} header>
              Material
            </Cell>
            <Cell width={90} header>
              Temp
            </Cell>
            <Cell width={80} header>
              Qty
            </Cell>
            <Cell width={100} header>
              MS
            </Cell>
            <Cell width={100} header>
              GI
            </Cell>
            <Cell width={90} header>
              Zinc %
            </Cell>
            <Cell width={70} header>
              C1
            </Cell>
            <Cell width={70} header>
              C2
            </Cell>
            <Cell width={70} header>
              C3
            </Cell>
            <Cell width={70} header>
              C4
            </Cell>
            <Cell width={70} header>
              C5
            </Cell>
            <Cell width={90} header>
              Avg
            </Cell>
          </View>

          {tableData.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No production found</Text>
            </View>
          ) : (
            tableData.map(item => (
              <View key={item.id} style={styles.tableRow}>
                <Cell width={55}>{item.sr_no || '-'}</Cell>
                <Cell width={110}>{item.production_time || '-'}</Cell>
                <Cell width={130}>{item.challan_no || '-'}</Cell>
                <Cell width={180}>{item.party_name || '-'}</Cell>
                <Cell width={220}>{item.material || '-'}</Cell>
                <Cell width={90}>{item.kettle_temperature || '-'}</Cell>
                <Cell width={80}>{item.dipping_qty || '-'}</Cell>

                <Cell width={100}>
                  {item.ms_weight !== null &&
                  item.ms_weight !== undefined &&
                  item.ms_weight !== ''
                    ? `${item.ms_weight} KG`
                    : '-'}
                </Cell>

                <Cell width={100}>
                  {item.gi_weight !== null &&
                  item.gi_weight !== undefined &&
                  item.gi_weight !== ''
                    ? `${item.gi_weight} KG`
                    : '-'}
                </Cell>

                <Cell width={90}>
                  {item.zinc_percentage ? `${item.zinc_percentage}%` : '-'}
                </Cell>

                <Cell width={70}>{item.c1 || '-'}</Cell>
                <Cell width={70}>{item.c2 || '-'}</Cell>
                <Cell width={70}>{item.c3 || '-'}</Cell>
                <Cell width={70}>{item.c4 || '-'}</Cell>
                <Cell width={70}>{item.c5 || '-'}</Cell>
                <Cell width={90}>{item.avg_coating || '-'}</Cell>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </ScrollView>
  );
}

function Cell({ children, width, header }) {
  return (
    <View style={[styles.cell, { width }, header && styles.headCell]}>
      <Text
        numberOfLines={2}
        style={[styles.cellText, header && styles.headText]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  container: {
    flex: 1,
    padding: 12,
  },

  table: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    overflow: 'hidden',
    elevation: 3,
    marginBottom: 30,
  },

  tableHead: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
  },

  tableRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  cell: {
    minHeight: 46,
    paddingHorizontal: 8,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },

  headCell: {
    minHeight: 48,
    borderRightColor: 'rgba(255,255,255,0.25)',
  },

  cellText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },

  headText: {
    color: COLORS.white,
    fontWeight: '900',
  },

  emptyBox: {
    padding: 30,
    alignItems: 'center',
  },

  emptyText: {
    color: COLORS.gray,
    fontWeight: '800',
  },
});
