import { View, Text } from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput } from 'react-native-paper';
import AppTextInput from './src/components/IVTextInput';
import { COLORS } from './src/assets/Colors';

const App = () => {
  const [text, setText] = React.useState('');
  return (
    <SafeAreaView
      style={{
        flex: 1,
        paddingHorizontal: 20,
        backgroundColor: COLORS.background,
      }}
    >
      <Text>App</Text>
    </SafeAreaView>
  );
};

export default App;
