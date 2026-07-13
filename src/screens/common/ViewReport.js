import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React, { useState } from 'react';
import { COLORS } from '../../assets/Colors';
import { Maximize2, X } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HistoryTable from '../../components/HistoryTable';

const ViewReport = ({ route }) => {
  const [fullTableVisible, setFullTableVisible] = useState(false);
  const { tableData = [] } = route?.params || {};

  return (
    <View style={styles.screen}>
      <View style={styles.blockHeader}>
        <Text style={styles.blockTitleNoMargin}>Production Entries</Text>

        <TouchableOpacity
          style={styles.fullBtn}
          onPress={() => setFullTableVisible(true)}
        >
          <Maximize2 size={18} color={COLORS.primary} />
          <Text style={styles.fullBtnText}>Full Screen</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tableWrap}>
        <HistoryTable tableData={tableData} />
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
            <HistoryTable tableData={tableData} />
          </View>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

export default ViewReport;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  // Let the table use all remaining height instead of a fixed 50% that
  // left dead space below it.
  tableWrap: {
    flex: 1,
    paddingHorizontal: 15,
    paddingBottom: 15,
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
  fullBtnText: { color: COLORS.primary, fontSize: 12, fontWeight: '900' },
  fullSafe: { flex: 1, backgroundColor: COLORS.bg },
  fullHeader: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fullTitle: { color: COLORS.primary, fontSize: 22, fontWeight: '900' },
  fullBody: { flex: 1, padding: 10, backgroundColor: COLORS.bg },
  closeBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
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
