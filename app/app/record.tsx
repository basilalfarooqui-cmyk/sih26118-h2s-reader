import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Keyboard,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { sendReading } from "../src/utils/api";
import { addPendingReading } from "../src/utils/storage";

export default function RecordScreen() {
  const { hexCode } = useLocalSearchParams<{ hexCode: string }>();

  const [workerName, setWorkerName] = useState("");
  const [workerId, setWorkerId] = useState("");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const [statusText, setStatusText] = useState("");

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub = Keyboard.addListener(showEvent, (e) => {
      setKeyboardHeight(e.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  function validate(): boolean {
    if (!workerName.trim() || !workerId.trim()) {
      setStatus("error");
      setStatusText("Worker Name and Worker ID are required.");
      return false;
    }
    return true;
  }

  async function handleSendNow() {
    if (!validate()) return;
    setStatus("sending");
    try {
      await sendReading({
        workerName: workerName.trim(),
        workerId: workerId.trim(),
        hexCode,
        source: "app",
        timeRecorded: new Date().toISOString(),
      });
      setStatus("success");
      setStatusText("Sent successfully.");
      setTimeout(() => router.back(), 800);
    } catch (err) {
      setStatus("error");
      setStatusText(err instanceof Error ? err.message : "Failed to send reading.");
    }
  }

  async function handleSaveLocally() {
    if (!validate()) return;
    try {
      await addPendingReading({
        localId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        workerName: workerName.trim(),
        workerId: workerId.trim(),
        hexCode,
        timeRecorded: new Date().toISOString(),
      });
      setStatus("success");
      setStatusText("Saved.");
      setTimeout(() => router.back(), 800);
    } catch (err) {
      setStatus("error");
      setStatusText(err instanceof Error ? err.message : "Failed to save reading.");
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={[styles.content, { paddingBottom: keyboardHeight + 24 }]}>
        <Text style={styles.title}>Record Reading</Text>

        <View style={styles.hexPreview}>
          <View style={[styles.hexSwatch, { backgroundColor: hexCode }]} />
          <Text style={styles.hexText}>{hexCode}</Text>
        </View>

        <TextInput
          style={styles.input}
          placeholder="Worker Name"
          value={workerName}
          onChangeText={setWorkerName}
        />
        <TextInput
          style={styles.input}
          placeholder="Worker ID"
          value={workerId}
          onChangeText={setWorkerId}
        />

        {statusText ? (
          <Text style={status === "error" ? styles.errorText : styles.successText}>
            {statusText}
          </Text>
        ) : null}

        <Pressable
          style={[styles.button, styles.sendButton]}
          onPress={handleSendNow}
          disabled={status === "sending"}
        >
          {status === "sending" ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Send Now</Text>
          )}
        </Pressable>

        <Pressable
          style={[styles.button, styles.saveButton]}
          onPress={handleSaveLocally}
          disabled={status === "sending"}
        >
          <Text style={styles.buttonText}>Save Locally</Text>
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
  content: {
    flex: 1,
    padding: 24,
    gap: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 4,
  },
  hexPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  hexSwatch: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  hexText: {
    fontSize: 16,
    color: "#374151",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14,
  },
  successText: {
    color: "#166534",
    fontSize: 14,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },
  sendButton: {
    backgroundColor: "#2563eb",
  },
  saveButton: {
    backgroundColor: "#4b5563",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
