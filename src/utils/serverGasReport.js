import RNFS from 'react-native-fs';
import { Buffer } from 'buffer';
import { downloadGasReportApi } from '../api/gasManagementApi';
export const downloadGasReport=async()=>{const response=await downloadGasReportApi();const filename=`gas-stock-report-${Date.now()}.pdf`;const path=`${RNFS.DocumentDirectoryPath}/${filename}`;await RNFS.writeFile(path,Buffer.from(response.data).toString('base64'),'base64');return{path,filename};};
