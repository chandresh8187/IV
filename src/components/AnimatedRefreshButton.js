import React, { useEffect, useRef } from 'react';
import { Animated, TouchableOpacity, StyleSheet } from 'react-native';

import { RefreshCw } from 'lucide-react-native';
import { COLORS } from '../assets/Colors';

export default function AnimatedRefreshButton({
  refreshing,
  onPress,
  size = 22,
}) {
  const rotate = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animation;

    if (refreshing) {
      rotate.setValue(0);

      animation = Animated.loop(
        Animated.timing(rotate, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      );

      animation.start();
    } else {
      rotate.stopAnimation();
    }

    return () => {
      if (animation) {
        animation.stop();
      }
    };
  }, [refreshing, rotate]);

  const spin = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={refreshing}
      onPress={onPress}
      style={styles.button}
    >
      <Animated.View
        style={{
          transform: [{ rotate: spin }],
        }}
      >
        <RefreshCw size={size} color={COLORS.white} strokeWidth={2.5} />
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 46,
    height: 46,
    borderRadius: 16,
    backgroundColor: COLORS.primary,

    justifyContent: 'center',
    alignItems: 'center',

    elevation: 5,
  },
});
