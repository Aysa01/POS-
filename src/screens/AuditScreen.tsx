import { TablePagination } from "../components/TablePagination";
import * as FS from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import React, { useState } from "react";
import { Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { ArrowDownUp, ChevronDown, FileDown, Filter, Search, ShieldCheck, X } from "lucide-react-native";
import { Button, C, Empty, S, Sheet, showError } from "../components/ui";
import { tableStyles as styles } from "../components/tableStyles";
import { DateFilter } from "../components/DateFilter";
import { usePOS } from "../store/usePOS";
import { dateTime, inRange } from "../utils/domain";
import type { Audit, DateRange } from "../types";


const columns = [
  { label: "Log number", flex: 0.8 },
  { label: "Action / related", flex: 1.5 },
  { label: "Recorded date", flex: 1.5 },
  { label: "Counter", flex: 1 },
  { label: "Staff", flex: 1 },
  { label: "Description", flex: 2 },
];

export function AuditScreen() {
  const { audits } = usePOS();
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("All actions");
  const [range, setRange] = useState<DateRange | null>(null);
  const [selected, setSelected] = useState<Audit | null>(null);
  const [chooseAction, setChooseAction] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [oldest, setOldest] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const actions = ["All actions", ...new Set(audits.map(a => a.action))];
  const filtered = audits.filter(a =>
    `${a.id} ${a.related} ${a.description} ${a.account} ${a.staff} ${a.action}`.toLowerCase().includes(query.trim().toLowerCase()) &&
    (action === "All actions" || a.action === action) && (!range || inRange(a.at, range))
  ).sort((a, b) => (oldest ? 1 : -1) * (a.at.localeCompare(b.at) || a.id - b.id));
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const activeFilters = Number(action !== "All actions") + Number(!!range);
  const exportAudits = async () => {
    try {
      const escape = (value: string) => value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
      const rows = [
        ["Log number", "Action", "Related", "Recorded date", "Counter", "Staff", "Description", "Previous", "New"],
        ...filtered.map(a => [a.id, a.action, a.related, dateTime(a.at), a.account, a.staff, a.description, a.previous, a.next]),
      ];
      const xml = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Audit Logs"><Table>${rows.map(row => `<Row>${row.map(value => `<Cell><Data ss:Type="${typeof value === "number" ? "Number" : "String"}">${escape(String(value ?? ""))}</Data></Cell>`).join("")}</Row>`).join("")}</Table></Worksheet></Workbook>`;
      const filename = "audit-logs.xml";
      if (Platform.OS === "web") {
        const url = URL.createObjectURL(new Blob([xml], { type: "application/vnd.ms-excel" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        const uri = `${FS.cacheDirectory}${filename}`;
        await FS.writeAsStringAsync(uri, xml);
        await Sharing.shareAsync(uri, { mimeType: "application/vnd.ms-excel", dialogTitle: "Export audit logs" });
      }
    } catch (error) { showError(error); }
  };
  return (<View style={{ flex: 1 }}>
    <ScrollView contentContainerStyle={styles.page}>
      <View style={{ gap: 6 }}>
        <Text accessibilityRole="header" style={styles.title}>Audit Logs</Text>
        <Text style={styles.muted}>Append-only records of counter, menu, payment, and order activity.</Text>
      </View>
      <View style={styles.toolbar}>
        <View style={styles.search}>
          <Search size={15} color={C.muted} />
          <TextInput accessibilityLabel="Search audit logs" value={query} onChangeText={value => { setQuery(value); setPage(1); }}
            placeholder="Search log, invoice, drink, counter, or staff..." placeholderTextColor={C.muted}
            style={{ flex: 1, minWidth: 0, fontSize: 13, color: C.ink, paddingVertical: 9 }} />
          <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => { setQuery(""); setPage(1); }} style={{ padding: 6 }}><X size={14} color={C.muted} /></Pressable>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Filters" onPress={() => setFiltersOpen(true)} style={styles.toolbarButton}>
          <Filter size={15} color={C.muted} /><Text style={styles.small}>Filters</Text><Text style={styles.filterBadge}>{activeFilters || "All"}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={exportAudits} style={[styles.toolbarButton, styles.exportButton]}>
          <FileDown size={15} color="#FFFFFF" /><Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600" }}>Export to Excel</Text>
        </Pressable>
      </View>
      <View style={{ gap: 8 }}>
        <View style={[S.wrap, { justifyContent: "space-between", alignItems: "center" }]}>
          <View style={[S.row, { gap: 8 }]}><ShieldCheck size={14} color={C.muted} /><Text style={styles.small}>Event details</Text><Text style={styles.muted}>{filtered.length} records</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Toggle date sort" onPress={() => { setOldest(!oldest); setPage(1); }} style={[S.row, { gap: 6, paddingVertical: 8 }]}>
            <ArrowDownUp size={13} color={C.muted} /><Text style={styles.small}>{oldest ? "Oldest first" : "Newest first"}</Text><ChevronDown size={12} color={C.muted} />
          </Pressable>
        </View>
        <View style={styles.table}>
          <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }}>
            <View style={{ flex: 1, minWidth: 900 }}>
              <View style={[styles.row, styles.header]}>{columns.map(column => <Text key={column.label} style={[styles.cell, styles.headerText, { flex: column.flex }]}>{column.label.toUpperCase()}</Text>)}</View>
              {visible.map(a => <View key={a.id} style={styles.row}>
                <View style={[styles.cell, { flex: columns[0].flex }]}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`View audit record ${a.id}`} onPress={() => setSelected(a)} style={({ pressed }) => ({ paddingVertical: 10, opacity: pressed ? 0.6 : 1 })}><Text style={styles.green}>Log #{a.id}</Text></Pressable>
                </View>
                <View style={[styles.cell, { flex: columns[1].flex, gap: 4 }]}>
                  <Text style={{ color: C.ink, fontSize: 13, fontWeight: "500" }}>{a.action}</Text>
                  {!!a.related && <Text numberOfLines={2} style={styles.muted}>{a.related}</Text>}
                </View>
                <Text style={[styles.cell, { flex: columns[2].flex }]}>{dateTime(a.at)}</Text>
                <Text style={[styles.cell, { flex: columns[3].flex }]}>{a.account}</Text>
                <Text style={[styles.cell, { flex: columns[4].flex }]}>{a.staff || "—"}</Text>
                <View style={[styles.cell, { flex: columns[5].flex, gap: 4 }]}>
                  <Text numberOfLines={2} style={{ color: C.muted, fontSize: 12, lineHeight: 19 }}>{a.description || "—"}</Text>
                  {a.action === "Status changed" && <Text style={styles.muted}>{a.previous} → {a.next}</Text>}
                </View>
              </View>)}
            </View>
          </ScrollView>
          {!filtered.length && <Empty icon={ShieldCheck} title="No matching events" detail="Adjust the search, action, or date range to find a record." />}
          <TablePagination page={currentPage} pageCount={pageCount} pageSize={pageSize} onPage={setPage} onPageSize={size => { setPageSize(size); setPage(1); }} />
        </View>

      </View>
    </ScrollView>
    <Sheet title="Filter audit logs" visible={filtersOpen} onClose={() => setFiltersOpen(false)}>
      <Button label={`Action: ${action}`} tone="secondary" onPress={() => { setFiltersOpen(false); setChooseAction(true); }} />
      <DateFilter value={range} onChange={value => { setRange(value); setPage(1); }} allTime />
      <Button label="Reset filters" tone="secondary" onPress={() => { setAction("All actions"); setRange(null); setPage(1); }} />
      <Button label="Show records" onPress={() => setFiltersOpen(false)} />
    </Sheet>
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
              setPage(1);
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
