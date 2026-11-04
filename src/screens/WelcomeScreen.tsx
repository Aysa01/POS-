import React from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { taglineText, taglineWide, taglineStacked } from '../assets/tagline';

export function WelcomeScreen({ onOpen }: { onOpen: () => void }) {
  const { width, height } = useWindowDimensions();
  const logoWidth = Math.min(width - 48, 840, height * (height < 500 ? 0.95 : 1.35));
  const tagline = width < 600 ? taglineStacked : taglineWide;
  const taglineWidth = Math.min(width - 48, tagline.width, height < 500 ? 660 : 1000);
  return (
    <View style={{ flex: 1, backgroundColor: '#7EDFCF', alignItems: 'center', justifyContent: 'center', padding: 24, overflow: 'hidden' }}>
      <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%" viewBox="0 0 1600 1000" preserveAspectRatio="none">
          <Path fill="#D96B7C" d="M-100 -80 H780 C1030 40 1160 290 1380 180 C1510 115 1560 20 1700 -70 L1700 60 C1530 280 1460 345 1270 345 C1040 345 860 235 650 250 C340 265 130 330 -100 560 Z" />
          <Path fill="#D96B7C" d="M-100 990 C100 745 250 705 470 755 C710 810 920 875 1190 800 C1430 735 1570 620 1700 440 V1100 H920 C660 1080 490 850 300 855 C120 860 40 1070 -100 1130 Z" />
        </Svg>
      </View>
      <View pointerEvents="none" style={{ alignItems: 'center', width: '100%' }}>
        <Image source={require('../assets/rositrus-wordmark.png')} accessibilityLabel="Rositrus" resizeMode="contain"
          style={{ width: logoWidth, height: logoWidth * (718 / 2191) }} />
        <View testID="welcome-tagline" accessibilityLabel={taglineText} style={{ marginTop: 16 }}>
          <Svg width={taglineWidth} height={tagline.height * taglineWidth / tagline.width} viewBox={tagline.viewBox} accessible={false}>
            <Path d={tagline.path} fill="#FFFFFF" stroke="#D96B7C" strokeWidth={4} strokeLinejoin="round" />
            <Path d={tagline.path} fill="#FFFFFF" />
          </Svg>
        </View>
      </View>
      <View testID="welcome-prompt" style={{ position: 'absolute', bottom: height < 500 ? 24 : Math.max(32, height * 0.07), left: 24, right: 24, alignItems: 'center' }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Start orders" onPress={onOpen}
          style={({ pressed }) => ({ backgroundColor: '#FFFFFF', borderRadius: 999, minHeight: 56, paddingHorizontal: 40, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 })}>
          <Text style={{ color: '#234C43', fontSize: 18, fontWeight: '700' }}>Start orders</Text>
        </Pressable>
      </View>
    </View>
  );
}
