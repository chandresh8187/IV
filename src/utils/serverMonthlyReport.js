import RNFS from 'react-native-fs';
import {Buffer} from 'buffer';
import {downloadMonthlyReportApi} from '../api/monthlyReportApi';
export const downloadMonthlyReport=async params=>{const response=await downloadMonthlyReportApi(params);const filename=`monthly-operations-${params.month}.pdf`;const path=`${RNFS.DocumentDirectoryPath}/${filename}`;await RNFS.writeFile(path,Buffer.from(response.data).toString('base64'),'base64');return{path,filename};};
