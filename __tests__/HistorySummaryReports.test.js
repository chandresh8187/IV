import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { Text, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import MaterialSummary from '../src/screens/History/HistoryMaterialSummaryScreen';
import PlanningSummary from '../src/screens/History/HistoryPlanningSummaryScreen';
import { downloadProductionReport } from '../src/utils/serverProductionReport';
jest.mock('@tanstack/react-query', () => ({ useQuery: jest.fn() }));
jest.mock('react-redux', () => ({ useSelector: jest.fn() }));
jest.mock('../src/api/historyApi', () => ({ getHistoryMaterialSummaryApi: jest.fn(), getHistoryPlanningSummaryApi: jest.fn() }));
jest.mock('../src/utils/serverProductionReport', () => ({ downloadProductionReport: jest.fn() }));
jest.mock('../src/utils/responsive', () => ({ getGridColumns: () => 1, useResponsive: () => ({}), centeredContent: () => ({}) }));
const material={item_id:9,material_name:'MS BEAM',material_descriptions:'MS BEAM 4mm',total_production_qty:30,total_ms_production_kg:400,total_gi_production_kg:428};
const plan={planning_id:100,planning_item_id:1,challan_no:'DC/2026-27/123',planned_qty:100,completed_qty:50,material_description:'MS BEAM 4mm'};
const route={params:{date:'2026-10-16',shift_name:'night'}};
let tree;
const text=()=>tree.root.findAllByType(Text).map(node=>node.props.children).flat().join(' ');
const button=()=>tree.root.findAllByType(TouchableOpacity).find(node=>node.props.accessibilityRole==='button');
beforeEach(()=>{jest.clearAllMocks();useSelector.mockReturnValue({role:'superadmin'});downloadProductionReport.mockResolvedValue({path:'/sample.pdf',filename:'sample.pdf'});});
afterEach(()=>{if(tree)act(()=>tree.unmount());tree=null;});
test('material name and quantity use the API fields and PDF retains item/date/shift scope',async()=>{
 const navigation={navigate:jest.fn()};useQuery.mockReturnValue({data:{data:[material]}});
 act(()=>{tree=renderer.create(<MaterialSummary route={route} navigation={navigation}/>);});
 expect(text()).toContain('MS BEAM');expect(text()).toContain('30');
 await act(async()=>button().props.onPress());
 expect(downloadProductionReport).toHaveBeenCalledWith({type:'material',value:'MS BEAM',date:'2026-10-16',item_id:9,shift_name:'night'});
 expect(navigation.navigate).toHaveBeenCalledWith('PdfViewer',expect.objectContaining({path:'/sample.pdf'}));
});
test('planning card includes PDF button with exact planning item and selected operating scope',async()=>{
 useQuery.mockReturnValue({data:{data:[plan]}});
 act(()=>{tree=renderer.create(<PlanningSummary route={route} navigation={{navigate:jest.fn()}}/>);});
 expect(text()).toContain('PDF Report');
 await act(async()=>button().props.onPress());
 expect(downloadProductionReport).toHaveBeenCalledWith({type:'challan',value:'DC/2026-27/123',date:'2026-10-16',shift_name:'night',planning_id:100,planning_item_id:1});
});
for(const [label,Component] of [['material',MaterialSummary],['planning',PlanningSummary]]){
 test(`${label} request failure shows retry rather than a false empty summary`,()=>{
  const refetch=jest.fn();useQuery.mockReturnValue({isError:true,refetch,data:{data:[material]}});
  act(()=>{tree=renderer.create(<Component route={route} navigation={{navigate:jest.fn()}}/>);});
  expect(text()).toContain(`Could not load ${label} summary`);
  act(()=>button().props.onPress());expect(refetch).toHaveBeenCalled();
 });
 test(`${label} PDF is hidden without report permission`,()=>{
  useSelector.mockReturnValue({role:'supervisor',permissions:['history.view']});useQuery.mockReturnValue({data:{data:label==='material'?[material]:[plan]}});
  act(()=>{tree=renderer.create(<Component route={route} navigation={{navigate:jest.fn()}}/>);});
  expect(text()).not.toContain('PDF Report');
 });
}
