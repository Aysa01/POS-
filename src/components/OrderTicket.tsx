import React, { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Check, GripVertical, Info, LockKeyhole, MoveRight } from 'lucide-react-native';
import { Button, C, S } from './ui';
import { statusColors } from './StatusBadge';
import { dateTime, money } from '../utils/domain';
import type { Order } from '../types';

const mono = Platform.select({ ios: 'Menlo', default: 'monospace' });
const topEdge = 'M0 8 L0 3 ' + Array.from({ length: 30 }, (_, index) => {
  const x = index * 8;
  return `Q${x + 4} 11 ${x + 8} 3`;
}).join(' ') + ' L240 8 Z';

function PaperEdge({ bottom = false }: { bottom?: boolean }) {
  return <Svg pointerEvents="none" width="100%" height={7} viewBox="0 0 240 8" preserveAspectRatio="none" style={bottom ? { transform: [{ scaleY: -1 }] } : undefined}>
    <Path d={topEdge} fill="#FFFFFF" />
  </Svg>;
}

export function OrderTicket({ order, onMove, onDetails }: { order: Order; onMove: () => void; onDetails: () => void }) {
  const [paperWidth, setPaperWidth] = useState(0);
  const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const color = statusColors[order.status];
  const total = money(order.total);
  const totalFontSize = paperWidth ? Math.min(26, Math.max(18, Math.floor((paperWidth - 24) / (total.length * 0.64)))) : 26;
  return <View>
    <PaperEdge />
    <View onLayout={event => setPaperWidth(event.nativeEvent.layout.width)} style={{ backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 16, gap: 16 }}>
      <View style={[S.row, { gap: 8 }]}>
        <View style={{ backgroundColor: C.dark, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 7 }}>
          <Text style={{ color: '#FFFFFF', fontFamily: mono, fontSize: 12, fontWeight: '700' }}>{order.invoice}</Text>
        </View>
        <Text style={{ flex: 1, color: C.muted, fontFamily: mono, fontSize: 11 }}>#{order.id}</Text>
        {order.status === 'Done' ? <LockKeyhole size={15} color={C.muted} accessibilityLabel="Finalized receipt" /> : <GripVertical size={16} color={C.muted} />}
      </View>
      <View style={S.line} />
      <View style={{ gap: 5 }}>
        <Text style={{ color: C.muted, fontFamily: mono, fontSize: 10, letterSpacing: 0.8 }}>CUSTOMER</Text>
        <Text style={{ color: C.ink, fontSize: 23, lineHeight: 29, fontWeight: '800' }}>{order.customer}</Text>
      </View>
      <View style={{ borderTopWidth: 1, borderColor: C.line, borderStyle: 'dashed' }} />
      <View style={{ gap: 12 }}>
        {order.items.map(item => <View key={item.productId} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <Text style={{ flex: 1, minWidth: 0, color: C.ink, fontFamily: mono, fontSize: 12, lineHeight: 19, fontWeight: '700' }}>{item.quantity} × {item.name}</Text>
          <Text style={{ color: C.ink, fontFamily: mono, fontSize: 12, lineHeight: 19, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{money(item.price * item.quantity)}</Text>
        </View>)}
      </View>
      <View style={{ borderTopWidth: 1, borderColor: C.line, borderStyle: 'dashed' }} />
      <View style={[S.wrap, { justifyContent: 'space-between', alignItems: 'center', gap: 6 }]}>
        <Text style={{ color: C.muted, fontFamily: mono, fontSize: 12 }}>{units} {units === 1 ? 'unit' : 'units'}</Text>
        <Text style={{ color: C.ink, fontFamily: mono, fontSize: totalFontSize, lineHeight: 33, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{total}</Text>
      </View>
      <View style={S.line} />
      <View style={[S.wrap, { alignItems: 'center', justifyContent: 'space-between', gap: 10 }]}>
        <View style={{ gap: 4, flexShrink: 1 }}>
          <Text style={{ color: C.muted, fontFamily: mono, fontSize: 11, lineHeight: 16 }}>Staff: {order.staff}</Text>
          <Text style={{ color: C.muted, fontFamily: mono, fontSize: 11, lineHeight: 16 }}>{dateTime(order.createdAt)}</Text>
        </View>
        <View style={{ marginLeft: 'auto', backgroundColor: color.bg, borderColor: color.ink, borderWidth: 1, borderRadius: 5, paddingHorizontal: 8, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          {order.status === 'Done' && <Check size={13} color={color.ink} />}
          <Text style={{ color: color.ink, fontSize: 12, fontWeight: '600' }}>{order.status}</Text>
        </View>
      </View>
      <View style={S.line} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {order.status === 'Done' ? <View accessible accessibilityLabel="Finalized receipt" style={{ flex: 1, minWidth: 0, minHeight: 46, paddingHorizontal: 4, borderRadius: 10, backgroundColor: C.pale, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <LockKeyhole size={12} color={C.muted} /><Text style={{ color: C.muted, fontSize: 12, fontWeight: '600' }}>Finalized</Text>
        </View> : <Button label="Move" icon={MoveRight} onPress={onMove} style={{ flex: 1, minWidth: 0, paddingHorizontal: 4, gap: 4 }} />}
        <Button label="Details" icon={Info} tone="ghost" onPress={onDetails} style={{ flex: 1, minWidth: 0, paddingHorizontal: 4, gap: 4, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: C.line }} />
      </View>
    </View>
    <PaperEdge bottom />
  </View>;
}
