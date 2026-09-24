import {
  ClipboardList,
  Factory,
  FileCheck2,
  Gauge,
  History,
  Settings2,
  Users,
  Calculator,
  Receipt,
  Package,
  FlaskConical,
} from 'lucide-react-native';
import React from 'react';
import { useSelector } from 'react-redux';

import ModuleMenu from '../../components/ModuleMenu';
import { hasPermission } from '../../utils/permissions';
import { shouldShowShiftInProductionMenu } from '../../utils/accessNavigation';

const PRODUCTION_ACTIONS = [
  {
    title: 'Live Production',
    icon: Factory,
    screen: 'LiveProduction',
    description: 'Record output, review readings and correct shift entries.',
    primary: true,
    permission: 'production.view',
  },
  {
    title: 'Production Planning',
    icon: ClipboardList,
    screen: 'ProductionPlanning',
    description: 'Manage challans, materials and production targets.',
    permission: 'planning.view',
  },
  {
    title: 'Production History',
    icon: History,
    screen: 'ProductionHistory',
    description: 'Review day and night shifts, materials and planning.',
    permission: 'history.view',
  },
  {
    title: 'Rate Calculator',
    icon: Calculator,
    screen: 'RateCalculator',
    description: 'Calculate zinc cost and final production rate per kg.',
    permission: 'rate_calculator.view',
  },
  {
    title: 'Contract Production',
    icon: Users,
    screen: 'Contractors',
    description: 'Review monthly production totals for each contractor.',
    permission: 'contractors.view',
  },
  {
    title: 'Expense Report',
    icon: Receipt,
    screen: 'ExpenseReport',
    description: 'Review monthly production costs and running plant cost.',
    permission: 'expense_report.view',
  },
  {
    title: 'Monthly Reports',
    icon: ClipboardList,
    screen: 'MonthlyReports',
    description: 'View and export complete reports for previous months.',
    permission: 'monthly_reports.view',
  },
  {
    title: 'Zinc Stock',
    icon: Package,
    screen: 'ZincStock',
    description: 'Track zinc in the plant and kettle tank.',
    permission: 'zinc_stock.view',
  },
  {
    title: 'Chemical Tracking',
    icon: FlaskConical,
    screen: 'ChemicalTracking',
    description: 'Record flux temperature and daily flux and acid readings.',
    permission: 'chemical_checks.view',
  },
  {
    title: 'Shift Status',
    icon: Settings2,
    screen: 'ShiftControl',
    description: 'Check shift status, start times and handover.',
    permission: 'shifts.view',
  },
  {
    title: 'Test Certificate',
    icon: FileCheck2,
    screen: 'GenerateCertificate',
    description: 'Generate coating certificates from production readings.',
    permission: 'certificates.view',
  },
  {
    title: 'Plant Control',
    icon: Gauge,
    screen: 'PlantControl',
    description: 'Manage running, stopped and maintenance status.',
    permission: 'plant.view',
  },
];

export default function ProductionMenuScreen({ navigation }) {
  const user = useSelector(state => state.auth.user);
  const actions = PRODUCTION_ACTIONS.filter(item =>
    item.screen === 'ShiftControl'
      ? shouldShowShiftInProductionMenu(user)
      : hasPermission(user, item.permission),
  );

  return (
    <ModuleMenu
      eyebrow="IV / PLANT OPERATIONS"
      title="Production"
      description="Plan, record and review your galvanizing operations."
      actions={actions}
      onSelect={item => navigation.navigate(item.screen)}
    />
  );
}
