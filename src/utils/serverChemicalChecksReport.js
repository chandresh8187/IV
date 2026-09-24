import RNFS from 'react-native-fs';
import { Buffer } from 'buffer';
import { downloadChemicalChecksReportApi } from '../api/chemicalChecksApi';

export const downloadChemicalChecksReport = async month => {
  const response = await downloadChemicalChecksReportApi({ month });
  const filename = `chemical-checks-${month}.pdf`;
  const path = `${RNFS.DocumentDirectoryPath}/${filename}`;
  await RNFS.writeFile(path, Buffer.from(response.data).toString('base64'), 'base64');
  return { path, filename };
};
