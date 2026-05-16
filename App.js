import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from './src/assets/Colors';
import Routes from './src/stacks/Routes';

const App = () => {
  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: COLORS.primary,
      }}
    >
      <StatusBar barStyle={'default'} />
      <Routes />
    </SafeAreaView>
  );
};

export default App;
