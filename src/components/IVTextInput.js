import React from 'react';
import { StyleSheet } from 'react-native';
import { TextInput } from 'react-native-paper';

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
      textColor="#1F2544"
      placeholderTextColor="#6B7280"
      outlineColor="#B8C4D6"
      activeOutlineColor="#39A9E6"
      theme={{
        colors: {
          primary: '#39A9E6',
          onSurfaceVariant: '#232B5D',
          background: '#FFFFFF',
        },
        roundness: 12,
      }}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    backgroundColor: '#FFFFFF',
    marginVertical: 8,
  },

  content: {
    paddingVertical: 8,
    color: '#1F2544',
    fontSize: 16,
  },

  outline: {
    borderRadius: 14,
    borderWidth: 1.5,
  },
});

export default AppTextInput;
