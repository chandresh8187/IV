import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ClipboardList,
  Factory,
  FileCheck2,
  History,
  Settings2,
} from 'lucide-react-native';

const COLORS = {
  primary: '#232B5D',
  accent: '#39A9E6',
  bg: '#F5F8FC',
  white: '#FFFFFF',
  text: '#1F2544',
  gray: '#6B7280',
  border: '#E5E7EB',
  lightBlue: '#EEF7FD',
};

export default function ProductionMenuScreen({ navigation }) {
  const menus = [
    {
      title: 'Live Production',
      desc: 'Add and view current shift production',
      icon: Factory,
      screen: 'LiveProduction',
    },
    {
      title: 'Shift Control',
      desc: 'Start and end day/night shift',
      icon: Settings2,
      screen: 'ShiftControl',
    },
    {
      title: 'Production History',
      desc: 'Date and shift wise production reports',
      icon: History,
      screen: 'ProductionHistory',
    },
    {
      title: 'Production Planning',
      desc: 'Manage challan wise production planning',
      icon: ClipboardList,
      screen: 'ProductionPlanning',
    },
    {
      title: 'Coating Test Certificate',
      desc: 'Generate galvanizing coating test certificate',
      icon: FileCheck2,
      screen: 'GenerateCertificate',
    },
  ];

  return (
    <ScrollView
      style={{
        backgroundColor: COLORS.bg,
      }}
      contentContainerStyle={styles.container}
    >
      <Text style={styles.title}>Production</Text>
      <Text style={styles.subtitle}>Select production module</Text>

      {menus.map(item => {
        const Icon = item.icon;

        return (
          <TouchableOpacity
            key={item.screen}
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => navigation.navigate(item.screen)}
          >
            <View style={styles.iconBox}>
              <Icon size={24} color={COLORS.primary} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDesc}>{item.desc}</Text>
            </View>

            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: { color: COLORS.primary, fontSize: 28, fontWeight: '900' },
  subtitle: {
    color: COLORS.gray,
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 18,
  },

  card: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 3,
  },

  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 18,
    backgroundColor: COLORS.lightBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardTitle: { color: COLORS.text, fontSize: 17, fontWeight: '900' },
  cardDesc: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  arrow: { color: COLORS.accent, fontSize: 34, fontWeight: '900' },
});
