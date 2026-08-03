import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSelector } from 'react-redux';

import { COLORS } from '../../assets/Colors';
import {
  formatNumber,
  formatQuantity,
  formatTime12Hour,
  formatWeight,
} from '../../utils/format';

export default function HistoryFullTableScreen({ route, navigation }) {
  const { tableData = [], date, shift_name } = route.params;
  const role = String(useSelector(state => state.auth.user?.role) || '').toLowerCase();

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
            {role === 'superadmin' && <Cell width={90} header>Action</Cell>}
          </View>

          {tableData.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No production found</Text>
            </View>
          ) : (
            tableData.map(item => (
              <View key={item.id} style={styles.tableRow}>
                <Cell width={55}>{item.sr_no || '-'}</Cell>
                <Cell width={110}>
                  {formatTime12Hour(item.production_time)}
                </Cell>
                <Cell width={130}>{item.challan_no || '-'}</Cell>
                <Cell width={180}>{item.party_name || '-'}</Cell>
                <Cell width={220}>{item.material || '-'}</Cell>
                <Cell width={90}>{item.kettle_temperature || '-'}</Cell>
                <Cell width={80}>{formatQuantity(item.dipping_qty, '-')}</Cell>

                <Cell width={100}>
                  {item.ms_weight !== null &&
                  item.ms_weight !== undefined &&
                  item.ms_weight !== ''
                    ? `${formatWeight(item.ms_weight)} KG`
                    : '-'}
                </Cell>

                <Cell width={100}>
                  {item.gi_weight !== null &&
                  item.gi_weight !== undefined &&
                  item.gi_weight !== ''
                    ? `${formatWeight(item.gi_weight)} KG`
                    : '-'}
                </Cell>

                <Cell width={90}>
                  {item.zinc_percentage
                    ? `${formatWeight(item.zinc_percentage)}%`
                    : '-'}
                </Cell>

                <Cell width={70}>{formatNumber(item.c1)}</Cell>
                <Cell width={70}>{formatNumber(item.c2)}</Cell>
                <Cell width={70}>{formatNumber(item.c3)}</Cell>
                <Cell width={70}>{formatNumber(item.c4)}</Cell>
                <Cell width={70}>{formatNumber(item.c5)}</Cell>
                <Cell width={90}>{formatNumber(item.avg_coating)}</Cell>
                {role === 'superadmin' && (
                  <View style={[styles.cell, { width: 90 }]}> 
                    <TouchableOpacity
                      style={styles.editBtn}
                      onPress={() => navigation.navigate('HistoricalProductionEdit', { item, date, shift_name })}
                    >
                      <Text style={styles.editBtnText}>EDIT</Text>
                    </TouchableOpacity>
                  </View>
                )}
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
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
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
    fontWeight: '800',
  },

  emptyBox: {
    padding: 30,
    alignItems: 'center',
  },

  emptyText: {
    color: COLORS.gray,
    fontWeight: '800',
  },
  editBtn: { height: 32, borderRadius: 9, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  editBtnText: { color: COLORS.white, fontSize: 10, fontWeight: '800' },
});
