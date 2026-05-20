import React, { memo } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useSelector } from 'react-redux';
import { useShiftStatus, useToggleShift } from '../../redux/hooks/useShift';

const COLORS = {
  primary: '#232B5D',
  accent: '#39A9E6',
  border: '#B8C4D6',
  gray: '#6B7280',
  white: '#FFFFFF',
  danger: '#EF4444',
  success: '#16A34A',
};

function ShiftCard() {
  const { isLoading } = useShiftStatus();
  const toggleShift = useToggleShift();

  const { currentShift, shiftDate, isShiftActive, buttonText } = useSelector(
    state => state.shift,
  );

  const handleToggleShift = () => {
    toggleShift.mutate({
      shiftDate,
    });
  };

  const loading = isLoading || toggleShift.isPending;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Current Shift</Text>

      <View style={styles.statusBox}>
        <Text style={styles.label}>Shift Status</Text>

        <Text
          style={[
            styles.shiftText,
            { color: isShiftActive ? COLORS.success : COLORS.danger },
          ]}
        >
          {isShiftActive
            ? `${currentShift?.toUpperCase()} SHIFT ACTIVE`
            : 'NO ACTIVE SHIFT'}
        </Text>

        <Text style={styles.dateText}>
          {shiftDate ? `Shift Date: ${shiftDate}` : 'Shift Date: -'}
        </Text>
      </View>

      <TouchableOpacity
        activeOpacity={0.75}
        style={[styles.button, loading && styles.disabledButton]}
        onPress={handleToggleShift}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.buttonText}>{buttonText}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 22,
    padding: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 5,
    },
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 16,
  },

  statusBox: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },

  label: {
    fontSize: 13,
    color: COLORS.gray,
    marginBottom: 6,
  },

  shiftText: {
    fontSize: 17,
    fontWeight: '800',
  },

  dateText: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.gray,
  },

  button: {
    height: 54,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  disabledButton: {
    opacity: 0.7,
  },

  buttonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});

export default memo(ShiftCard);
