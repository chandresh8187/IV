import { View, Text, StatusBar } from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextInput } from 'react-native-paper';
import AppTextInput from './src/components/IVTextInput';
import { COLORS } from './src/assets/Colors';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Home from './src/screens/mainNav/Home';
import Login from './src/screens/Login';

const App = () => {
  const Stack = createNativeStackNavigator();

  function RootStack() {
    return (
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
          contentStyle: {
            paddingHorizontal: 20,
          },
        }}
      >
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Home" component={Home} />
      </Stack.Navigator>
    );
  }
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <NavigationContainer>
        <StatusBar barStyle={'dark-content'} />
        <RootStack />
      </NavigationContainer>
    </SafeAreaView>
  );
};

export default App;
