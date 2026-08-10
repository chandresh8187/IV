import RNFS from 'react-native-fs';
import { Buffer } from 'buffer';

import { generateCertificatePdfApi } from '../api/certificateApi';

const safeName = value =>
  String(value || 'certificate').replace(/[^a-z0-9_-]+/gi, '-');

export const downloadCertificatePdf = async ({
  certificate,
  readings,
}) => {
  const response = await generateCertificatePdfApi({ certificate, readings });
  const filename = `certificate-${safeName(certificate.tc_no)}.pdf`;
  const path = `${RNFS.DocumentDirectoryPath}/${filename}`;
  const base64 = Buffer.from(response.data).toString('base64');

  await RNFS.writeFile(path, base64, 'base64');

  return { path, filename };
};
