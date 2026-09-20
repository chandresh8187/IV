import RNFS from 'react-native-fs';
import { Buffer } from 'buffer';
import { downloadZincStockReportApi } from '../api/zincStockApi';

export const downloadZincStockReport = async () => {
  const response = await downloadZincStockReportApi();
  const filename = `zinc-stock-report-${new Date().toISOString().slice(0, 10)}.pdf`;
  const path = `${RNFS.DocumentDirectoryPath}/${filename}`;
  await RNFS.writeFile(path, Buffer.from(response.data).toString('base64'), 'base64');
  return { path, filename };
};
