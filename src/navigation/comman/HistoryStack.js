import React from 'react';
import HistoryDateDetailsScreen from '../../screens/History/HistoryDateDetailsScreen';
import HistoryListScreen from '../../screens/History/HistoryListScreen';
import HistoryMaterialSummaryScreen from '../../screens/History/HistoryMaterialSummaryScreen';
import HistoryPlanningSummaryScreen from '../../screens/History/HistoryPlanningSummaryScreen';
import HistoryShiftTableScreen from '../../screens/History/HistoryShiftTableScreen';
import AppHeader from '../../components/AppHeader';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HistoryFullTableScreen from './../../screens/History/HistoryFullTableScreen';
import HistoricalProductionEditScreen from '../../screens/History/HistoricalProductionEditScreen';
import { COLORS } from '../../assets/Colors';

const Stack = createNativeStackNavigator();
const renderHeader = props => <AppHeader {...props} />;

const HistoryStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        header: renderHeader,
        contentStyle: { backgroundColor: COLORS.bg },
      }}
    >
      <Stack.Screen
        name="HistoryList"
        options={{ title: 'Production History' }}
        component={HistoryListScreen}
      />
      <Stack.Screen
        name="HistoryDateDetails"
        component={HistoryDateDetailsScreen}
        options={{ title: 'History' }}
      />
      <Stack.Screen
        name="HistoryShiftTable"
        component={HistoryShiftTableScreen}
        options={{ title: 'Shift Wise' }}
      />
      <Stack.Screen
        name="HistoryMaterialSummary"
        component={HistoryMaterialSummaryScreen}
        options={{ title: 'Material Summary' }}
      />
      <Stack.Screen
        name="HistoryPlanningSummary"
        options={{ title: 'Planning Summary' }}
        component={HistoryPlanningSummaryScreen}
      />
      <Stack.Screen
        name="HistoryFullTable"
        options={{ title: 'Production Table' }}
        component={HistoryFullTableScreen}
      />
      <Stack.Screen
        name="HistoricalProductionEdit"
        options={{ title: 'Edit Production' }}
        component={HistoricalProductionEditScreen}
      />
    </Stack.Navigator>
  );
};

export default HistoryStack;
