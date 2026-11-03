import React from "react";
import { Text, View } from "react-native";
import type { Status } from "../types";
export const statusColors: Record<Status, { bg: string; ink: string }> = {
  "In Queue": { bg: "#F9EED9", ink: "#7A4D10" },
  "In Progress": { bg: "#E5EFF9", ink: "#245880" },
  Ready: { bg: "#E8E9F6", ink: "#55518A" },
  Serving: { bg: '#F8E6DC', ink: '#914820' },
  Done: { bg: "#E2EFE6", ink: "#27613D" },
};
export function StatusBadge({ status, emphasized = false }: { status: Status; emphasized?: boolean }) {
  const color = statusColors[status];
  return (
    <View
      style={{
        backgroundColor: color.bg,
        paddingVertical: emphasized ? 7 : 5,
        paddingHorizontal: emphasized ? 10 : 9,
        borderRadius: 7,
        alignSelf: "flex-start",
      }}
    >
      <Text accessibilityRole={emphasized ? 'header' : undefined} style={{ color: color.ink, fontSize: emphasized ? 14 : 12, fontWeight: emphasized ? '800' : '700' }}>
        {status}
      </Text>
    </View>
  );
}
