import React from "react";
import { Platform, Text, View } from "react-native";
import { Printer, Share2 } from "lucide-react-native";
import { Button, S, Sheet, showError } from "./ui";
import { StatusBadge } from "./StatusBadge";
import { dateTime, money } from "../utils/domain";
import { printReceipt, shareReceipt } from "../services/receipt";
import type { Order } from "../types";
export function OrderDetails({
  order,
  onClose,
}: {
  order: Order | null;
  onClose: () => void;
}) {
  return (
    <Sheet
      title={order?.invoice ?? "Receipt"}
      visible={!!order}
      onClose={onClose}
    >
      {order && (
        <>
          <StatusBadge status={order.status} />
          <Text style={S.h2}>{order.customer}</Text>
          <Text style={S.muted}>
            Handled by {order.staff} · Counter: {order.account}
            {"\n"}Created {dateTime(order.createdAt)}
            {order.completedAt
              ? `\nCompleted ${dateTime(order.completedAt)}`
              : ""}
          </Text>
          <View style={S.line} />
          {order.items.map((i) => (
            <View
              key={i.productId}
              style={[S.row, { justifyContent: "space-between" }]}
            >
              <View style={S.flex}>
                <Text style={S.text}>{i.name}</Text>
                <Text style={S.muted}>
                  {i.quantity} × {money(i.price)}
                </Text>
              </View>
              <Text style={S.text}>{money(i.quantity * i.price)}</Text>
            </View>
          ))}
          <View style={S.line} />
          <Text style={S.muted}>
            Discount {money(0)} · {order.payment} · Payment recorded
          </Text>
          <Text style={S.amount}>{money(order.total)}</Text>
          <View style={S.wrap}>
            <Button
              label="Print receipt"
              icon={Printer}
              onPress={() => void printReceipt(order).catch(showError)}
            />
            <Button
                label={Platform.OS === 'web' ? 'Download receipt' : 'Share PDF'}
              icon={Share2}
              tone="secondary"
              onPress={() => void shareReceipt(order).catch(showError)}
            />
          </View>
          <Text style={S.muted}>
            Payment confirmed by the operator. This is an order receipt, not a
            BIR-registered tax invoice.
          </Text>
        </>
      )}
    </Sheet>
  );
}
