import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState, useCallback } from "react";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { scanExpiryDate } from "../data/ocr";
import * as Haptics from "expo-haptics";
import PillLogo from "../components/PillLogo";
import AppModal from "../components/AppModal";

const { width, height } = Dimensions.get("window");
const VIEWFINDER_W = width * 0.88;
const VIEWFINDER_H = VIEWFINDER_W * 0.6;
const CORNER = 24;
const THICKNESS = 3;

export default function ScanScreen() {
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setCameraActive(true);
      if (permission && !permission.granted) requestPermission();
      return () => setCameraActive(false);
    }, [permission]),
  );

  async function handleScan() {
    if (scanning) return;
    setScanning(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const result = await scanExpiryDate();
    setScanning(false);
    if (result.canceled) return;
    if (result.error) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setErrorModalVisible(true);

      return;
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    navigation.navigate("AddMedicine", {
      prefill: {
        name: result.name || "",
        expiry: result.date || "",
        quantity: result.quantity ? result.quantity.toString() : "",
      },
    });
  }

  async function retryScan() {
    if (scanning) return;

    setErrorModalVisible(false);

    setTimeout(async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      handleScan();
    }, 250);
  }
  const permissionDenied = permission && !permission.granted && !permission.canAskAgain;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d0f" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerAccentBar} />
          <Text style={styles.headerBrand}>MediTrack</Text>
          <PillLogo
            size={14}
            colorLeft="#9b8fff"
            colorRight="#4b4ba3"
            rotate="-20deg"
          />
        </View>
        <TouchableOpacity style={styles.bellBtn}>
          <Ionicons name="notifications-outline" size={20} color="#aaaacc" />
        </TouchableOpacity>
      </View>

      {/* ── Viewfinder ── */}
      <View style={styles.viewfinderSection}>
        {/* Glow layers — stacked Views simulate Android glow */}
        <View style={styles.glow3} />
        <View style={styles.glow2} />
        <View style={styles.glow1} />

        {/* Camera box with border */}
        <View style={styles.viewfinderBorder}>
          <View style={styles.viewfinderInner}>
            {cameraActive && permission?.granted ? (
              <CameraView
                style={StyleSheet.absoluteFill}
                facing="back"
                enableTorch={torchOn}
              />
            ) : permissionDenied ? (
              <View style={styles.fallback}>
                <Ionicons name="camera-off-outline" size={28} color="#555568" />
                <Text style={styles.fallbackText}>Camera access denied</Text>
              </View>
            ) : (
              <View style={styles.fallback}>
                <ActivityIndicator color="#9b8fff" />
              </View>
            )}

            {scanning && (
              <View style={styles.scanOverlay}>
                <ActivityIndicator size="large" color="#9b8fff" />
                <Text style={styles.scanOverlayText}>Analyzing...</Text>
              </View>
            )}
          </View>

          {/* ── Corner brackets ── */}
          {/* Top-left */}
          <View style={[styles.corner, styles.cornerTL]}>
            <View
              style={[
                styles.bH,
                { borderTopWidth: THICKNESS, borderTopColor: "#9b8fff" },
              ]}
            />
            <View
              style={[
                styles.bV,
                { borderLeftWidth: THICKNESS, borderLeftColor: "#9b8fff" },
              ]}
            />
          </View>
          {/* Top-right */}
          <View style={[styles.corner, styles.cornerTR]}>
            <View
              style={[
                styles.bH,
                {
                  borderTopWidth: THICKNESS,
                  borderTopColor: "#9b8fff",
                  alignSelf: "flex-end",
                },
              ]}
            />
            <View
              style={[
                styles.bV,
                {
                  borderRightWidth: THICKNESS,
                  borderRightColor: "#9b8fff",
                  alignSelf: "flex-end",
                },
              ]}
            />
          </View>
          {/* Bottom-left */}
          <View style={[styles.corner, styles.cornerBL]}>
            <View
              style={[
                styles.bV,
                { borderLeftWidth: THICKNESS, borderLeftColor: "#9b8fff" },
              ]}
            />
            <View
              style={[
                styles.bH,
                { borderBottomWidth: THICKNESS, borderBottomColor: "#9b8fff" },
              ]}
            />
          </View>
          {/* Bottom-right */}
          <View style={[styles.corner, styles.cornerBR]}>
            <View
              style={[
                styles.bV,
                {
                  borderRightWidth: THICKNESS,
                  borderRightColor: "#9b8fff",
                  alignSelf: "flex-end",
                },
              ]}
            />
            <View
              style={[
                styles.bH,
                {
                  borderBottomWidth: THICKNESS,
                  borderBottomColor: "#9b8fff",
                  alignSelf: "flex-end",
                },
              ]}
            />
          </View>
        </View>
      </View>

      {/* ── Align text ── */}
      <Text style={styles.alignText}>ALIGN STRIP INSIDE BOX</Text>

      {/* ── Controls ── */}
      <View style={styles.controls}>
        {/* Flash */}
        <View style={styles.controlItem}>
          <TouchableOpacity
            style={[styles.sideBtn, torchOn && styles.sideBtnActive]}
            onPress={() => setTorchOn(!torchOn)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={torchOn ? "flash" : "flash-outline"}
              size={20}
              color={torchOn ? "#9b8fff" : "#aaaacc"}
            />
          </TouchableOpacity>
          <Text style={styles.controlLabel}>FLASH</Text>
        </View>

        {/* Capture */}
        <View style={styles.controlItem}>
          <TouchableOpacity
            style={[styles.captureBtn, scanning && { opacity: 0.7 }]}
            onPress={handleScan}
            disabled={scanning}
            activeOpacity={0.85}
          >
            {scanning ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <View style={styles.captureInner} />
            )}
          </TouchableOpacity>
          <Text style={styles.controlLabel}>SCAN</Text>
        </View>

        {/* Cancel */}
        <View style={styles.controlItem}>
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => navigation.navigate("Home")}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={22} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.controlLabel}>CANCEL</Text>
        </View>
      </View>
      <AppModal
        visible={errorModalVisible}
        type="error"
        title="Unable to Complete Scan"
        message="We couldn't analyze the medicine image at the moment. Please try again later or enter the medicine details manually."
        primaryText="Retry"
        secondaryText="Add Manually"
        onPrimary={retryScan}
        onSecondary={() => {
          setErrorModalVisible(false);
          navigation.navigate("AddMedicine");
        }}
        onClose={() => setErrorModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d0f",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerAccentBar: {
    width: 3,
    height: 22,
    backgroundColor: "#9b8fff",
    borderRadius: 2,
  },
  headerBrand: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 0.2,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1a1a24",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#2a2a38",
  },

  // Viewfinder section with glow
  viewfinderSection: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 0,
    // Extra padding to let glow layers show
    paddingVertical: 20,
    paddingHorizontal: 10,
  },

  // Glow layers — each slightly larger and more transparent
  // Simulates a CSS box-shadow glow on Android
  glow3: {
    position: "absolute",
    width: VIEWFINDER_W + 40,
    height: VIEWFINDER_H + 40,
    borderRadius: 28,
    backgroundColor: "#9b8fff08",
  },
  glow2: {
    position: "absolute",
    width: VIEWFINDER_W + 22,
    height: VIEWFINDER_H + 22,
    borderRadius: 22,
    backgroundColor: "#9b8fff12",
  },
  glow1: {
    position: "absolute",
    width: VIEWFINDER_W + 10,
    height: VIEWFINDER_H + 10,
    borderRadius: 18,
    backgroundColor: "#9b8fff20",
  },

  // Camera border box
  viewfinderBorder: {
    width: VIEWFINDER_W,
    height: VIEWFINDER_H,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#9b8fff55",
    overflow: "visible",
    position: "relative",
  },

  // Camera inner
  viewfinderInner: {
    width: "100%",
    height: "100%",
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: "#08080f",
  },

  fallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  fallbackText: { fontSize: 13, color: "#555568", fontWeight: "600" },

  scanOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8,8,15,0.7)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  scanOverlayText: {
    fontSize: 13,
    color: "#9b8fff",
    fontWeight: "600",
    letterSpacing: 1,
  },

  // Corner brackets
  corner: { position: "absolute" },
  cornerTL: { top: -2, left: -2 },
  cornerTR: { top: -2, right: -2 },
  cornerBL: { bottom: -2, left: -2 },
  cornerBR: { bottom: -2, right: -2 },
  bH: { width: CORNER, height: 0 },
  bV: { width: 0, height: CORNER },

  // Align text
  alignText: {
    fontSize: 11,
    color: "#666680",
    letterSpacing: 2.5,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 20,
    marginBottom: 32,
  },

  // Controls
  controls: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
    paddingHorizontal: 36,
    paddingBottom: 110,
  },
  controlItem: { alignItems: "center", gap: 10 },
  controlLabel: {
    fontSize: 10,
    color: "#555568",
    fontWeight: "600",
    letterSpacing: 1.5,
  },
  sideBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#1a1a24",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#2a2a38",
  },
  sideBtnActive: {
    borderColor: "#9b8fff",
    backgroundColor: "#1e1a30",
  },
  captureBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#9b8fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#c4baff33",
    elevation: 10,
  },
  captureInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  cancelBtn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#aa2222",
    alignItems: "center",
    justifyContent: "center",
  },
});
