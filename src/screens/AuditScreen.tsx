import React, { useState } from "react";
import { FlatList, Text, View } from "react-native";
import { ShieldCheck } from "lucide-react-native";
import { Button, Empty, Field, Heading, S, Sheet } from "../components/ui";
import { DateFilter } from "../components/DateFilter";
import { usePOS } from "../store/usePOS";
import { dateTime, inRange } from "../utils/domain";
import type { Audit, DateRange } from "../types";
export function AuditScreen() {
  const { audits } = usePOS();
  const [query, setQuery] = useState(""),
    [action, setAction] = useState("All actions"),
    [range, setRange] = useState<DateRange | null>(null),
    [selected, setSelected] = useState<Audit | null>(null),
    [chooseAction, setChooseAction] = useState(false);
  const actions = ["All actions", ...new Set(audits.map((a) => a.action))];
  const filtered = audits.filter(
    (a) =>
      `${a.related} ${a.description} ${a.account} ${a.staff} ${a.action}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()) &&
      (action === "All actions" || a.action === action) &&
      (!range || inRange(a.at, range)),
  );
  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={filtered}
        keyExtractor={(a) => String(a.id)}
        contentContainerStyle={S.page}
        ListHeaderComponent={
          <View style={{ gap: 24, paddingBottom: 16 }}>
            <Heading
              title="A clear trail"
              subtitle="Append-only records of counter, menu, payment, and order activity."
            />
            <View style={S.panel}>
              <Field
                label="Search invoice, drink, counter or staff"
                value={query}
                onChangeText={setQuery}
                placeholder="Find an event…"
              />
              <Button
                label={`Action: ${action}`}
                tone="secondary"
                onPress={() => setChooseAction(true)}
              />
              <DateFilter value={range} onChange={setRange} allTime />
              <Text style={S.muted}>
                {filtered.length} records · most recently recorded first
              </Text>
            </View>
          </View>
        }
        renderItem={({ item: a }) => (
          <View style={[S.panel, { marginBottom: 12 }]}>
            <View style={[S.wrap, { justifyContent: "space-between" }]}>
              <Text style={S.h2}>{a.action}</Text>
              <Text style={S.muted}>Log #{a.id}</Text>
            </View>
            <Text style={S.muted}>
              {dateTime(a.at)}
              {"\n"}Counter: {a.account}
              {a.staff ? ` · Staff: ${a.staff}` : ""}
            </Text>
            {!!a.related && <Text style={S.text}>{a.related}</Text>}
            {a.action === "Status changed" && (
              <Text style={S.text}>
                {a.previous} → {a.next}
              </Text>
            )}
            <Button
              label="View event details"
              tone="ghost"
              onPress={() => setSelected(a)}
            />
          </View>
        )}
        ListEmptyComponent={
          <View style={S.panel}>
            <Empty
              icon={ShieldCheck}
              title="No matching events"
              detail="Adjust the search, action, or date range to find a record."
            />
          </View>
        }
      />
      <Sheet
        title="Filter by action"
        visible={chooseAction}
        onClose={() => setChooseAction(false)}
      >
        {actions.map((a) => (
          <Button
            key={a}
            label={a}
            tone={action === a ? "primary" : "secondary"}
            onPress={() => {
              setAction(a);
              setChooseAction(false);
            }}
          />
        ))}
      </Sheet>
      <Sheet
        title={`Audit record #${selected?.id ?? ""}`}
        visible={!!selected}
        onClose={() => setSelected(null)}
      >
        {selected && (
          <>
            <Text style={S.h2}>{selected.action}</Text>
            <Text style={S.muted}>
              {dateTime(selected.at)}
              {"\n"}Counter: {selected.account}
              {"\n"}Order staff field: {selected.staff || "Not applicable"}
            </Text>
            <Text selectable style={S.text}>
              Related: {selected.related || "—"}
              {"\n\n"}Previous: {selected.previous || "—"}
              {"\n\n"}New: {selected.next || "—"}
              {"\n\n"}Description: {selected.description || "—"}
            </Text>
          </>
        )}
      </Sheet>
    </View>
  );
}
