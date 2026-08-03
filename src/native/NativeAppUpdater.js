import {NativeEventEmitter, NativeModules, Platform} from 'react-native';

const nativeUpdater = NativeModules.NativeAppUpdater;

const requireAndroidUpdater = () => {
  if (Platform.OS !== 'android' || !nativeUpdater) {
    throw new Error(
      'NativeAppUpdater is not installed in this Android build. Install the updater native module and rebuild the APK.',
    );
  }

  return nativeUpdater;
};

export const isNativeUpdaterAvailable =
  Platform.OS === 'android' && Boolean(nativeUpdater);

export const getCurrentAppVersion = () =>
  requireAndroidUpdater().getCurrentVersion();

export const canInstallApks = () =>
  requireAndroidUpdater().canRequestPackageInstalls();

export const openInstallPermissionSettings = () =>
  requireAndroidUpdater().openInstallPermissionSettings();

export const downloadAndInstallApk = ({apkUrl, sha256, versionCode}) =>
  requireAndroidUpdater().downloadAndInstall(
    String(apkUrl),
    String(sha256),
    Number(versionCode),
  );

export const subscribeToNativeUpdateEvents = listener => {
  if (!isNativeUpdaterAvailable) {
    return () => {};
  }

  const emitter = new NativeEventEmitter(nativeUpdater);
  const subscription = emitter.addListener('NativeAppUpdateEvent', listener);

  return () => subscription.remove();
};
