import React from 'react';
import Renderer,{act} from 'react-test-renderer';
import {Text,TouchableOpacity,Alert} from 'react-native';
import GasManagementScreen from '../src/screens/common/GasManagementScreen';
const mockReturn=jest.fn().mockResolvedValue({message:'GAS-2 is now empty'}),mockFill=jest.fn().mockResolvedValue({message:'Placed'}),mockInvalidate=jest.fn();
const mockData={summary:{running_bottle_number:1,stored_unused_bottles:1,stored_partly_used_bottles:1},positions:[{id:1,position_no:1,status:'running',bottle_code:'Bottle 1',filled_weight_kg:525},{id:2,position_no:2,status:'ready',bottle_code:'Bottle 2',filled_weight_kg:530}],available_bottles:[{id:3,bottle_code:'Returned bottle',was_used:1,filled_weight_kg:540}],pending_empty_weights:[]};
jest.mock('react-redux',()=>({useSelector:f=>f({auth:{user:{role:'superadmin'}}})}));
jest.mock('@tanstack/react-query',()=>({useQuery:()=>({data:{data:mockData}}),useQueryClient:()=>({invalidateQueries:mockInvalidate}),useMutation:o=>({isPending:false,mutate:async b=>{try{const r=await o.mutationFn(b);o.onSuccess?.(r);}catch(e){o.onError?.(e);}}})}));
jest.mock('../src/api/gasManagementApi',()=>({returnGasBottleApi:(...a)=>mockReturn(...a),fillGasPositionApi:(...a)=>mockFill(...a)}));
jest.mock('../src/socket/socket',()=>({socket:{on:jest.fn(),off:jest.fn()}}));
jest.mock('react-native-paper',()=>({TextInput:'TextInput'}));
jest.mock('react-native-paper/lib/module/components/TextInput/TextInput',()=> 'TextInput');
jest.mock('@react-native-community/datetimepicker',()=> 'DateTimePicker');
const button=(tree,label)=>tree.root.findAllByType(TouchableOpacity).find(n=>n.findAllByType(Text).some(t=>[t.props.children].flat().join('')===label));
beforeEach(()=>{mockReturn.mockClear();mockFill.mockClear();jest.spyOn(Alert,'alert').mockImplementation(()=>{});});
afterEach(()=>jest.restoreAllMocks());
test('returning an occupied slot submits the exact bottle and reason, then refreshes stock and movement queries',async()=>{
 let tree;await act(async()=>{tree=Renderer.create(<GasManagementScreen navigation={{navigate:jest.fn()}}/>);});
 await act(async()=>button(tree,'GAS-2').props.onPress());
 expect(button(tree,'Return to stock and empty slot').props.disabled).toBe(true);
 await act(async()=>tree.root.findByProps({label:'Return reason'}).props.onChangeText('Not needed in position 2'));
 await act(async()=>button(tree,'Return to stock and empty slot').props.onPress());
 expect(mockReturn).toHaveBeenCalledWith(2,expect.objectContaining({bottle_id:2,reason:'Not needed in position 2',request_key:expect.stringMatching(/^return_/),returned_at:expect.any(String)}));
 expect(mockInvalidate).toHaveBeenCalledWith({queryKey:['gas-management']});
 await act(async()=>tree.unmount());
});
test('placing a returned partly used bottle keeps its identity and original filled weight',async()=>{
 let tree;await act(async()=>{tree=Renderer.create(<GasManagementScreen navigation={{}}/>);});
 await act(async()=>button(tree,'GAS-4').props.onPress());
 const choice=tree.root.findAllByType(TouchableOpacity).find(n=>n.findAllByType(Text).some(t=>Array.isArray(t.props.children)&&t.props.children.includes('Returned bottle')));
 await act(async()=>choice.props.onPress());
 const weight=tree.root.findByProps({label:'Original filled bottle weight (kg)'});expect(weight.props.editable).toBe(false);expect(weight.props.value).toBe('540');
 await act(async()=>button(tree,'Place filled bottle').props.onPress());
 expect(mockFill).toHaveBeenCalledWith(4,540,undefined,undefined,3);
 await act(async()=>tree.unmount());
});

test('running gas positions never expose removal or return controls',async()=>{
 let tree;await act(async()=>{tree=Renderer.create(<GasManagementScreen navigation={{}}/>);});
 await act(async()=>button(tree,'GAS-1').props.onPress());
 expect(button(tree,'Return to stock and empty slot')).toBeUndefined();
 expect(tree.root.findAllByProps({label:'Return reason'})).toHaveLength(0);
 expect(mockReturn).not.toHaveBeenCalled();
 await act(async()=>tree.unmount());
});

test('return controls disappear when a ready bottle starts while its dialog is open',async()=>{
 let tree;const previous=mockData.positions;
 try{
 await act(async()=>{tree=Renderer.create(<GasManagementScreen navigation={{}}/>);});
 await act(async()=>button(tree,'GAS-2').props.onPress());
 expect(button(tree,'Return to stock and empty slot')).toBeDefined();
 mockData.positions=previous.map(b=>b.id===2?{...b,status:'running'}:b);
 await act(async()=>tree.update(<GasManagementScreen navigation={{}}/>));
 expect(button(tree,'Return to stock and empty slot')).toBeUndefined();
 }finally{mockData.positions=previous;if(tree)await act(async()=>tree.unmount());}
});
