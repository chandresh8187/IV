import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import React, { useState } from 'react';
import { COLORS } from '../../assets/Colors';
import { Maximize2, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const ViewReport = ({ route }) => {
  const [fullTableVisible, setFullTableVisible] = useState(false);
  const { tableData } = route?.params;
  return (
    <>
      <View style={styles.blockHeader}>
        <Text style={styles.blockTitleNoMargin}>Production Entries</Text>

        <TouchableOpacity
          style={styles.fullBtn}
          onPress={() => {
            setFullTableVisible(true);
          }}
        >
          <Maximize2 size={18} color={COLORS.primary} />
          <Text style={styles.fullBtnText}>Full Screen</Text>
        </TouchableOpacity>
      </View>
      <View
        style={{
          paddingHorizontal: 15,
          height: '50%',
        }}
      >
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

              <ScrollView>
                {tableData.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Text style={styles.emptyText}>
                      No production entries found
                    </Text>
                  </View>
                ) : (
                  tableData.map((item, index) => (
                    <View
                      key={item.id || item.sr_no}
                      style={[
                        styles.tableRow,
                        index % 2 === 1 && styles.altRow,
                      ]}
                    >
                      <Cell width={55} bold>
                        {item.sr_no}
                      </Cell>
                      <Cell width={90}>{item.challan_no || '-'}</Cell>
                      <Cell width={150}>{item.party_name || '-'}</Cell>
                      <Cell width={150}>{item.material || '-'}</Cell>
                      <Cell width={90}>{item.production_time || '-'}</Cell>
                      <Cell width={80}>{item.dipping_qty || '-'}</Cell>
                      <Cell width={90}>
                        {item.kettle_temperature
                          ? `${item.kettle_temperature}°`
                          : '-'}
                      </Cell>
                      <Cell width={90}>{`${item.ms_weight} KG` || '-'}</Cell>
                      <Cell width={90}>{`${item.gi_weight} KG` || '-'}</Cell>
                      <Cell width={90}>
                        {`${item.zinc_percentage} %` || '-'}
                      </Cell>
                      <Cell width={80}>
                        {Math.round(Number(item.c1)) || '-'}
                      </Cell>
                      <Cell width={80}>
                        {Math.round(Number(item.c2)) || '-'}
                      </Cell>
                      <Cell width={80}>
                        {Math.round(Number(item.c3)) || '-'}
                      </Cell>
                      <Cell width={80}>
                        {Math.round(Number(item.c4)) || '-'}
                      </Cell>
                      <Cell width={80}>
                        {Math.round(Number(item.c5)) || '-'}
                      </Cell>
                      <Cell width={90} bold>
                        {item.avg_coating
                          ? Math.round(Number(item.avg_coating))
                          : '-'}
                      </Cell>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </ScrollView>
        </View>
      </View>
      <Modal visible={fullTableVisible} animationType="slide">
        <SafeAreaView style={styles.fullSafe}>
          <View style={styles.fullHeader}>
            <Text style={styles.fullTitle}>Production Entries</Text>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setFullTableVisible(false)}
            >
              <X size={22} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.fullBody}>
            <HistoryTable tableData={tableData} fullScreen />
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
};

function HeaderCell({ children, width }) {
  return (
    <View style={[styles.headerCell, { width }]}>
      <Text style={styles.headerCellText}>{children}</Text>
    </View>
  );
}

function Cell({ children, width, bold }) {
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
}

function HistoryTable({ tableData, fullScreen = false }) {
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

          <ScrollView>
            {tableData.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>
                  No production entries found
                </Text>
              </View>
            ) : (
              tableData.map((item, index) => (
                <View
                  key={item.id || item.sr_no}
                  style={[styles.tableRow, index % 2 === 1 && styles.altRow]}
                >
                  <Cell width={55} bold>
                    {item.sr_no}
                  </Cell>
                  <Cell width={90}>{item.challan_no || '-'}</Cell>
                  <Cell width={150}>{item.party_name || '-'}</Cell>
                  <Cell width={150}>{item.material || '-'}</Cell>
                  <Cell width={90}>{item.production_time || '-'}</Cell>
                  <Cell width={80}>{item.dipping_qty || '-'}</Cell>
                  <Cell width={90}>
                    {item.kettle_temperature
                      ? `${item.kettle_temperature}°`
                      : '-'}
                  </Cell>
                  <Cell width={90}>{`${item.ms_weight} KG` || '-'}</Cell>
                  <Cell width={90}>{`${item.gi_weight} KG` || '-'}</Cell>
                  <Cell width={90}>{`${item.zinc_percentage} %` || '-'}</Cell>
                  <Cell width={80}>{Math.round(Number(item.c1)) || '-'}</Cell>
                  <Cell width={80}>{Math.round(Number(item.c2)) || '-'}</Cell>
                  <Cell width={80}>{Math.round(Number(item.c3)) || '-'}</Cell>
                  <Cell width={80}>{Math.round(Number(item.c4)) || '-'}</Cell>
                  <Cell width={80}>{Math.round(Number(item.c5)) || '-'}</Cell>
                  <Cell width={90} bold>
                    {item.avg_coating
                      ? Math.round(Number(item.avg_coating))
                      : '-'}
                  </Cell>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </ScrollView>
    </View>
  );
}

export default ViewReport;

const styles = StyleSheet.create({
  tableCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 4,
  },

  loaderBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.primary,
  },

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
    fontWeight: '900',
    textAlign: 'center',
  },

  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.white,
  },

  altRow: {
    backgroundColor: '#FAFBFD',
  },

  cell: {
    minHeight: 54,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },

  cellText: {
    color: COLORS.text,
    fontSize: 12,
    textAlign: 'center',
  },

  boldCell: {
    fontWeight: '900',
    color: COLORS.primary,
  },

  emptyBox: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyText: {
    color: COLORS.gray,
    fontWeight: '700',
  },
  fullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.lightBlue,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },

  fullBtnText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  fullSafe: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  fullHeader: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  fullTitle: {
    color: COLORS.primary,
    fontSize: 22,
    fontWeight: '900',
  },

  fullBody: {
    flex: 1,
    padding: 10,
    backgroundColor: COLORS.bg,
  },

  closeBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockTitle: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 22,
    marginBottom: 12,
  },

  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 22,
    marginBottom: 12,
    paddingHorizontal: 20,
  },

  blockTitleNoMargin: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '900',
  },
});
