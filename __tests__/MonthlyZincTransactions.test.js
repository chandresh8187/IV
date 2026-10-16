import React from 'react';
import { act, create } from 'react-test-renderer';
import { Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import MonthlyReportsScreen from '../src/screens/common/MonthlyReportsScreen';
jest.mock('react-redux', () => ({ useSelector: () => ({ permissions: ['monthly_reports.view'] }) }));
jest.mock('@tanstack/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('react-native-dropdown-picker', () => 'DropDownPicker');
jest.mock('../src/api/financialYearsApi', () => ({ getFinancialYearsApi: jest.fn() }));
jest.mock('../src/api/monthlyReportApi', () => ({ getMonthlyReportApi: jest.fn() }));
jest.mock('../src/utils/serverMonthlyReport', () => ({ downloadMonthlyReport: jest.fn(), downloadDailyProductionReport: jest.fn() }));
jest.mock('../src/utils/responsive', () => ({ useResponsive: () => ({}), centeredContent: () => ({}) }));
test('monthly screen includes transactions and per-batch production usage', () => {
 useQuery.mockImplementation(({queryKey}) => queryKey[0] === 'financial-years'
  ? {data:{data:[{id:1,financial_year:'2026-27',is_current:true}]}}
  : {data:{data:{period:{label:'October 2026'},production:{},zinc:{production_used_kg:5000,production_restored_kg:0},byproducts:{},expenses:{totals:{},expenses:{}},shifts:[],materials:[],contractors:[],planning:[],zinc_movements:[
    {id:7,movement_type:'production_summary',transaction_date:'2026-10-16',shift_name:'day',amount_kg:5000,batch_allocations:[
      {receipt_id:1,batch_number:'123456',invoice_number:'INV-1',amount_kg:3000},
      {receipt_id:2,batch_number:'654321',invoice_number:'INV-2',amount_kg:2000},
    ]},
  ]}}});
 let tree;
 act(()=>{tree=create(<MonthlyReportsScreen navigation={{navigate:jest.fn()}}/>);});
 const content=tree.root.findAllByType(Text).map(node=>node.props.children).flat().join(' ');
 for(const value of ['Zinc Transactions','123456','654321','INV-1','INV-2','3,000','2,000'])expect(content).toContain(value);
 act(()=>tree.unmount());
});
