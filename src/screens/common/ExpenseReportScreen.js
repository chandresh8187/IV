import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../../assets/Colors';

export default function ExpenseReportScreen() {
  return (
    <View style={styles.page}>
      <Text style={styles.title}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
});
