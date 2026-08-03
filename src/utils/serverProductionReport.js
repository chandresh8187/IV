import RNFS from 'react-native-fs';
import { Buffer } from 'buffer';
import { downloadProductionReportApi } from '../api/historyApi';
import { openPdfFile } from '../native/PdfOpener';

const safeName = value =>
  String(value || 'production-report').replace(/[^a-z0-9_-]+/gi, '-');

export const downloadAndOpenProductionReport = async params => {
  const response = await downloadProductionReportApi(params);
  const filename = `production-${safeName(params.type)}-${safeName(
    params.value,
  )}.pdf`;
  const path = `${RNFS.DocumentDirectoryPath}/${filename}`;
  const base64 = Buffer.from(response.data).toString('base64');
  await RNFS.writeFile(path, base64, 'base64');
  await openPdfFile(path);
  return path;
};
