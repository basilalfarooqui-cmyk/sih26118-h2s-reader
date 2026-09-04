import { useCallback, useState } from "react";
import { View, Text, Pressable, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { getPendingReadings, removePendingReadings } from "../src/utils/storage";
import { sendReading } from "../src/utils/api";
import type { PendingReading } from "../src/types";

export default function SavedRecordsScreen() {
  const [records, setRecords] = useState<PendingReading[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [syncing, setSyncing] = useState(false);
  const [statusText, setStatusText] = useState("");

  const loadRecords = useCallback(async () => {
    const pending = await getPendingReadings();
    setRecords(pending);
    setSelected(new Set());
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecords();
    }, [loadRecords])
  );

  function toggleSelect(localId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(localId)) next.delete(localId);
      else next.add(localId);
      return next;
    });
  }

  async function syncRecords(toSync: PendingReading[]) {
    if (toSync.length === 0) return;
    setSyncing(true);
    setStatusText("");
    const succeededIds: string[] = [];
    try {
      for (const record of toSync) {
        try {
          await sendReading({
            workerName: record.workerName,
            workerId: record.workerId,
            hexCode: record.hexCode,
            source: "app",
            timeRecorded: record.timeRecorded,
            timeSynced: new Date().toISOString(),
          });
          succeededIds.push(record.localId);
        } catch {
          // continue syncing the rest; failures stay pending for retry
        }
      }

      if (succeededIds.length > 0) {
        await removePendingReadings(succeededIds);
      }

      if (succeededIds.length === toSync.length) {
        setStatusText(`Synced ${succeededIds.length} record(s).`);
      } else {
        setStatusText(
          `Synced ${succeededIds.length} of ${toSync.length}. Remaining stayed saved for retry.`
        );
      }
      await loadRecords();
    } finally {
      setSyncing(false);
    }
  }

  function handleSyncSelected() {
    const toSync = records.filter((r) => selected.has(r.localId));
    syncRecords(toSync);
  }

  function handleSyncAll() {
    syncRecords(records);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Saved Records</Text>
        <View style={{ width: 50 }} />
      </View>

      {statusText ? <Text style={styles.statusText}>{statusText}</Text> : null}

      <FlatList
        data={records}
        keyExtractor={(item) => item.localId}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={<Text style={styles.emptyText}>No saved records pending sync.</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => toggleSelect(item.localId)}>
            <View style={[styles.checkbox, selected.has(item.localId) && styles.checkboxChecked]} />
            <View style={styles.rowContent}>
              <Text style={styles.rowTitle}>{item.workerName} ({item.workerId})</Text>
              <View style={styles.rowMeta}>
                <View style={[styles.hexSwatch, { backgroundColor: item.hexCode }]} />
                <Text style={styles.rowMetaText}>{item.hexCode}</Text>
                <Text style={styles.rowMetaText}>
                  {new Date(item.timeRecorded).toLocaleString()}
                </Text>
              </View>
            </View>
          </Pressable>
        )}
      />

      <View style={styles.footer}>
        <Pressable
          style={[styles.button, styles.syncSelectedButton]}
          onPress={handleSyncSelected}
          disabled={syncing || selected.size === 0}
        >
          {syncing ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Sync Selected</Text>}
        </Pressable>
        <Pressable
          style={[styles.button, styles.syncAllButton]}
          onPress={handleSyncAll}
          disabled={syncing || records.length === 0}
        >
          <Text style={styles.buttonText}>Sync All</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f5f7",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backText: {
    color: "#2563eb",
    fontSize: 15,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1f2937",
  },
  statusText: {
    textAlign: "center",
    color: "#166534",
    marginBottom: 8,
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  emptyText: {
    textAlign: "center",
    color: "#6b7280",
    marginTop: 40,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: "#9ca3af",
  },
  checkboxChecked: {
    backgroundColor: "#2563eb",
    borderColor: "#2563eb",
  },
  rowContent: {
    flex: 1,
    gap: 4,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2937",
  },
  rowMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  hexSwatch: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  rowMetaText: {
    fontSize: 12,
    color: "#6b7280",
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  syncSelectedButton: {
    backgroundColor: "#4b5563",
  },
  syncAllButton: {
    backgroundColor: "#2563eb",
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
