import React, { useState } from "react";
import { Text, View } from "react-native";
import { CalendarDays } from "lucide-react-native";
import { Button, C, Field, S, errorText } from "./ui";
import { presetRange, validateRange } from "../utils/domain";
import type { DateRange } from "../types";
export function DateFilter({
  value,
  onChange,
  allTime = false,
}: {
  value: DateRange | null;
  onChange: (range: DateRange | null) => void;
  allTime?: boolean;
}) {
  const [custom, setCustom] = useState(false),
    [from, setFrom] = useState(value?.from ?? presetRange("Today").from),
    [to, setTo] = useState(value?.to ?? presetRange("Today").to),
    [error, setError] = useState("");
  return (
    <View style={{ gap: 12 }}>
      <View style={S.wrap}>
        {(allTime
          ? ["All dates", "Today", "Last 7 days", "Last 30 days", "This month"]
          : ["Today", "Last 7 days", "Last 30 days", "This month"]
        ).map((p) => (
          <Button
            key={p}
            tone="secondary"
            label={p}
            onPress={() => {
              const r = p === "All dates" ? null : presetRange(p);
              onChange(r);
              if (r) {
                setFrom(r.from);
                setTo(r.to);
              }
              setCustom(false);
              setError("");
            }}
          />
        ))}
        <Button
          icon={CalendarDays}
          label="Custom dates"
          tone="ghost"
          onPress={() => setCustom(!custom)}
        />
      </View>
      {custom && (
        <View style={{ gap: 12 }}>
          <View style={S.wrap}>
            <View style={{ flexGrow: 1, minWidth: 140 }}>
              <Field
                label="From (YYYY-MM-DD)"
                value={from}
                onChangeText={setFrom}
                maxLength={10}
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <View style={{ flexGrow: 1, minWidth: 140 }}>
              <Field
                label="To (YYYY-MM-DD)"
                value={to}
                onChangeText={setTo}
                maxLength={10}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>
          {!!error && <Text style={{ color: C.danger }}>{error}</Text>}
          <Button
            label="Apply date range"
            onPress={() => {
              try {
                const r = { from, to };
                validateRange(r);
                onChange(r);
                setError("");
              } catch (e) {
                setError(errorText(e));
              }
            }}
          />
        </View>
      )}
      <Text style={S.muted}>
        {value
          ? `${value.from} → ${value.to} · device local time`
          : "All dates · device local time"}
      </Text>
    </View>
  );
}
