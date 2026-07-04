import { NativeModules } from 'react-native';

const { ShareIntentModule } = NativeModules;

export const getSharedPdf = async () => {
  if (!ShareIntentModule) {
    return null;
  }

  return ShareIntentModule.getSharedPdf();
};

export const clearSharedPdf = () => {
  if (ShareIntentModule) {
    ShareIntentModule.clearSharedPdf();
  }
};
