import React from 'react';
import HistoryDateDetailsScreen from '../../screens/History/HistoryDateDetailsScreen';
import HistoryListScreen from '../../screens/History/HistoryListScreen';
import HistoryMaterialSummaryScreen from '../../screens/History/HistoryMaterialSummaryScreen';
import HistoryPlanningSummaryScreen from '../../screens/History/HistoryPlanningSummaryScreen';
import HistoryShiftTableScreen from '../../screens/History/HistoryShiftTableScreen';
import AppHeader from '../../components/AppHeader';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HistoryFullTableScreen from './../../screens/History/HistoryFullTableScreen';

const Stack = createNativeStackNavigator();

const HistoryStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        header: props => <AppHeader {...props} />,
      }}
    >
      <Stack.Screen
        name="HistoryList"
        options={{ title: 'All Dates' }}
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
    </Stack.Navigator>
  );
};

export default HistoryStack;
