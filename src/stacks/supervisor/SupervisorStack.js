import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { COLORS } from '../../assets/Colors';
import LoginScreen from './../../screens/Login';
import HomeScreen from './../../screens/mainNav/Home';
import LiveProductionScreen from './../../screens/mainNav/LiveProductionScreen';

const SupervisorStack = () => {
  const Stack = createNativeStackNavigator();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: COLORS.background,
        },
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="LiveProduction" component={LiveProductionScreen} />
    </Stack.Navigator>
  );
};

export { SupervisorStack };
