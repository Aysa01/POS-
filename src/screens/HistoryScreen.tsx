import React, { useState } from "react";
import { FlatList, Text, View } from "react-native";
import { ArrowDownUp, ReceiptText } from "lucide-react-native";
import { Button, Empty, Field, Heading, S } from "../components/ui";
import { DateFilter } from "../components/DateFilter";
import { OrderDetails } from "../components/OrderDetails";
import { usePOS } from "../store/usePOS";
import { dateTime, inRange, money } from "../utils/domain";
import { payments, type DateRange } from "../types";
export function HistoryScreen() {
  const { orders } = usePOS();
  const [query, setQuery] = useState(""),
    [payment, setPayment] = useState("All payments"),
    [range, setRange] = useState<DateRange | null>(null),
    [oldest, setOldest] = useState(false),
    [details, setDetails] = useState<number | null>(null);
  const completed = orders.filter((o) => o.status === "Done");
  const filtered = completed
    .filter(
      (o) =>
        `${o.invoice} ${o.customer}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()) &&
        (payment === "All payments" || o.payment === payment) &&
        (!range || inRange(o.completedAt!, range)),
    )
    .sort(
      (a, b) =>
        (oldest ? 1 : -1) * a.completedAt!.localeCompare(b.completedAt!),
    );
  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={filtered}
        keyExtractor={(o) => String(o.id)}
        contentContainerStyle={S.page}
        ListHeaderComponent={
          <View style={{ gap: 24, paddingBottom: 16 }}>
            <Heading
              title="Every finished order"
              subtitle="Completed orders, original prices, and receipts. Date filters use completion date."
            />
            <View style={S.panel}>
              <Field
                label="Search invoice or customer"
                value={query}
                onChangeText={setQuery}
                placeholder="Find a completed order…"
              />
              <View style={S.wrap}>
                {["All payments", ...payments].map((p) => (
                  <Button
                    key={p}
                    label={p}
                    tone={payment === p ? "primary" : "secondary"}
                    onPress={() => setPayment(p)}
                  />
                ))}
              </View>
              <DateFilter value={range} onChange={setRange} allTime />
              <View
                style={[
                  S.wrap,
                  { justifyContent: "space-between", alignItems: "center" },
                ]}
              >
                <Text style={S.muted}>{filtered.length} completed orders</Text>
                <Button
                  label={oldest ? "Oldest first" : "Newest first"}
                  icon={ArrowDownUp}
                  tone="ghost"
                  onPress={() => setOldest(!oldest)}
                />
              </View>
            </View>
          </View>
        }
        renderItem={({ item: o }) => (
          <View style={[S.panel, { marginBottom: 12 }]}>
            <View style={[S.wrap, { justifyContent: "space-between" }]}>
              <View style={{ flex: 1, minWidth: 160, gap: 6 }}>
                <Text style={S.h2}>{o.customer}</Text>
                <Text style={S.muted}>{o.invoice}</Text>
              </View>
              <Text style={[S.amount, { fontSize: 24 }]}>{money(o.total)}</Text>
            </View>
            <Text style={S.text}>
              {o.items.map((i) => `${i.quantity} × ${i.name}`).join(", ")}
            </Text>
            <Text style={S.muted}>
              {o.items.reduce((n, i) => n + i.quantity, 0)} units · {o.payment}{" "}
              · Staff: {o.staff}
              {"\n"}Ordered {dateTime(o.createdAt)}
              {"\n"}Completed {dateTime(o.completedAt!)}
            </Text>
            <Button
              label="View receipt & details"
              icon={ReceiptText}
              tone="secondary"
              onPress={() => setDetails(o.id)}
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={S.panel}>
            <Empty
              icon={ReceiptText}
              title={
                completed.length
                  ? "No matching orders"
                  : "History starts at Done"
              }
              detail={
                completed.length
                  ? "Try another customer, invoice, payment method, or date range."
                  : "Finish an order in the pipeline to see its receipt and original prices here."
              }
            />
          </View>
        }
      />
      <OrderDetails
        order={orders.find((o) => o.id === details) ?? null}
        onClose={() => setDetails(null)}
      />
    </View>
  );
}
