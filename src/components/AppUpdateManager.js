import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Platform, StyleSheet, View } from 'react-native';
import { Button, ProgressBar, Text } from 'react-native-paper';
import * as Updates from 'expo-updates';

import { getAndroidUpdateApi } from '../api/appUpdateApi';
import { COLORS, UI } from '../assets/Colors';
import {
  canInstallApks,
  downloadAndInstallApk,
  getCurrentAppVersion,
  isNativeUpdaterAvailable,
  openInstallPermissionSettings,
  subscribeToNativeUpdateEvents,
} from '../native/NativeAppUpdater';

const CHECK_DELAY_MS = 2500;

const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, Number(value) || 0));

const getOtaReleaseNotes = manifest =>
  manifest?.extra?.releaseNotes ||
  manifest?.extra?.expoClient?.extra?.releaseNotes ||
  'JavaScript, screen, and asset improvements are ready.';

export default function AppUpdateManager() {
  const otaState = Updates.useUpdates();
  const [update, setUpdate] = useState(null);
  const [phase, setPhase] = useState('idle');
  const [nativeProgress, setNativeProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  const isNative = update?.type === 'native';
  const isOta = update?.type === 'ota';

  const isMandatory = useMemo(() => {
    if (!isNative) {
      return false;
    }

    return (
      Boolean(update.mandatory) ||
      Number(update.currentVersionCode) < Number(update.minimumVersionCode)
    );
  }, [isNative, update]);

  useEffect(() => {
    let mounted = true;

    const checkForUpdates = async () => {
      // Native has priority. Do not offer an OTA update when the installed
      // native runtime is known to be outdated.
      if (Platform.OS === 'android' && isNativeUpdaterAvailable) {
        try {
          const [serverInfo, installedInfo] = await Promise.all([
            getAndroidUpdateApi(),
            getCurrentAppVersion(),
          ]);

          if (
            serverInfo?.enabled &&
            Number(serverInfo.latestVersionCode) >
              Number(installedInfo.versionCode)
          ) {
            if (mounted) {
              setUpdate({
                type: 'native',
                ...serverInfo,
                currentVersionCode: installedInfo.versionCode,
                currentVersionName: installedInfo.versionName,
              });
            }
            return;
          }
        } catch (error) {
          // A failed native check must never stop the app from opening.
        }
      }

      // expo-updates APIs are intended for configured release builds.
      if (__DEV__ || !Updates.isEnabled) {
        return;
      }

      try {
        const result = await Updates.checkForUpdateAsync();

        if (mounted && result?.isAvailable) {
          setUpdate({
            type: 'ota',
            releaseNotes: getOtaReleaseNotes(result.manifest),
          });
        }
      } catch (error) {
        // OTA errors are non-blocking; the embedded/current bundle continues.
      }
    };

    const timer = setTimeout(checkForUpdates, CHECK_DELAY_MS);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!isNativeUpdaterAvailable) {
      return undefined;
    }

    return subscribeToNativeUpdateEvents(event => {
      if (event?.type === 'progress') {
        setPhase('downloading');
        setNativeProgress(clamp(event.progress, 0, 100));
      } else if (event?.type === 'verifying') {
        setPhase('verifying');
        setNativeProgress(100);
      } else if (event?.type === 'installing') {
        setPhase('installing');
        setNativeProgress(100);
      } else if (event?.type === 'error') {
        setPhase('error');
        setErrorMessage(event.message || 'The update could not be installed.');
      }
    });
  }, []);

  const startNativeUpdate = async () => {
    setErrorMessage('');

    try {
      const allowed = await canInstallApks();

      if (!allowed) {
        Alert.alert(
          'Installation permission required',
          'Enable “Allow from this source” for IV APP, return to the app, and tap Update now again.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open settings',
              onPress: () => openInstallPermissionSettings(),
            },
          ],
        );
        return;
      }

      setPhase('downloading');
      setNativeProgress(0);

      await downloadAndInstallApk({
        apkUrl: update.apkUrl,
        sha256: update.sha256,
        versionCode: update.latestVersionCode,
      });
    } catch (error) {
      setPhase('error');
      setErrorMessage(error?.message || 'Unable to start the APK download.');
    }
  };

  const startOtaUpdate = async () => {
    setErrorMessage('');
    setPhase('downloading');

    try {
      const result = await Updates.fetchUpdateAsync();

      if (result?.type === 'failure') {
        throw result.error || new Error('The OTA update download failed.');
      }

      setPhase('ready');
    } catch (error) {
      setPhase('error');
      setErrorMessage(error?.message || 'Unable to download the OTA update.');
    }
  };

  const reloadOtaUpdate = async () => {
    setErrorMessage('');
    setPhase('reloading');

    try {
      await Updates.reloadAsync();
    } catch (error) {
      setPhase('error');
      setErrorMessage(error?.message || 'Unable to reload the updated app.');
    }
  };

  if (!update) {
    return null;
  }

  const otaProgress = clamp(otaState.downloadProgress, 0, 1);
  const progress = isNative ? nativeProgress / 100 : otaProgress;
  const busy = ['downloading', 'verifying', 'installing', 'reloading'].includes(
    phase,
  );

  const progressLabel =
    phase === 'downloading'
      ? `Downloading ${Math.round(progress * 100)}%`
      : phase === 'verifying'
      ? 'Verifying update…'
      : phase === 'installing'
      ? 'Opening installer…'
      : phase === 'reloading'
      ? 'Reloading app…'
      : '';

  const actionLabel = isNative
    ? 'Update now'
    : phase === 'ready' || otaState.isUpdatePending
    ? 'Reload now'
    : 'Download update';

  const handleAction = () => {
    if (isNative) {
      startNativeUpdate();
    } else if (phase === 'ready' || otaState.isUpdatePending) {
      reloadOtaUpdate();
    } else {
      startOtaUpdate();
    }
  };

  const dismiss = () => {
    if (!isMandatory && !busy) {
      setUpdate(null);
      setPhase('idle');
      setErrorMessage('');
    }
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={dismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text variant="headlineSmall" style={styles.title}>
            New update available
          </Text>

          <Text style={styles.updateType}>
            {isNative
              ? `App version ${update.latestVersionName}`
              : 'Quick app update'}
          </Text>

          <Text style={styles.notes}>{update.releaseNotes}</Text>

          {busy && (
            <View style={styles.progressArea}>
              <ProgressBar progress={progress} color={COLORS.primary} />
              <Text style={styles.progressText}>{progressLabel}</Text>
            </View>
          )}

          {isOta && (phase === 'ready' || otaState.isUpdatePending) && (
            <Text style={styles.readyText}>
              Update downloaded. Reload to apply it.
            </Text>
          )}

          {!!errorMessage && <Text style={styles.error}>{errorMessage}</Text>}

          <Button
            mode="contained"
            onPress={handleAction}
            disabled={busy}
            style={styles.primaryButton}
          >
            {busy ? progressLabel : actionLabel}
          </Button>

          {!isMandatory && !busy && phase !== 'ready' && (
            <Button mode="text" onPress={dismiss}>
              Later
            </Button>
          )}

          {isMandatory && (
            <Text style={styles.required}>
              This native update is required to continue.
            </Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: 'rgba(8, 16, 35, 0.72)',
  },
  card: {
    padding: 22,
    borderRadius: UI.radius,
    backgroundColor: COLORS.white,
  },
  title: {
    color: COLORS.primary,
    fontWeight: '700',
    textAlign: 'center',
  },
  updateType: {
    marginTop: 6,
    color: COLORS.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  notes: {
    marginTop: 18,
    lineHeight: 21,
    color: COLORS.text,
  },
  progressArea: {
    marginTop: 20,
  },
  progressText: {
    marginTop: 8,
    textAlign: 'center',
  },
  readyText: {
    marginTop: 16,
    color: COLORS.primary,
    textAlign: 'center',
    fontWeight: '600',
  },
  error: {
    marginTop: 14,
    color: '#B3261E',
  },
  primaryButton: {
    marginTop: 20,
  },
  required: {
    marginTop: 10,
    color: '#B3261E',
    textAlign: 'center',
    fontSize: 12,
  },
});
