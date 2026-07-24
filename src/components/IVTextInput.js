import React from 'react';
import { StyleSheet } from 'react-native';
import { TextInput } from 'react-native-paper';
import { COLORS, PAPER_THEME, UI } from '../assets/Colors';

const AppTextInput = ({
  label,
  value,
  onChangeText,
  secureTextEntry = false,
  keyboardType = 'default',
  right,
  left,
  multiline = false,
  numberOfLines = 1,
}) => {
  return (
    <TextInput
      label={label}
      value={value}
      onChangeText={onChangeText}
      mode="outlined"
      secureTextEntry={secureTextEntry}
      keyboardType={keyboardType}
      right={right}
      left={left}
      multiline={multiline}
      numberOfLines={numberOfLines}
      style={styles.input}
      contentStyle={styles.content}
      outlineStyle={styles.outline}
      textColor={COLORS.text}
      placeholderTextColor={COLORS.muted}
      outlineColor={COLORS.inputBorder}
      activeOutlineColor={COLORS.accent}
      theme={PAPER_THEME}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    backgroundColor: COLORS.white,
    marginVertical: 8,
  },

  content: {
    paddingVertical: 7,
    color: COLORS.text,
    fontSize: 15,
  },

  outline: {
    borderRadius: UI.radiusSmall,
    borderWidth: 1,
  },
});

export default AppTextInput;
