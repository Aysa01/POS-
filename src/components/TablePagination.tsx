import React, { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react-native";
import { Button, C, Sheet } from "./ui";

type Props = { page: number; pageCount: number; pageSize: number; onPage: (page: number) => void; onPageSize: (size: number) => void };
const sizes = [10, 20, 50, 100];

export function TablePagination({ page, pageCount, pageSize, onPage, onPageSize }: Props) {
  const [draft, setDraft] = useState(String(page));
  const [chooseSize, setChooseSize] = useState(false);
  useEffect(() => setDraft(String(page)), [page]);
  const commit = () => {
    const parsed = Number(draft);
    const next = Number.isInteger(parsed) && draft.trim() ? Math.max(1, Math.min(pageCount, parsed)) : page;
    setDraft(String(next));
    onPage(next);
  };
  const pages = [...new Set([1, 2, 3, page - 1, page, page + 1, pageCount - 2, pageCount - 1, pageCount])].filter(n => n >= 1 && n <= pageCount).sort((a, b) => a - b);
  const nav = (label: string, target: number, Icon: typeof ChevronLeft, disabled: boolean) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={() => onPage(target)} style={[s.control, s.outlined, disabled && { opacity: 0.4 }]}>
      <Icon size={17} color={C.muted} />
    </Pressable>
  );
  return <View style={s.footer}>
    <View style={s.group}>
      <Text style={s.text}>Showing page</Text>
      <TextInput accessibilityLabel="Page number" value={draft} onChangeText={setDraft} onBlur={commit} onSubmitEditing={commit} keyboardType="number-pad" selectTextOnFocus style={[s.control, s.outlined, s.input]} />
      <Text style={s.text}>of {pageCount}</Text>
    </View>
    <View style={[s.group, { flexWrap: "wrap", justifyContent: "center" }]}>
      {nav("First page", 1, ChevronsLeft, page === 1)}
      {nav("Previous page", page - 1, ChevronLeft, page === 1)}
      {pages.map((number, i) => <React.Fragment key={number}>
        {i > 0 && number - pages[i - 1] > 1 && <Text style={[s.text, { paddingHorizontal: 5 }]}>…</Text>}
        <Pressable accessibilityRole="button" accessibilityLabel={`Page ${number}`} accessibilityState={{ selected: number === page }} onPress={() => onPage(number)} style={[s.control, number === page && { backgroundColor: C.pale }]}>
          <Text style={[s.text, number === page && { fontWeight: "700", color: C.ink }]}>{number}</Text>
        </Pressable>
      </React.Fragment>)}
      {nav("Next page", page + 1, ChevronRight, page === pageCount)}
      {nav("Last page", pageCount, ChevronsRight, page === pageCount)}
    </View>
    <View style={s.group}>
      <Text style={s.text}>Rows per page</Text>
      {Platform.OS === "web" ? React.createElement("select", {
        "aria-label": "Rows per page", value: pageSize,
        onChange: (event: React.ChangeEvent<HTMLSelectElement>) => onPageSize(Number(event.target.value)),
        style: { height: 36, border: `1px solid ${C.line}`, borderRadius: 7, backgroundColor: C.surface, color: C.ink, padding: "0 10px", font: "inherit", fontSize: 13, cursor: "pointer" },
      }, sizes.map(size => React.createElement("option", { key: size, value: size }, String(size)))) :
        <Pressable accessibilityRole="button" accessibilityLabel="Rows per page" onPress={() => setChooseSize(true)} style={[s.control, s.outlined, { flexDirection: "row", paddingHorizontal: 10, gap: 8 }]}><Text style={s.text}>{pageSize}</Text><ChevronDown size={15} color={C.muted} /></Pressable>}
    </View>
    <Sheet title="Rows per page" visible={chooseSize} onClose={() => setChooseSize(false)}>
      {sizes.map(size => <Button key={size} label={String(size)} tone={size === pageSize ? "primary" : "secondary"} onPress={() => { onPageSize(size); setChooseSize(false); }} />)}
    </Sheet>
  </View>;
}

const s = StyleSheet.create({
  footer: { borderTopWidth: 1, borderTopColor: C.line, paddingHorizontal: 18, paddingVertical: 14, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16, backgroundColor: C.surface },
  group: { flexDirection: "row", alignItems: "center", gap: 8 },
  text: { color: C.muted, fontSize: 13 },
  control: { minWidth: 34, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 7 },
  outlined: { borderWidth: 1, borderColor: C.line, backgroundColor: C.surface },
  input: { width: 42, textAlign: "center", color: C.ink, fontSize: 13, paddingHorizontal: 5, paddingVertical: 0 },
});