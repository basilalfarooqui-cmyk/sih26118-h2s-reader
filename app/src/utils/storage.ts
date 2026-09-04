import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PendingReading } from "../types";

const STORAGE_KEY = "h2s_pending_readings";

export async function getPendingReadings(): Promise<PendingReading[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function addPendingReading(reading: PendingReading): Promise<void> {
  const existing = await getPendingReadings();
  existing.push(reading);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export async function removePendingReadings(localIds: string[]): Promise<void> {
  const existing = await getPendingReadings();
  const remaining = existing.filter((r) => !localIds.includes(r.localId));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(remaining));
}
