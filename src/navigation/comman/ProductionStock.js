import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import AppHeader from '../../components/AppHeader';
import ProductionScreen from '../../screens/superadmin/ProductionScreen';
import ShiftScreen from '../../screens/supervisor/ShiftScreen';
import ProductionMenuScreen from './../../screens/common/ProductionMenuScreen';
import ProductionPlanningScreen from './../../screens/common/ProductionPlanningScreen';
import GenerateCertificateScreen from './../../screens/common/GenerateCertificateScreen';
import HistoryStack from './HistoryStack';
const Stack = createNativeStackNavigator();

export default function ProductionStack() {
  return (
    <Stack.Navigator
      initialRouteName="ProductionMenu"
      screenOptions={{
        header: props => <AppHeader {...props} />,
      }}
    >
      <Stack.Screen
        name="ProductionMenu"
        component={ProductionMenuScreen}
        options={{ title: 'Production', headerShown: false }}
      />

      <Stack.Screen
        name="LiveProduction"
        component={ProductionScreen}
        options={{ title: 'Live Production' }}
      />

      <Stack.Screen
        name="ShiftControl"
        component={ShiftScreen}
        options={{ title: 'Shift Control' }}
      />

      <Stack.Screen
        name="ProductionHistory"
        component={HistoryStack}
        options={{ title: 'Production History', headerShown: false }}
      />

      <Stack.Screen
        name="ProductionPlanning"
        component={ProductionPlanningScreen}
        options={{ title: 'Production Planning' }}
      />

      <Stack.Screen
        name="GenerateCertificate"
        component={GenerateCertificateScreen}
        options={{ title: 'Generate Certificate' }}
      />
    </Stack.Navigator>
  );
}
