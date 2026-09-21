import RNFS from 'react-native-fs';
import { Buffer } from 'buffer';
import { downloadExpenseReportApi } from '../api/expenseReportApi';

export const downloadExpenseReport = async month => {
  const response = await downloadExpenseReportApi({ month });
  const filename = `expense-report-${month}.pdf`;
  const path = `${RNFS.DocumentDirectoryPath}/${filename}`;
  await RNFS.writeFile(path, Buffer.from(response.data).toString('base64'), 'base64');
  return { path, filename };
};
