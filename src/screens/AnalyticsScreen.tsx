import React, { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { BarChart3 } from "lucide-react-native";
import { C, Empty, Heading, S } from "../components/ui";
import { DateFilter } from "../components/DateFilter";
import { usePOS } from "../store/usePOS";
import { analytics, money, presetRange } from "../utils/domain";
import type { DateRange } from "../types";
export function AnalyticsScreen() {
  const { orders } = usePOS();
  const [range, setRange] = useState<DateRange>(presetRange("Last 7 days"));
  const stats = analytics(orders, range),
    max = Math.max(1, ...stats.dates.map((d) => d.sales));
  return (
    <ScrollView contentContainerStyle={S.page}>
      <Heading
        title="See what’s working"
        subtitle="Completed, paid sales. All charts use the same completion-date range."
      />
      <View style={S.panel}>
        <DateFilter
          value={range}
          onChange={(r) => {
            if (r) setRange(r);
          }}
        />
      </View>
      <View style={S.wrap}>
        {[
          ["Total sales", money(stats.sales)],
          ["Completed orders", stats.count],
          ["Average order", money(stats.average)],
          ["Units sold", stats.units],
        ].map(([label, value]) => (
          <View key={label} style={[S.panel, { flexGrow: 1, minWidth: 160 }]}>
            <Text style={S.muted}>{label}</Text>
            <Text style={S.amount}>{value}</Text>
          </View>
        ))}
      </View>
      {!stats.count ? (
        <View style={S.panel}>
          <Empty
            icon={BarChart3}
            title="Room for your first sale"
            detail="Complete an order, or choose another period. Only paid orders marked Done appear in sales analytics."
          />
        </View>
      ) : (
        <>
          <View style={S.panel}>
            <Text style={S.h2}>Sales over time</Text>
            <Text style={S.muted}>
              Daily completed revenue (PHP). Scroll to compare all selling
              dates.
            </Text>
            <ScrollView
              horizontal
              contentContainerStyle={{
                gap: 12,
                paddingVertical: 16,
                alignItems: "flex-end",
              }}
            >
              {stats.dates.map((d) => (
                <View
                  key={d.day}
                  style={{ width: 112, alignItems: "center", gap: 8 }}
                >
                  <Text
                    style={{ color: C.ink, fontWeight: "600", fontSize: 12 }}
                  >
                    {money(d.sales)}
                  </Text>
                  <View
                    style={{
                      height: 150,
                      width: 44,
                      justifyContent: "flex-end",
                      backgroundColor: C.pale,
                      borderRadius: 6,
                    }}
                  >
                    <View
                      accessibilityLabel={`${d.day}, ${money(d.sales)}`}
                      style={{
                        backgroundColor: C.accent,
                        height: `${(d.sales / max) * 100}%`,
                        borderRadius: 6,
                      }}
                    />
                  </View>
                  <Text style={S.muted}>{d.day.slice(5)}</Text>
                  <Text style={[S.muted, { fontSize: 12 }]}>
                    {d.count} orders
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
          <View style={S.panel}>
            <Text style={S.h2}>Most ordered drinks</Text>
            <Text style={S.muted}>
              Ranked by units sold. Names reflect the recorded item details.
            </Text>
            {stats.drinks.map((d, i) => (
              <View key={d.id} style={{ gap: 8 }}>
                <View style={[S.wrap, { justifyContent: "space-between" }]}>
                  <Text style={[S.text, { fontWeight: "600", flexShrink: 1 }]}>
                    {i + 1}. {d.name}
                  </Text>
                  <Text style={S.text}>
                    {d.units} units ·{" "}
                    {((d.units / stats.units) * 100).toFixed(1)}%
                  </Text>
                </View>
                <View
                  style={{
                    height: 9,
                    backgroundColor: C.pale,
                    borderRadius: 6,
                  }}
                >
                  <View
                    style={{
                      width: `${(d.units / stats.units) * 100}%`,
                      height: 9,
                      backgroundColor: C.accent,
                      borderRadius: 6,
                    }}
                  />
                </View>
                <Text style={S.muted}>{money(d.revenue)} revenue</Text>
              </View>
            ))}
          </View>
          <View style={S.panel}>
            <Text style={S.h2}>Best-selling dates</Text>
            {stats.best && (
              <View
                style={{
                  backgroundColor: C.pale,
                  padding: 16,
                  borderRadius: 10,
                  gap: 6,
                }}
              >
                <Text style={[S.text, { fontWeight: "700" }]}>
                  Highest sales · {stats.best.day}
                </Text>
                <Text style={S.amount}>{money(stats.best.sales)}</Text>
              </View>
            )}
            {[...stats.dates]
              .sort((a, b) => b.sales - a.sales)
              .map((d) => (
                <View key={d.day} style={{ gap: 6 }}>
                  <View style={[S.wrap, { justifyContent: "space-between" }]}>
                    <Text style={S.text}>{d.day}</Text>
                    <Text style={[S.text, { fontWeight: "600" }]}>
                      {money(d.sales)}
                    </Text>
                  </View>
                  <Text style={S.muted}>
                    {d.count} completed orders · {d.units} units
                  </Text>
                  <View style={S.line} />
                </View>
              ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}
