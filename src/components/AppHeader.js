import { Pressable, StyleSheet, Text, View } from 'react-native';
import React from 'react';
import { ArrowLeft } from 'lucide-react-native';
import { COLORS, UI } from '../assets/Colors';

const Header = props => {
  const canGoBack = props?.navigation?.canGoBack();

  return (
    <View style={styles.header}>
      <View style={styles.titleBox}>
        <Text style={styles.title} numberOfLines={1}>
          {props?.options?.title ? props?.options?.title : props?.route?.name}
        </Text>
      </View>

      {canGoBack && (
        <View style={styles.backBox} pointerEvents="box-none">
          <Pressable
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
    height: 64,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },

  titleBox: {
    height: '100%',
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    // Keep long titles clear of the back button on both sides.
    paddingHorizontal: 60,
  },

  title: {
    color: COLORS.primary,
    fontSize: 18,
    fontWeight: '800',
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
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: UI.radiusSmall,
    backgroundColor: COLORS.surfaceMuted,
  },
});

export default React.memo(Header);
