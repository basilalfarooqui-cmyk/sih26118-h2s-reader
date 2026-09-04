import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.content}>
        <Text style={styles.title}>H2S Dosimeter Reader</Text>
        <Text style={styles.subtitle}>Select a reading mode</Text>

        <Pressable
          style={[styles.button, styles.normalButton]}
          onPress={() => router.push({ pathname: "/camera", params: { mode: "normal" } })}
        >
          <Text style={styles.buttonText}>Normal Reading</Text>
        </Pressable>

        <Pressable
          style={[styles.button, styles.adminButton]}
          onPress={() => router.push("/login")}
        >
          <Text style={styles.buttonText}>Admin Reading</Text>
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
    justifyContent: "center",
    alignItems: "stretch",
    paddingHorizontal: 24,
    gap: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    textAlign: "center",
    color: "#1f2937",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    color: "#6b7280",
    marginBottom: 24,
  },
  button: {
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: "center",
  },
  normalButton: {
    backgroundColor: "#2563eb",
  },
  adminButton: {
    backgroundColor: "#1f2937",
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
});
