import React, { useState } from "react";
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { CalendarDays, Clock3, RotateCcw, X } from "lucide-react-native";
import { C, errorText } from "./ui";
import { localDay, presetRange, validateRange } from "../utils/domain";
import type { DateRange } from "../types";

const presets = ["All Time", "Today", "7 Days", "30 Days", "Month"];
const paymentOptions = ["All payments", "Cash", "Debit/Credit Card", "QR Payment"];
const paymentLabels = ["All Payments", "Cash", "Card", "QR Code"];

export function HistoryFilters({ payment, range, onClose, onApply }: {
  payment: string; range: DateRange | null; onClose: () => void;
  onApply: (payment: string, range: DateRange | null) => void;
}) {
  const [draftPayment, setDraftPayment] = useState(payment);
  const [draftRange, setDraftRange] = useState(range);
  const [preset, setPreset] = useState(() => !range ? "All Time" : presets.slice(1).find((p) => {
    const r = presetRange(p === "7 Days" ? "Last 7 days" : p === "30 Days" ? "Last 30 days" : p === "Month" ? "This month" : p);
    return r.from === range.from && r.to === range.to;
  }) ?? "Custom");
  const [from, setFrom] = useState(range?.from ?? localDay());
  const [to, setTo] = useState(range?.to ?? localDay());
  const [error, setError] = useState("");
  const count = Number(draftPayment !== "All payments") + Number(!!draftRange);
  const dateField = (label: string, value: string, change: (value: string) => void) => (
    <View style={{ flex: 1, minWidth: 130, gap: 6 }}>
      <Text style={s.dateLabel}>{label}</Text>
      <View style={s.dateField}>
        <CalendarDays size={13} color="#76968B" />
        {Platform.OS === "web" ? React.createElement("input", {
          type: "date", value, "aria-label": label,
          onChange: (event: React.ChangeEvent<HTMLInputElement>) => change(event.target.value),
          style: { width: "100%", minWidth: 0, border: 0, outline: "none", background: "transparent", color: "#234C43", font: "inherit", fontSize: 12 },
        }) : <TextInput accessibilityLabel={label} value={value} onChangeText={change} placeholder="YYYY-MM-DD" style={{ flex: 1, fontSize: 12, color: C.ink }} />}
      </View>
    </View>
  );
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View accessibilityViewIsModal style={s.dialog}>
          <View style={s.header}>
            <View style={{ flex: 1, gap: 5 }}>
              <Text accessibilityRole="header" style={s.title}>Filter Orders History</Text>
              <Text style={s.subtitle}>Refine transactions by payment method and timeline presets</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close filters" onPress={onClose} style={s.close}><X size={17} color={C.ink} /></Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.body}>
            <View style={{ gap: 12 }}>
              <View style={s.between}><Text style={s.label}>PAYMENT METHOD</Text><Text style={s.hint}>Single selection</Text></View>
              <View style={s.options}>
                {paymentOptions.map((p, i) => <Pressable key={p} accessibilityRole="button" accessibilityState={{ selected: draftPayment === p }} onPress={() => setDraftPayment(p)} style={[s.option, draftPayment === p && s.selected]}><Text style={[s.optionText, draftPayment === p && s.selectedText]}>{paymentLabels[i]}</Text></Pressable>)}
              </View>
            </View>
            <View style={{ gap: 12 }}>
              <Text style={s.label}>QUICK DATE RANGE</Text>
              <View style={s.segments}>
                {presets.map((p) => <Pressable key={p} accessibilityRole="button" accessibilityState={{ selected: preset === p }} onPress={() => {
                  const r = p === "All Time" ? null : presetRange(p === "7 Days" ? "Last 7 days" : p === "30 Days" ? "Last 30 days" : p === "Month" ? "This month" : p);
                  setPreset(p); setDraftRange(r); setError(""); if (r) { setFrom(r.from); setTo(r.to); }
                }} style={[s.segment, preset === p && s.selected]}><Text style={[s.optionText, preset === p && s.selectedText]}>{p}</Text></Pressable>)}
              </View>
            </View>
            <View style={s.custom}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><CalendarDays size={15} color={C.ink} /><Text style={s.label}>CUSTOM DATE RANGE</Text></View>
              <View style={[s.options, { flexWrap: "wrap", gap: 12 }]}>{dateField("From Date", from, setFrom)}{dateField("To Date", to, setTo)}</View>
              <Pressable accessibilityRole="button" onPress={() => { try { const r = { from, to }; validateRange(r); setDraftRange(r); setPreset("Custom"); setError(""); } catch (e) { setError(errorText(e)); } }} style={s.apply}><Text style={s.optionText}>Apply specific range</Text></Pressable>
              {!!error && <Text accessibilityRole="alert" style={{ color: C.danger, fontSize: 12 }}>{error}</Text>}
              {preset === "Custom" && <Text style={s.hint}>Selected: {draftRange?.from} – {draftRange?.to}</Text>}
              <View style={{ flexDirection: "row", gap: 5, alignItems: "center", justifyContent: "center", paddingTop: 4 }}><Clock3 size={11} color="#76968B" /><Text style={s.hint}>All dates aligned with device local time ({Intl.DateTimeFormat().resolvedOptions().timeZone})</Text></View>
            </View>
          </ScrollView>
          <View style={s.footer}>
            <Pressable accessibilityRole="button" onPress={() => { setDraftPayment("All payments"); setDraftRange(null); setPreset("All Time"); setFrom(localDay()); setTo(localDay()); setError(""); }} style={[s.footerButton, { marginRight: "auto" }]}><RotateCcw size={13} color={C.ink} /><Text style={s.optionText}>Reset Filters</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={onClose} style={s.footerButton}><Text style={s.optionText}>Cancel</Text></Pressable>
            <Pressable accessibilityRole="button" onPress={() => onApply(draftPayment, draftRange)} style={[s.footerButton, s.selected]}><Text style={s.selectedText}>Show Orders</Text><Text style={s.badge}>{count}</Text></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#234C4366", alignItems: "center", justifyContent: "center", padding: 20 },
  dialog: { width: "100%", maxWidth: 480, maxHeight: "94%", backgroundColor: "white", borderRadius: 22, overflow: "hidden", borderWidth: 1, borderColor: "#E7EBF0" },
  header: { padding: 22, flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderColor: "#F0F3F7" },
  title: { color: "#234C43", fontSize: 17, fontWeight: "700", letterSpacing: -0.5 },
  subtitle: { color: "#7183A0", fontSize: 11, lineHeight: 16 },
  close: { padding: 8, borderRadius: 8, backgroundColor: C.pale },
  body: { padding: 22, gap: 24 },
  between: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  label: { fontSize: 11, fontWeight: "700", color: "#234C43", letterSpacing: 0.4 },
  hint: { fontSize: 10, color: "#76968B", flexShrink: 1 },
  options: { flexDirection: "row", gap: 6 },
  option: { flex: 1, paddingVertical: 10, alignItems: "center", justifyContent: "center", borderRadius: 11, backgroundColor: C.pale, borderWidth: 1, borderColor: C.line },
  optionText: { fontSize: 11, color: C.ink },
  selected: { backgroundColor: C.brand, borderColor: C.brand },
  selectedText: { fontSize: 11, fontWeight: "700", color: "#FFFFFF" },
  segments: { flexDirection: "row", backgroundColor: C.pale, borderRadius: 15, padding: 5, gap: 3 },
  segment: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 9, borderRadius: 11 },
  custom: { borderTopWidth: 1, borderColor: "#F0F3F7", paddingTop: 16, gap: 12 },
  dateLabel: { fontSize: 10, color: "#4D5E79" },
  dateField: { flexDirection: "row", alignItems: "center", gap: 8, padding: 10, borderRadius: 11, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E7EBF0" },
  apply: { backgroundColor: C.pale, alignItems: "center", padding: 10, borderRadius: 11, borderWidth: 1, borderColor: C.line },
  footer: { padding: 16, backgroundColor: "#F8FAFC", flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center", borderTopWidth: 1, borderColor: "#F0F3F7" },
  footerButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 12, minHeight: 38, borderRadius: 12, backgroundColor: C.pale },
  badge: { color: "#FFFFFF", fontSize: 10, backgroundColor: "#54232E33", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 },
});
