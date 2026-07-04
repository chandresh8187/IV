import { NativeModules } from 'react-native';

const { PdfOpenerModule } = NativeModules;

export const openPdfFile = async path => {
  if (!PdfOpenerModule) {
    throw new Error('PdfOpenerModule not found');
  }

  return PdfOpenerModule.openPdf(path);
};
