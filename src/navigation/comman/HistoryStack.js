import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCurrentFinancialYearApi } from '../../api/financialYearsApi';
import HistoryDateDetailsScreen from '../../screens/History/HistoryDateDetailsScreen';
import HistoryListScreen from '../../screens/History/HistoryListScreen';
import HistoryMaterialSummaryScreen from '../../screens/History/HistoryMaterialSummaryScreen';
import HistoryPlanningSummaryScreen from '../../screens/History/HistoryPlanningSummaryScreen';
import HistoryPartySummaryScreen from '../../screens/History/HistoryPartySummaryScreen';
import HistoryShiftTableScreen from '../../screens/History/HistoryShiftTableScreen';
import AppHeader from '../../components/AppHeader';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HistoryFullTableScreen from './../../screens/History/HistoryFullTableScreen';
import HistoricalProductionEditScreen from '../../screens/History/HistoricalProductionEditScreen';
import { COLORS } from '../../assets/Colors';

const Stack = createNativeStackNavigator();
const renderHeader = props => <AppHeader {...props} />;

const HistoryStack = () => {
  const { data } = useQuery({
    queryKey: ['current-financial-year'],
    queryFn: getCurrentFinancialYearApi,
    retry: false,
  });
  return (
    <Stack.Navigator
      key={`${data?.data?.id || 'unconfigured'}-${
        data?.data?.financial_year || ''
      }`}
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
        name="HistoryPartySummary"
        component={HistoryPartySummaryScreen}
        options={{ title: 'Party Summary' }}
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
