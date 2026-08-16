import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { useSelector } from 'react-redux';
import AppHeader from '../../components/AppHeader';
import ProductionScreen from '../../screens/superadmin/ProductionScreen';
import ShiftScreen from '../../screens/supervisor/ShiftScreen';
import ProductionMenuScreen from './../../screens/common/ProductionMenuScreen';
import ProductionPlanningScreen from './../../screens/common/ProductionPlanningScreen';
import GenerateCertificateScreen from './../../screens/common/GenerateCertificateScreen';
import HistoryStack from './HistoryStack';
import ControlPanelScreen from '../../screens/superadmin/ControlPanelScreen';
import NotificationTestScreen from '../../screens/superadmin/NotificationTestScreen';
import PdfViewerScreen from '../../screens/common/PdfViewerScreen';
import { COLORS } from '../../assets/Colors';
import { shouldOpenLiveProductionDirectly } from '../../utils/accessNavigation';
const Stack = createNativeStackNavigator();
const renderHeader = props => <AppHeader {...props} />;

export default function ProductionStack() {
  const user = useSelector(state => state.auth.user);
  const directLiveProduction = shouldOpenLiveProductionDirectly(user);

  return (
    <Stack.Navigator
      key={directLiveProduction ? 'direct-live-production' : 'production-menu'}
      initialRouteName={directLiveProduction ? 'LiveProduction' : 'ProductionMenu'}
      screenOptions={{
        header: renderHeader,
        contentStyle: { backgroundColor: COLORS.bg },
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
        options={{ title: 'Automatic Shift' }}
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
      <Stack.Screen
        name="PdfViewer"
        component={PdfViewerScreen}
        options={({ route }) => ({
          title: route.params?.title || 'PDF Preview',
        })}
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
