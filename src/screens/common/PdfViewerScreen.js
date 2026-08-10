import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import { FileText, Share2 } from 'lucide-react-native';
import PdfRendererView from 'react-native-pdf-renderer';

import { COLORS, UI } from '../../assets/Colors';

const toFileUri = path =>
  String(path || '').startsWith('file://') ? path : `file://${path}`;

export default function PdfViewerScreen({ route }) {
  const { path, filename = 'document.pdf' } = route.params || {};
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sharing, setSharing] = useState(false);
  const fileUri = toFileUri(path);

  const handleShare = async () => {
    if (!path || sharing) return;

    setSharing(true);
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Share unavailable', 'File sharing is not available.');
        return;
      }

      await Sharing.shareAsync(fileUri, {
        dialogTitle: `Share ${filename}`,
        mimeType: 'application/pdf',
        UTI: 'com.adobe.pdf',
      });
    } catch (shareError) {
      Alert.alert(
        'Could not share PDF',
        shareError?.message || 'Please try again.',
      );
    } finally {
      setSharing(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.toolbar}>
        <View style={styles.fileIcon}>
          <FileText size={22} color={COLORS.accent} />
        </View>

        <View style={styles.fileInfo}>
          <Text style={styles.filename} numberOfLines={1}>
            {filename}
          </Text>
          <Text style={styles.pageText}>
            {totalPages ? `Page ${page} of ${totalPages}` : 'PDF document'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.shareButton}
          onPress={handleShare}
          disabled={sharing}
        >
          {sharing ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Share2 size={19} color={COLORS.white} />
          )}
          <Text style={styles.shareText}>SHARE</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.viewerCard}>
        {path && !error ? (
          <PdfRendererView
            style={styles.viewer}
            source={fileUri}
            distanceBetweenPages={14}
            maxZoom={4}
            maxPageResolution={2048}
            onPageChange={(currentPage, pageCount) => {
              setPage(currentPage);
              setTotalPages(pageCount);
              setLoading(false);
            }}
            onError={() => {
              setLoading(false);
              setError('The PDF could not be displayed. Please generate it again.');
            }}
          />
        ) : (
          <View style={styles.messageBox}>
            <FileText size={42} color={COLORS.muted} />
            <Text style={styles.errorTitle}>PDF preview unavailable</Text>
            <Text style={styles.errorText}>
              {error || 'The PDF file path is missing.'}
            </Text>
          </View>
        )}

        {loading && !error && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.loadingText}>Loading PDF...</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: 12,
  },
  toolbar: {
    minHeight: 68,
    padding: 10,
    borderRadius: UI.radius,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...UI.shadow,
  },
  fileIcon: {
    width: 42,
    height: 42,
    borderRadius: UI.radiusSmall,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accentSoft,
  },
  fileInfo: {
    flex: 1,
    paddingHorizontal: 10,
  },
  filename: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  pageText: {
    color: COLORS.gray,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
  },
  shareButton: {
    minWidth: 92,
    height: 42,
    paddingHorizontal: 13,
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.accent,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  shareText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.4,
  },
  viewerCard: {
    flex: 1,
    marginTop: 12,
    borderRadius: UI.radius,
    overflow: 'hidden',
    backgroundColor: COLORS.surfaceMuted,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  viewer: {
    flex: 1,
    backgroundColor: COLORS.surfaceMuted,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceMuted,
  },
  loadingText: {
    color: COLORS.gray,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 10,
  },
  messageBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  errorTitle: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '800',
    marginTop: 14,
  },
  errorText: {
    color: COLORS.gray,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 6,
  },
});
