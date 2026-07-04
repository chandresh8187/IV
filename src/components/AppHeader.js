import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import React from 'react';
import { ArrowLeft, ChevronLeft, Menu } from 'lucide-react-native';
import { COLORS } from '../assets/Colors';
import { TouchableRipple } from 'react-native-paper';
const Header = props => {
  return (
    <View
      style={{
        height: 50,
        backgroundColor: COLORS.primary,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider,
      }}
    >
      <View
        style={{
          height: '100%',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: COLORS.white,
            fontSize: 18,
          }}
        >
          {props?.options?.title ? props?.options?.title : props?.route?.name}
        </Text>
      </View>
      {props?.navigation?.canGoBack() && (
        <View
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            justifyContent: 'center',
            paddingHorizontal: 20,
            alignItems: 'flex-start',
          }}
        >
          <Pressable
            onPress={() => {
              props?.navigation.goBack();
            }}
            android_ripple={{
              color: 'rgba(255,255,255,0.30)',
              borderless: false,
              radius: 20,
            }}
            style={({ pressed }) => [
              {
                padding: 10,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              },
              pressed && {
                opacity: 0.85,
              },
            ]}
          >
            <ArrowLeft color={COLORS.white} />
          </Pressable>
        </View>
      )}
    </View>
  );
};

export default Header;
