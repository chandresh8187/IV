import { Pressable, StyleSheet, Text, View } from 'react-native';
import React from 'react';
import { ArrowLeft } from 'lucide-react-native';
import { COLORS, UI } from '../assets/Colors';

const Header = props => {
  const canGoBack = props?.navigation?.canGoBack();

  return (
    <View style={styles.header}>
      <View style={[styles.titleBox, !canGoBack && styles.titleWithoutBack]}>
        <Text style={styles.title} numberOfLines={1}>
          {props?.options?.title ? props?.options?.title : props?.route?.name}
        </Text>
      </View>

      {canGoBack && (
        <View style={styles.backBox} pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => props?.navigation.goBack()}
            android_ripple={{
              color: COLORS.lightBlue,
              borderless: false,
              radius: 20,
            }}
            hitSlop={8}
            style={({ pressed }) => [
              styles.backBtn,
              pressed && { opacity: 0.85 },
            ]}
          >
            <ArrowLeft color={COLORS.primary} />
          </Pressable>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    minHeight: 58,
    backgroundColor: COLORS.white,
    borderBottomWidth: 0,
    borderBottomColor: COLORS.divider,
  },

  titleBox: {
    minHeight: 58,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    // Keep long titles clear of the back button on both sides.
    paddingLeft: 62,
    paddingRight: 62,
  },

  titleWithoutBack: { paddingLeft: 20, paddingRight: 20 },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 1.4,
    fontWeight: '600',
    color: COLORS.gray,
    marginBottom: 4,
  },
  title: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.35,
  },

  backBox: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 12,
    alignItems: 'flex-start',
  },

  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.surfaceMuted,
  },
});

export default React.memo(Header);
