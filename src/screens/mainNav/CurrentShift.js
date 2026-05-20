import React from 'react';
import { StyleSheet, View } from 'react-native';
import ShiftCard from './ShiftCard';

export default function CurrentShift() {
  return (
    <View style={styles.container}>
      <ShiftCard />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 22,
    backgroundColor: '#F8FAFC',
  },
});
