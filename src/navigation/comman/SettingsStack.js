import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { COLORS } from '../../assets/Colors';
import AppHeader from '../../components/AppHeader';
import FinancialYearScreen from '../../screens/settings/FinancialYearScreen';
import ItemsScreen from '../../screens/settings/ItemsScreen';
import ContractorsScreen from '../../screens/settings/ContractorsScreen';
import SettingsMenuScreen from '../../screens/settings/SettingsMenuScreen';
import ControlPanelScreen from '../../screens/superadmin/ControlPanelScreen';
import NotificationTestScreen from '../../screens/superadmin/NotificationTestScreen';

const Stack = createNativeStackNavigator();
const renderHeader = props => <AppHeader {...props} />;

export default function SettingsStack() {
  return (
    <Stack.Navigator
      initialRouteName="SettingsMenu"
      screenOptions={{
        header: renderHeader,
        contentStyle: { backgroundColor: COLORS.bg },
      }}
    >
      <Stack.Screen
        name="SettingsMenu"
        component={SettingsMenuScreen}
        options={{ title: 'Settings', headerShown: false }}
      />
      <Stack.Screen
        name="Items"
        component={ItemsScreen}
        options={{ title: 'Items' }}
      />
      <Stack.Screen
        name="Contractors"
        component={ContractorsScreen}
        options={{ title: 'Contractors' }}
      />
      <Stack.Screen
        name="FinancialYear"
        component={FinancialYearScreen}
        options={{ title: 'Financial Year' }}
      />
      <Stack.Screen
        name="ControlPanel"
        component={ControlPanelScreen}
        options={{ title: 'Control Panel' }}
      />
      <Stack.Screen
        name="NotificationTest"
        component={NotificationTestScreen}
        options={{ title: 'Test Notifications' }}
      />
    </Stack.Navigator>
  );
}
