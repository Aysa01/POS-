import { StyleSheet } from "react-native";
import { C } from "./ui";

export const tableStyles = StyleSheet.create({
  page: { padding: 30, gap: 24, paddingBottom: 40, backgroundColor: "#F6F7F9", flexGrow: 1 },
  title: { color: "#234C43", fontSize: 28, fontWeight: "800", letterSpacing: -0.8 },
  muted: { color: "#7183A0", fontSize: 12, lineHeight: 18 },
  small: { color: "#234C43", fontSize: 12 },
  toolbar: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10, padding: 14, borderWidth: 1, borderColor: "#E7EBF0", borderRadius: 12, backgroundColor: "#FFFFFF" },
  search: { flex: 1, minWidth: 230, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 12, minHeight: 40, borderWidth: 1, borderColor: "#E7EBF0", borderRadius: 7, backgroundColor: "#F8FAFC" },
  toolbarButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 40, paddingHorizontal: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.pale, borderRadius: 7 },
  filterBadge: { color: C.ink, backgroundColor: C.pale, fontSize: 11, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  exportButton: { backgroundColor: C.brand, borderColor: C.brand },
  table: { backgroundColor: C.surface, borderRadius: 11, overflow: "hidden", borderWidth: 1, borderColor: "#E7EBF0" },
  row: { flexDirection: "row", alignItems: "center", minHeight: 66, borderBottomWidth: 1, borderBottomColor: "#F0F3F7" },
  header: { backgroundColor: "#F8F9FB", minHeight: 42 },
  cell: { paddingHorizontal: 22, paddingVertical: 12, color: "#4D5E79", fontSize: 12, lineHeight: 19 },
  headerText: { color: "#7183A0", fontSize: 11, fontWeight: "700" },
  green: { color: "#8E3448", fontSize: 12, fontWeight: "600", fontVariant: ["tabular-nums"] },
  pageButton: { minWidth: 32, minHeight: 32, borderRadius: 5, alignItems: "center", justifyContent: "center" },
});
