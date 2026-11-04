import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated as NativeAnimated, Easing, FlatList, Platform, ScrollView, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { ReceiptText } from "lucide-react-native";
import {
  Button,
  C,
  Empty,
  Heading,
  S,
  Sheet,
  showError,
} from "../components/ui";
import { statusColors } from "../components/StatusBadge";
import { OrderTicket } from "../components/OrderTicket";
import { OrderDetails } from "../components/OrderDetails";
import { usePOS } from "../store/usePOS";
import { changeStatus } from "../database/db";
import { canMove, money } from "../utils/domain";
import { statuses, type Order, type Status } from "../types";
import { useReducedMotion } from '../utils/useReducedMotion';

function PipelineColumn({ status, width, invalid, register, children }: { status: Status; width: number; invalid: number; register: (view: View | null) => void; children: React.ReactNode }) {
  const reduced = useReducedMotion();
  const offset = useRef(new NativeAnimated.Value(0)).current;
  const [highlight, setHighlight] = useState(false);
  useEffect(() => {
    if (!invalid) return;
    setHighlight(true);
    const animation = NativeAnimated.sequence((reduced ? [0] : [-6, 6, -4, 4, 0]).map(toValue => NativeAnimated.timing(offset, { toValue, duration: reduced ? 0 : 70, useNativeDriver: true })));
    animation.start(({ finished }) => { if (finished) setHighlight(false); });
    return () => { animation.stop(); offset.setValue(0); };
  }, [invalid, reduced, offset]);
  return <NativeAnimated.View ref={register} testID={'column-' + status} style={{ width, backgroundColor: highlight ? '#FCECEE' : '#E7EDF4', borderWidth: 1, borderColor: highlight ? C.danger : 'transparent', borderRadius: 16, padding: 12, transform: [{ translateX: offset }] }}>{children}</NativeAnimated.View>;
}

function InsertionSlot({ status, height, consumed }: { status: Status; height: number; consumed: boolean }) {
  const reduced = useReducedMotion();
  const size = useRef(new NativeAnimated.Value(0)).current;
  useEffect(() => {
    if (consumed) { size.stopAnimation(); size.setValue(0); return; }
    const animation = NativeAnimated.timing(size, { toValue: height, duration: reduced ? 0 : 190, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    animation.start();
    return () => animation.stop();
  }, [height, consumed, reduced, size]);
  return <NativeAnimated.View pointerEvents="none" testID={'drop-slot-' + status} style={{ height: consumed ? 0 : size, overflow: 'hidden' }}>
    {height > 0 && !consumed && <View style={{ flex: 1, marginBottom: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: C.accent, borderRadius: 8, backgroundColor: '#FFFFFF66', alignItems: 'center', paddingTop: 18 }}>
      <Text style={{ color: C.brandInk, fontSize: 12, fontWeight: '600' }}>Drop receipt here</Text>
    </View>}
  </NativeAnimated.View>;
}

function DraggableCard({
  order,
  begin,
  drop,
  hover,
  finish,
  x,
  y,
  onDetails,
  onStatus,
  hidden,
  canDrag,
}: {
  order: Order;
  begin: (o: Order, left: number, top: number, height: number) => void;
  drop: (o: Order, x: number, y: number) => void;
  hover: (o: Order, x: number, y: number) => void;
  finish: () => void;
  x: ReturnType<typeof useSharedValue<number>>;
  y: ReturnType<typeof useSharedValue<number>>;
  onDetails: () => void;
  onStatus: () => void;
  hidden: boolean;
  canDrag: boolean;
}) {
  const card = useRef<View>(null);
  const gestureActive = useRef(false);
  const hoverTick = useSharedValue(0);
  const start = () => {
    if (order.status === 'Done') return;
    gestureActive.current = true;
    card.current?.measureInWindow((left, top, _width, height) => {
      if (gestureActive.current) begin(order, left, top, height);
    });
  };
  const finalize = (success: boolean) => {
    gestureActive.current = false;
    if (!success) finish();
  };
  const pan = Gesture.Pan()
    .enabled(order.status !== 'Done' && canDrag)
    .activateAfterLongPress(Platform.OS === 'web' ? 0 : 350)
    .onStart((e) => {
      x.value = e.absoluteX;
      y.value = e.absoluteY;
      runOnJS(start)();
    })
    .onUpdate((e) => {
      x.value = e.absoluteX;
      y.value = e.absoluteY;
      const now = Date.now();
      if (now - hoverTick.value > 35) {
        hoverTick.value = now;
        runOnJS(hover)(order, e.absoluteX, e.absoluteY);
      }
    })
    .onEnd((e) => {
      runOnJS(drop)(order, e.absoluteX, e.absoluteY);
    })
    .onFinalize((_event, success) => {
      runOnJS(finalize)(success);
    });
  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        ref={card}
        testID={'order-' + order.id}
        style={{ marginBottom: 16, opacity: hidden ? 0.2 : 1 }}
      >
        <OrderTicket order={order} onMove={onStatus} onDetails={onDetails} />
      </Animated.View>
    </GestureDetector>
  );
}
export function OrdersScreen() {
  const reduced = useReducedMotion();
  const { orders, audits } = usePOS();
  // Audit IDs supply a persisted arrival sequence without editing paid receipts.
  const arrivals = useMemo(() => {
    const result = new Map<string, number>();
    for (const event of audits) if ((event.action === 'Status changed' || event.action === 'Order created') && !result.has(event.related)) result.set(event.related, event.id);
    return result;
  }, [audits]);
  const [boardWidth, setBoardWidth] = useState(0);
  const columnWidth = Math.max(boardWidth >= 1100 ? 220 : 280, (boardWidth - 48 - 16 * (statuses.length - 1)) / statuses.length);
  const previewWidth = columnWidth - 24;
  const [dragging, setDragging] = useState<Order | null>(null),
    [details, setDetails] = useState<number | null>(null),
    [moving, setMoving] = useState<number | null>(null),
    [busy, setBusy] = useState(false);
  const [invalid, setInvalid] = useState<{ status: Status; token: number } | null>(null);
  const [warning, setWarning] = useState(false);
  const [hovered, setHovered] = useState<Status | null>(null);
  const [dragHeight, setDragHeight] = useState(0);
  const hoverRef = useRef<Status | null>(null);
  const draggingRef = useRef<Order | null>(null);
  const dropping = useRef(false);
  const bounds = useRef<Partial<Record<Status, { left: number; top: number; width: number; height: number }>>>({});
  const source = useRef({ left: 0, top: 0 });
  const returnTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (returnTimer.current) clearTimeout(returnTimer.current); }, []);
  useEffect(() => {
    if (!invalid) return;
    setWarning(true);
    const timeout = setTimeout(() => setWarning(false), 3000);
    return () => clearTimeout(timeout);
  }, [invalid]);
  const columnRefs = useRef<Partial<Record<Status, View | null>>>({});
  const measureColumns = () => {
    for (const status of statuses) columnRefs.current[status]?.measureInWindow((left, top, width, height) => { bounds.current[status] = { left, top, width, height }; });
  };
  const setHover = (status: Status | null) => {
    if (hoverRef.current === status) return;
    hoverRef.current = status;
    setHovered(status);
  };
  const hover = (order: Order, pageX: number, pageY: number) => {
    if (draggingRef.current?.id !== order.id || dropping.current || order.status === 'Done') return;
    const target = statuses.find(status => {
      const box = bounds.current[status];
      return box && pageX >= box.left && pageX <= box.left + box.width && pageY >= box.top && pageY <= box.top + box.height;
    });
    setHover(target && target !== order.status && canMove(order.status, target) ? target : null);
  };
  const root = useRef<View>(null),
    rootX = useSharedValue(0),
    rootY = useSharedValue(0),
    x = useSharedValue(0),
    y = useSharedValue(0);
  const pending = useRef(false);
  const ghostStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value - rootX.value - previewWidth / 2 },
      { translateY: y.value - rootY.value - 32 },
    ],
  }));
  const move = async (order: Order, status: Status) => {
    if (pending.current || order.status === status) return;
    if (order.status === 'Done') { setMoving(null); showError(new Error('This receipt is finalized and cannot be moved.')); return false; }
    if (!canMove(order.status, status)) {
      setMoving(null);
      usePOS.getState().notify('');
      setInvalid({ status, token: Date.now() });
      return false;
    }
    pending.current = true;
    setWarning(false);
    setBusy(true);
    try {
      await changeStatus(usePOS.getState().account!, order.id, status);
      setMoving(null);
      usePOS.getState().notify({ title: status === 'Done' ? 'Order completed successfully' : 'Order updated successfully', message: order.invoice + ' moved to ' + status + '.' });
      await usePOS.getState().refresh();
      return true;
    } catch (e) {
      showError(e);
      return false;
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const land = (left = source.current.left, top = source.current.top) => {
    setHover(null);
    const duration = reduced ? 0 : 220;
    x.value = withTiming(left + previewWidth / 2, { duration });
    y.value = withTiming(top + 32, { duration });
    if (returnTimer.current) clearTimeout(returnTimer.current);
    returnTimer.current = setTimeout(() => { draggingRef.current = null; dropping.current = false; setDragging(null); }, duration);
  };
  const drop = (order: Order, pageX: number, pageY: number) => {
    if (order.status === 'Done' || draggingRef.current?.id !== order.id || dropping.current) return;
    dropping.current = true;
    void (async () => {
      for (const status of statuses) {
        const box = await new Promise<{ left: number; top: number; width: number; height: number } | null>(resolve => {
          const column = columnRefs.current[status];
          if (!column) { resolve(null); return; }
          column.measureInWindow((left, top, width, height) => resolve({ left, top, width, height }));
        });
        if (!box) continue;
        const { left, top, width, height } = box;
          if (
            pageX >= left &&
            pageX <= left + width &&
            pageY >= top &&
            pageY <= top + height
          ) {
            const saved = await move(order, status);
            if (saved) land(left + 12, top + 74);
            else land();
            return;
          }
      }
      land();
    })();
  };
  const selected = orders.find((o) => o.id === moving && o.status !== 'Done');
  return (
    <View
      ref={root}
      style={{ flex: 1 }}
      onLayout={event => {
        setBoardWidth(event.nativeEvent.layout.width);
        root.current?.measureInWindow((left, top) => {
          rootX.value = left;
          rootY.value = top;
        });
      }}
    >
      <View style={{ padding: 24, gap: 12 }}>
        <Heading
          title="A little flow for every order"
          subtitle="Long-press and drag a card, or use Move to change its status."
        />
        <Text style={S.muted}>
          In Queue → In Progress → Ready → Serving → Done. Move forward one stage at a
          time. Earlier stages allow backward moves; Done receipts are finalized.
        </Text>
      </View>
      <ScrollView
        horizontal
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 24, paddingTop: 0, gap: 16 }}
        showsHorizontalScrollIndicator
        onScroll={() => { if (draggingRef.current) measureColumns(); }}
        scrollEventThrottle={32}
      >
        <View style={{ flexDirection: "row", gap: 16 }}>
          {statuses.map((status) => {
            const rows = orders.filter((o) => o.status === status).sort((a, b) => (arrivals.get(b.invoice) ?? 0) - (arrivals.get(a.invoice) ?? 0) || b.id - a.id);
            return (
              <PipelineColumn
                key={status}
                status={status}
                width={columnWidth}
                invalid={invalid?.status === status ? invalid.token : 0}
                register={(ref) => {
                  columnRefs.current[status] = ref;
                }}
              >
                <View style={[S.row, { backgroundColor: C.surface, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, justifyContent: "space-between", gap: 8 }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: statusColors[status].bg, alignItems: "center", justifyContent: "center" }}>
                      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: { "In Queue": "#F59E0B", "In Progress": "#2563EB", Ready: "#9333EA", Serving: "#F97316", Done: "#22A06B" }[status] }} />
                    </View>
                    <Text accessibilityRole="header" style={{ color: C.ink, fontWeight: "700", fontSize: 11, letterSpacing: 0.6 }}>{status.toUpperCase()}</Text>
                  </View>
                  <View style={{ backgroundColor: C.pale, borderWidth: 1, borderColor: C.line, minWidth: 24, height: 22, paddingHorizontal: 6, borderRadius: 11, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: C.muted, fontWeight: "600", fontSize: 11 }}>{rows.length}</Text>
                  </View>
                </View>
                <FlatList
                  data={rows}
                  keyExtractor={(o) => String(o.id)}
                  showsVerticalScrollIndicator={false}
                  scrollEnabled={!dragging}
                  ListHeaderComponent={<InsertionSlot status={status} height={hovered === status ? dragHeight : 0} consumed={!!dragging && rows.some(order => order.id === dragging.id)} />}
                  renderItem={({ item: order }) => (
                    <DraggableCard
                      order={order}
                      begin={(item, left, top, height) => {
                        if (item.status === 'Done' || dropping.current || pending.current) return;
                        if (returnTimer.current) clearTimeout(returnTimer.current);
                        source.current = { left, top }; draggingRef.current = item;
                        setDragHeight(height + 16); setDragging(item); measureColumns();
                      }}
                      drop={drop}
                      hover={hover}
                      finish={() => { if (draggingRef.current && !dropping.current) land(); }}
                      hidden={dragging?.id === order.id}
                      canDrag={!busy && !dropping.current && (!dragging || dragging.id === order.id)}
                      x={x}
                      y={y}
                      onDetails={() => setDetails(order.id)}
                      onStatus={() => { if (order.status !== 'Done') setMoving(order.id); }}
                    />
                  )}
                  ListEmptyComponent={
                    <Empty
                      icon={ReceiptText}
                      title="All clear"
                      detail={{ "In Queue": "New orders will appear here.", "In Progress": "No drinks are being prepared.", "Ready": "No orders are ready for pickup.", "Serving": "No orders are being served.", "Done": "No completed orders yet." }[status]}
                    />
                  }
                />
              </PipelineColumn>
            );
          })}
        </View>
      </ScrollView>
      {warning && <View pointerEvents="none" accessibilityRole="alert" style={{ position: 'absolute', bottom: 16, right: 16, width: '90%', maxWidth: 340, backgroundColor: '#FFF6F5', borderWidth: 1, borderColor: '#D9A0A0', borderRadius: 10, padding: 14, gap: 6, zIndex: 200 }}>
        <Text style={{ color: C.danger, fontSize: 14, fontWeight: '700' }}>Invalid Order Movement</Text>
        <Text style={{ color: C.danger, fontSize: 13, lineHeight: 20 }}>Orders can only move forward one stage at a time.</Text>
      </View>}
      {dragging && (
        <Animated.View
          testID="dragged-order-preview"
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              left: 0,
              top: 0,
              width: previewWidth,
              padding: 18,
              borderRadius: 16,
              backgroundColor: "#FFFFFF",
              borderWidth: 2,
              borderColor: statusColors[dragging.status].ink,
              elevation: 10,
              gap: 10,
              zIndex: 100,
            },
            ghostStyle,
          ]}
        >
          <Text style={S.muted}>{dragging.invoice}</Text>
          <Text style={S.h2}>{dragging.customer}</Text>
          <Text style={S.text}>{money(dragging.total)}</Text>
          <Text style={S.muted}>Drop in a status column</Text>
        </Animated.View>
      )}
      <Sheet
        title={`Move ${selected?.invoice ?? "order"}`}
        visible={!!selected}
        onClose={() => {
          if (!busy) setMoving(null);
        }}
      >
        {selected && (
          <>
            <Text style={S.muted}>
              Current status: {selected.status}. Every move is recorded in the
              audit log.
            </Text>
            {statuses.map((status) => (
              <View key={status} style={{ gap: 4 }}>
                <Button
                  label={
                    status === selected.status ? `${status} · current` : status
                  }
                  tone={status === selected.status ? "primary" : "secondary"}
                  disabled={
                    busy ||
                    status === selected.status
                  }
                  onPress={() => void move(selected, status)}
                />
                {!canMove(selected.status, status) && (
                  <Text style={S.muted}>
                    Complete the preceding stage first.
                  </Text>
                )}
              </View>
            ))}
          </>
        )}
      </Sheet>
      <OrderDetails
        order={orders.find((o) => o.id === details) ?? null}
        onClose={() => setDetails(null)}
      />
    </View>
  );
}
