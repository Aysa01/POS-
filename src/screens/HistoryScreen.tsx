import { TablePagination } from "../components/TablePagination";
import { tableStyles as styles } from "../components/tableStyles";
import React, { useState } from "react";
import { Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { ArrowDownUp, ChevronDown, FileDown, Filter, Search, X, ReceiptText } from "lucide-react-native";
import { C, Empty, S, showError } from "../components/ui";
import * as FS from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { HistoryFilters } from "../components/HistoryFilters";
import { OrderDetails } from "../components/OrderDetails";
import { usePOS } from "../store/usePOS";
import { dateTime, inRange, money } from "../utils/domain";
import { payments, type DateRange } from "../types";


const columns = [
  { label: "Order number", flex: 1.1 },
  { label: "Customer / items", flex: 2 },
  { label: "Completed date", flex: 1.5 },
  { label: "Total", flex: 0.9 },
  { label: "Payment", flex: 1.2 },
  { label: "Staff", flex: 1 },
];

export function HistoryScreen() {
  const { orders } = usePOS();
  const [query, setQuery] = useState("");
  const [payment, setPayment] = useState("All payments");
  const [range, setRange] = useState<DateRange | null>(null);
  const [oldest, setOldest] = useState(false);
  const [details, setDetails] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const completed = orders.filter((o) => o.status === "Done");
  const filtered = completed
    .filter((o) =>
      `${o.invoice} ${o.id} ${o.customer} ${o.items.map((item) => item.name).join(" ")}`.toLowerCase().includes(query.trim().toLowerCase()) &&
      (payment === "All payments" || o.payment === payment) &&
      (!range || inRange(o.completedAt!, range)),
    )
    .sort((a, b) => (oldest ? 1 : -1) * a.completedAt!.localeCompare(b.completedAt!));
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const activeFilters = Number(payment !== "All payments") + Number(!!range);
  const exportOrders = async () => {
    try {
      const escape = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
      const rows = [columns.map((c) => c.label), ...filtered.map((o) => [o.invoice, `${o.customer}: ${o.items.map((i) => `${i.quantity} × ${i.name}`).join(", ")}`, dateTime(o.completedAt!), o.total / 100, o.payment, o.staff])];
      const xml = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Order History"><Table>${rows.map((row) => `<Row>${row.map((value) => `<Cell><Data ss:Type="${typeof value === "number" ? "Number" : "String"}">${escape(String(value))}</Data></Cell>`).join("")}</Row>`).join("")}</Table></Worksheet></Workbook>`;
      const filename = "order-history.xml";
      if (Platform.OS === "web") {
        const url = URL.createObjectURL(new Blob([xml], { type: "application/vnd.ms-excel" }));
        const link = document.createElement("a");
        link.href = url; link.download = filename; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        const uri = `${FS.cacheDirectory}${filename}`;
        await FS.writeAsStringAsync(uri, xml);
        await Sharing.shareAsync(uri, { mimeType: "application/vnd.ms-excel", dialogTitle: "Export order history" });
      }
    } catch (error) { showError(error); }
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.page}>
        <View style={{ gap: 6 }}>
          <Text accessibilityRole="header" style={styles.title}>Orders History</Text>
          <Text style={styles.muted}>Completed orders, original prices, and receipts.</Text>
        </View>
        <View style={styles.toolbar}>
          <View style={styles.search}>
            <Search size={15} color="#76968B" />
            <TextInput accessibilityLabel="Search order history" value={query}
              onChangeText={(value) => { setQuery(value); setPage(1); }}
              placeholder="Search invoice, order number, customer, or items..." placeholderTextColor="#76968B"
              style={{ flex: 1, minWidth: 0, fontSize: 13, color: C.ink, paddingVertical: 9 }} />
            <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => { setQuery(""); setPage(1); }} style={{ padding: 6 }}><X size={14} color="#76968B" /></Pressable>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Filters" onPress={() => setFiltersOpen(true)} style={styles.toolbarButton}>
            <Filter size={15} color="#7183A0" /><Text style={styles.small}>Filters</Text>
            <Text style={styles.filterBadge}>{activeFilters || "All"}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={exportOrders} style={[styles.toolbarButton, styles.exportButton]}>
            <FileDown size={15} color="#FFFFFF" /><Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "600" }}>Export to Excel</Text>
          </Pressable>
        </View>
        <View style={{ gap: 8 }}>
          <View style={[S.wrap, { justifyContent: "space-between", alignItems: "center" }]}>
            <View style={[S.row, { gap: 8 }]}>
              <ReceiptText size={14} color="#7183A0" />
              <Text style={styles.small}>Order details</Text>
              <Text style={styles.muted}>·  {filtered.length} completed orders</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Toggle date sort" onPress={() => { setOldest(!oldest); setPage(1); }} style={[S.row, { gap: 6, paddingVertical: 8 }]}>
              <ArrowDownUp size={13} color="#4D5E79" /><Text style={styles.small}>{oldest ? "Oldest first" : "Newest first"}</Text><ChevronDown size={12} color="#7183A0" />
            </Pressable>
          </View>
          <View style={styles.table}>
            <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }}>
              <View style={{ flex: 1, minWidth: 900 }}>
                <View style={[styles.row, styles.header]}>
                  {columns.map((column) => (
                    <Text key={column.label} style={[styles.cell, styles.headerText, { flex: column.flex }]}>{column.label.toUpperCase()}</Text>
                  ))}
                </View>
                {visible.map((o) => (
                  <View key={o.id} style={styles.row}>
                    <View style={[styles.cell, { flex: columns[0].flex }]}>
                      <Pressable accessibilityRole="button" accessibilityLabel={`View receipt for ${o.invoice}`}
                        onPress={() => setDetails(o.id)} style={({ pressed }) => ({ paddingVertical: 10, opacity: pressed ? 0.6 : 1 })}>
                        <Text style={styles.green}>{o.invoice}</Text>
                      </Pressable>
                    </View>
                    <View style={[styles.cell, { flex: columns[1].flex, gap: 4 }]}>
                      <Text style={{ color: C.ink, fontSize: 13, fontWeight: "500" }}>{o.customer}</Text>
                      <Text numberOfLines={2} style={{ color: "#7183A0", fontSize: 11, lineHeight: 16 }}>
                        {o.items.map((i) => `${i.quantity} × ${i.name}`).join(", ")}
                      </Text>
                    </View>
                    <Text style={[styles.cell, { flex: columns[2].flex }]}>{dateTime(o.completedAt!)}</Text>
                    <Text style={[styles.cell, styles.green, { flex: columns[3].flex }]}>{money(o.total)}</Text>
                    <Text style={[styles.cell, { flex: columns[4].flex }]}>{o.payment}</Text>
                    <Text style={[styles.cell, { flex: columns[5].flex }]}>{o.staff}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>
            {!filtered.length && (
              <Empty icon={ReceiptText} title={completed.length ? "No matching orders" : "History starts at Done"}
                detail={completed.length ? "Try another customer, invoice, payment method, or date range." : "Finish an order in the pipeline to see its receipt and original prices here."} />
            )}
            <TablePagination page={currentPage} pageCount={pageCount} pageSize={pageSize} onPage={setPage} onPageSize={size => { setPageSize(size); setPage(1); }} />
          </View>

        </View>
      </ScrollView>
      {filtersOpen && <HistoryFilters payment={payment} range={range} onClose={() => setFiltersOpen(false)}
        onApply={(nextPayment, nextRange) => { setPayment(nextPayment); setRange(nextRange); setPage(1); setFiltersOpen(false); }} />}
      <OrderDetails order={orders.find((o) => o.id === details) ?? null} onClose={() => setDetails(null)} />
    </View>
  );
}
