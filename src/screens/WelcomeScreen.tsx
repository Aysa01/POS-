import React from 'react';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { startOrdersPath, startOrdersViewBox, startOrdersWidth, startOrdersHeight } from '../assets/start-orders';

export function WelcomeScreen({ onOpen }: { onOpen: () => void }) {
  const { width, height } = useWindowDimensions();
  const logoWidth = Math.min(width - 48, 840, height * (height < 500 ? 0.95 : 1.35));
  const promptWidth = Math.min(width - 48, startOrdersWidth);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="tap anywhere to start" onPress={onOpen}
      style={({ pressed }) => ({ flex: 1, backgroundColor: '#7EDFCF', alignItems: 'center', justifyContent: 'center', padding: 24, overflow: 'hidden', opacity: pressed ? 0.96 : 1 })}>
      <View pointerEvents="none" accessible={false} style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%" viewBox="0 0 1600 1000" preserveAspectRatio="none">
          <Path fill="#D96B7C" d="M-100 -80 H780 C1030 40 1160 290 1380 180 C1510 115 1560 20 1700 -70 L1700 60 C1530 280 1460 345 1270 345 C1040 345 860 235 650 250 C340 265 130 330 -100 560 Z" />
          <Path fill="#D96B7C" d="M-100 990 C100 745 250 705 470 755 C710 810 920 875 1190 800 C1430 735 1570 620 1700 440 V1100 H920 C660 1080 490 850 300 855 C120 860 40 1070 -100 1130 Z" />
        </Svg>
      </View>
      <View pointerEvents="none" style={{ alignItems: 'center', width: '100%' }}>
        <Image source={require('../assets/rositrus-wordmark.png')} accessibilityLabel="Rositrus" resizeMode="contain"
          style={{ width: logoWidth, height: logoWidth * (718 / 2191) }} />
        <Text style={{ color: '#234C43', fontSize: 16, marginTop: 12, textAlign: 'center' }}>Your everyday drink counter.</Text>
      </View>
        <View pointerEvents="none" testID="welcome-prompt" style={{ position: 'absolute', bottom: height < 500 ? 64 : Math.max(84, height * 0.14), left: 24, right: 24, alignItems: 'center', opacity: 0.5 }}>
          <Svg width={promptWidth} height={startOrdersHeight * promptWidth / startOrdersWidth} viewBox={startOrdersViewBox} accessible={false}>
            <Path d={startOrdersPath} fill="#FFFFFF" stroke="#D96B7C" strokeWidth={3} strokeLinejoin="round" />
            <Path d={startOrdersPath} fill="#FFFFFF" />
          </Svg>
        </View>
      <Text style={{ position: 'absolute', bottom: 24, color: '#234C43', fontSize: 12 }}>ROSITRUS LOCAL POS</Text>
    </Pressable>
  );
}
