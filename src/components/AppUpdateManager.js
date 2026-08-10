import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Modal, Platform, StyleSheet, View } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { Download, RefreshCw, ShieldCheck } from 'lucide-react-native';
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
  const actionLockedRef = useRef(false);

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
        setNativeProgress(currentProgress =>
          Math.max(currentProgress, clamp(event.progress, 0, 100)),
        );
      } else if (event?.type === 'verifying') {
        setPhase('verifying');
        setNativeProgress(100);
      } else if (event?.type === 'installing') {
        setPhase('installing');
        setNativeProgress(100);
      } else if (event?.type === 'error') {
        actionLockedRef.current = false;
        setPhase('error');
        setErrorMessage(event.message || 'The update could not be installed.');
      }
    });
  }, []);

  useEffect(() => {
    if (phase !== 'installing') return undefined;

    let installerWasOpened = AppState.currentState !== 'active';
    const subscription = AppState.addEventListener('change', nextState => {
      if (nextState !== 'active') {
        installerWasOpened = true;
      } else if (installerWasOpened) {
        // Returning without installing must unlock the action for a clean retry.
        actionLockedRef.current = false;
        setPhase('idle');
        setNativeProgress(0);
      }
    });

    return () => subscription.remove();
  }, [phase]);

  const startNativeUpdate = async () => {
    if (actionLockedRef.current) return;
    actionLockedRef.current = true;
    setErrorMessage('');
    setPhase('preparing');

    try {
      const allowed = await canInstallApks();

      if (!allowed) {
        Alert.alert(
          'Installation permission required',
          'Enable "Allow from this source" for IV APP, return to the app, and tap Update now again.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open settings',
              onPress: () => openInstallPermissionSettings(),
            },
          ],
        );
        setPhase('idle');
        actionLockedRef.current = false;
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
      actionLockedRef.current = false;
      setPhase('error');
      setErrorMessage(error?.message || 'Unable to start the APK download.');
    }
  };

  const startOtaUpdate = async () => {
    if (actionLockedRef.current) return;
    actionLockedRef.current = true;
    setErrorMessage('');
    setPhase('downloading');

    try {
      const result = await Updates.fetchUpdateAsync();

      if (result?.type === 'failure') {
        throw result.error || new Error('The OTA update download failed.');
      }

      setPhase('ready');
      actionLockedRef.current = false;
    } catch (error) {
      actionLockedRef.current = false;
      setPhase('error');
      setErrorMessage(error?.message || 'Unable to download the OTA update.');
    }
  };

  const reloadOtaUpdate = async () => {
    if (actionLockedRef.current) return;
    actionLockedRef.current = true;
    setErrorMessage('');
    setPhase('reloading');

    try {
      await Updates.reloadAsync();
    } catch (error) {
      actionLockedRef.current = false;
      setPhase('error');
      setErrorMessage(error?.message || 'Unable to reload the updated app.');
    }
  };

  if (!update) {
    return null;
  }

  const otaProgress = clamp(otaState.downloadProgress, 0, 1);
  const progress = isNative ? nativeProgress / 100 : otaProgress;
  const busy = [
    'preparing',
    'downloading',
    'verifying',
    'installing',
    'reloading',
  ].includes(phase);
  const showProgress = ['preparing', 'downloading', 'verifying'].includes(phase);

  const progressLabel =
    phase === 'preparing'
      ? 'Preparing secure download...'
      : phase === 'downloading'
      ? 'Downloading update'
      : phase === 'verifying'
      ? 'Verifying download...'
      : phase === 'installing'
      ? 'Opening installer...'
      : phase === 'reloading'
      ? 'Reloading app...'
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
      actionLockedRef.current = false;
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
          <View style={styles.iconCircle}>
            {isNative ? (
              <Download size={27} color={COLORS.accent} />
            ) : (
              <RefreshCw size={27} color={COLORS.accent} />
            )}
          </View>

          <Text variant="headlineSmall" style={styles.title}>Update available</Text>

          <Text style={styles.updateType}>
            {isNative
              ? `App version ${update.latestVersionName}`
              : 'Quick app update'}
          </Text>

          <View style={styles.notesBox}>
            <Text style={styles.notesTitle}>WHAT'S NEW</Text>
            <Text style={styles.notes}>{update.releaseNotes}</Text>
          </View>

          {showProgress && (
            <View style={styles.progressArea}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressText}>{progressLabel}</Text>
                <Text style={styles.progressPercent}>
                  {Math.round(progress * 100)}%
                </Text>
              </View>
              <View
                style={styles.progressTrack}
                accessibilityRole="progressbar"
                accessibilityValue={{
                  min: 0,
                  max: 100,
                  now: Math.round(progress * 100),
                }}
              >
                <View
                  style={[
                    styles.progressFill,
                    { width: `${Math.round(progress * 100)}%` },
                  ]}
                />
              </View>
            </View>
          )}

          {busy && !showProgress && (
            <View style={styles.statusBox}>
              <RefreshCw size={16} color={COLORS.accent} />
              <Text style={styles.statusText}>{progressLabel}</Text>
            </View>
          )}

          {isOta && (phase === 'ready' || otaState.isUpdatePending) && (
            <Text style={styles.readyText}>
              Update downloaded. Reload to apply it.
            </Text>
          )}

          {!!errorMessage && (
            <View style={styles.errorBox}>
              <Text style={styles.error}>{errorMessage}</Text>
            </View>
          )}

          <Button
            mode="contained"
            onPress={handleAction}
            disabled={busy}
            loading={busy}
            style={styles.primaryButton}
            contentStyle={styles.primaryButtonContent}
          >
            {busy ? 'Update in progress' : actionLabel}
          </Button>

          {!isMandatory && !busy && phase !== 'ready' && (
            <Button mode="text" onPress={dismiss}>
              Later
            </Button>
          )}

          {isMandatory && (
            <View style={styles.requiredRow}>
              <ShieldCheck size={15} color={COLORS.danger} />
              <Text style={styles.required}>This update is required to continue.</Text>
            </View>
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
    width: '100%',
    maxWidth: 430,
    alignSelf: 'center',
    borderRadius: UI.radiusLarge,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...UI.shadow,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentSoft,
    marginBottom: 14,
  },
  title: {
    color: COLORS.primary,
    fontWeight: '800',
    textAlign: 'center',
  },
  updateType: {
    marginTop: 5,
    color: COLORS.gray,
    fontWeight: '700',
    textAlign: 'center',
  },
  notesBox: {
    marginTop: 20,
    padding: 14,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  notesTitle: {
    color: COLORS.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
    marginBottom: 7,
  },
  notes: {
    lineHeight: 21,
    color: COLORS.text,
  },
  progressArea: {
    marginTop: 20,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 9,
  },
  progressText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '700',
  },
  progressPercent: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: '800',
  },
  progressTrack: {
    height: 10,
    width: '100%',
    overflow: 'hidden',
    borderRadius: 99,
    backgroundColor: COLORS.border,
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
    backgroundColor: COLORS.accent,
  },
  statusBox: {
    marginTop: 18,
    padding: 12,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.accentSoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  statusText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  readyText: {
    marginTop: 16,
    color: COLORS.primary,
    textAlign: 'center',
    fontWeight: '600',
  },
  errorBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.dangerSoft,
  },
  error: {
    color: COLORS.danger,
    fontSize: 12,
    lineHeight: 18,
  },
  primaryButton: {
    marginTop: 20,
    borderRadius: UI.radiusSmall,
  },
  primaryButtonContent: {
    minHeight: 48,
  },
  requiredRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  required: {
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '700',
  },
});
