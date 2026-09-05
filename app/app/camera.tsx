import { useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator, useWindowDimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useLocalSearchParams } from "expo-router";
import { centerCropRegion, extractHexColorFromRegion, type CropRegion } from "../src/utils/pixelColor";
import CropAdjuster from "../src/components/CropAdjuster";

type Photo = { uri: string; width: number; height: number };

export default function CameraScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const isAdmin = params.mode === "admin";
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [photo, setPhoto] = useState<Photo | null>(null);
  const [pendingRegion, setPendingRegion] = useState<CropRegion | null>(null);
  const [processing, setProcessing] = useState(false);
  const [hexResult, setHexResult] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState("");

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer} edges={["top", "bottom"]}>
        <Text style={styles.permissionText}>Camera access is required to read the strip.</Text>
        <Pressable style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  async function handleCapture() {
    if (!cameraRef.current || processing) return;
    setError("");
    setProcessing(true);
    try {
      const taken = await cameraRef.current.takePictureAsync({ base64: false });
      if (!taken) throw new Error("Failed to capture photo");
      const captured = { uri: taken.uri, width: taken.width, height: taken.height };
      setPhoto(captured);
      setPendingRegion(centerCropRegion(captured.width, captured.height));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to capture photo");
    } finally {
      setProcessing(false);
    }
  }

  async function handleConfirmCrop() {
    if (!photo || !pendingRegion || processing) return;
    setError("");
    setProcessing(true);
    try {
      const hex = await extractHexColorFromRegion(photo.uri, pendingRegion);
      setHexResult(hex);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read strip");
    } finally {
      setProcessing(false);
    }
  }

  function handleScanAgain() {
    setPhoto(null);
    setPendingRegion(null);
    setHexResult(null);
    setError("");
  }

  function handleRecord() {
    if (!hexResult) return;
    router.push({ pathname: "/record", params: { hexCode: hexResult } });
    handleScanAgain();
  }

  // --- Step 2: adjust the capture region on the photo just taken ---
  if (photo && !hexResult) {
    return (
      <View style={styles.container}>
        <CropAdjuster
          photoUri={photo.uri}
          photoWidth={photo.width}
          photoHeight={photo.height}
          initialRegion={pendingRegion ?? centerCropRegion(photo.width, photo.height)}
          onChange={setPendingRegion}
        />
        <SafeAreaView style={styles.overlayContainer} edges={["top", "bottom"]} pointerEvents="box-none">
          <View style={styles.hintBar} pointerEvents="none">
            <Text style={styles.hintText}>Drag the corners to select the strip color area</Text>
          </View>
        </SafeAreaView>
        <View style={styles.bottomBarAbsolute}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <View style={styles.adjustButtonRow}>
            <Pressable style={styles.secondaryButton} onPress={handleScanAgain}>
              <Text style={styles.secondaryButtonText}>Retake</Text>
            </Pressable>
            <Pressable style={styles.actionButton} onPress={handleConfirmCrop} disabled={processing}>
              {processing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.actionButtonText}>Use This Area</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // --- Step 3: show the extracted color ---
  if (hexResult) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.overlayContainer} edges={["top", "bottom"]} pointerEvents="box-none">
          {isAdmin && (
            <View style={styles.topBar}>
              <Pressable style={styles.menuButton} onPress={() => setMenuOpen((v) => !v)}>
                <Text style={styles.menuIcon}>☰</Text>
              </Pressable>
            </View>
          )}
          {menuOpen && isAdmin && (
            <View style={styles.menuPanel}>
              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  setMenuOpen(false);
                  router.push("/saved-records");
                }}
              >
                <Text style={styles.menuItemText}>Saved Records</Text>
              </Pressable>
              <Pressable
                style={styles.menuItem}
                onPress={() => {
                  setMenuOpen(false);
                  handleScanAgain();
                }}
              >
                <Text style={styles.menuItemText}>Scan Again</Text>
              </Pressable>
            </View>
          )}
        </SafeAreaView>

        <View style={styles.bottomBarAbsolute}>
          <View style={styles.resultOverlay}>
            <View style={[styles.hexSwatch, { backgroundColor: hexResult }]} />
            <Text style={styles.hexText}>{hexResult}</Text>

            {isAdmin ? (
              <Pressable style={styles.actionButton} onPress={handleRecord}>
                <Text style={styles.actionButtonText}>Record</Text>
              </Pressable>
            ) : null}

            <Pressable style={styles.secondaryButton} onPress={handleScanAgain}>
              <Text style={styles.secondaryButtonText}>Scan Again</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  // --- Step 1: live camera view with a capture-area guide box ---
  const guideSize = Math.round(Math.min(screenWidth, screenHeight) * 0.4);

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      <View
        pointerEvents="none"
        style={[
          styles.guideBox,
          { width: guideSize, height: guideSize, marginLeft: -guideSize / 2, marginTop: -guideSize / 2 },
        ]}
      />

      <SafeAreaView style={styles.overlayContainer} edges={["top", "bottom"]} pointerEvents="box-none">
        {isAdmin && (
          <View style={styles.topBar}>
            <Pressable style={styles.menuButton} onPress={() => setMenuOpen((v) => !v)}>
              <Text style={styles.menuIcon}>☰</Text>
            </Pressable>
          </View>
        )}

        {menuOpen && isAdmin && (
          <View style={styles.menuPanel}>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                router.push("/saved-records");
              }}
            >
              <Text style={styles.menuItemText}>Saved Records</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                handleScanAgain();
              }}
            >
              <Text style={styles.menuItemText}>Scan Again</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>

      <View style={styles.bottomBarAbsolute}>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Pressable style={styles.readButton} onPress={handleCapture} disabled={processing}>
          {processing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.readButtonText}>Read</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  overlayContainer: {
    flex: 1,
    justifyContent: "flex-start",
  },
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    gap: 16,
    backgroundColor: "#f4f5f7",
  },
  permissionText: {
    fontSize: 16,
    textAlign: "center",
    color: "#1f2937",
  },
  guideBox: {
    position: "absolute",
    top: "50%",
    left: "50%",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.85)",
    borderRadius: 8,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "flex-start",
    padding: 12,
  },
  menuButton: {
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  menuIcon: {
    color: "#fff",
    fontSize: 22,
  },
  menuPanel: {
    position: "absolute",
    top: 64,
    left: 12,
    backgroundColor: "#fff",
    borderRadius: 10,
    overflow: "hidden",
    minWidth: 180,
    elevation: 6,
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  menuItemText: {
    fontSize: 15,
    color: "#1f2937",
  },
  bottomBarAbsolute: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    paddingBottom: 40,
    gap: 12,
  },
  hintBar: {
    alignItems: "center",
    paddingTop: 16,
  },
  hintText: {
    color: "#fff",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    overflow: "hidden",
  },
  errorText: {
    color: "#fecaca",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  readButton: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#fff",
  },
  readButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  adjustButtonRow: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  resultOverlay: {
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 10,
    minWidth: 220,
  },
  hexSwatch: {
    width: 56,
    height: 56,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#fff",
  },
  hexText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  actionButton: {
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
    marginTop: 8,
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  secondaryButtonText: {
    color: "#d1d5db",
    fontSize: 14,
  },
  button: {
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});
