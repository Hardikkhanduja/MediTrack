import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { addMedicine } from "../data/storage";
import {
  scheduleMedicineAlerts,
  requestPermissions,
} from "../data/notifications";
import { scanExpiryDate } from "../data/ocr";
import * as Haptics from "expo-haptics";

export default function AddMedicineScreen({ navigation }) {
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  async function handleScan() {
    setScanning(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const result = await scanExpiryDate();

    setScanning(false);

    if (result.canceled) return;

    if (result.error) {
      Alert.alert(
        "Scan Failed",
        `${result.error}\n\nDetected text:\n"${result.rawText || "Nothing detected"}"\n\nPlease enter manually.`,
      );
      return;
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (result.date) setExpiry(result.date);
    if (result.name) setName(result.name);
    if (result.quantity) setQuantity(result.quantity.toString());

    Alert.alert(
      "✅ Found!",
      `Name: ${result.name || "Not found"}\nExpiry: ${result.date || "Not found"}\nQuantity: ${result.quantity || "Not counted"}\n\nPlease verify before saving.`,
    );
  }

  async function handleSave() {
    if (!name.trim()) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Missing Info", "Please enter medicine name");
      return;
    }
    if (!expiry.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(expiry)) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Invalid Date",
        "Please enter date in YYYY-MM-DD format\ne.g. 2026-12-01",
      );
      return;
    }
    if (!quantity.trim()) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Missing Info", "Please enter quantity");
      return;
    }

    setLoading(true);

    const newMedicine = {
      id: Date.now().toString(),
      name: name.trim(),
      expiry: expiry.trim(),
      quantity: parseInt(quantity),
    };

    await addMedicine(newMedicine);

    const granted = await requestPermissions();
    if (granted) {
      scheduleMedicineAlerts(newMedicine).catch(console.log);
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setLoading(false);
    navigation.goBack();
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Add Medicine</Text>
      <Text style={styles.pageSubtitle}>
        Fill details or scan the medicine strip
      </Text>

      <View style={styles.formCard}>
        <Text style={styles.label}>💊 Medicine Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Dolo 650, Crocin"
          placeholderTextColor="#555570"
          value={name}
          onChangeText={setName}
        />

        <View style={styles.divider} />

        <Text style={styles.label}>📅 Expiry Date</Text>
        <View style={styles.expiryRow}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 10 }]}
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#555570"
            value={expiry}
            onChangeText={setExpiry}
          />
          <TouchableOpacity
            style={[styles.scanBtnWrapper, scanning && { opacity: 0.6 }]}
            onPress={handleScan}
            disabled={scanning}
          >
            <LinearGradient
              colors={["#8b80ff", "#5c54d8"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.scanBtn}
            >
              {scanning ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.scanBtnText}>📷 Scan</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <Text style={styles.label}>🔢 Quantity</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 10"
          placeholderTextColor="#555570"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
        />
      </View>

      {/* Scan tip */}
      <View style={styles.tipBox}>
        <Text style={styles.tipText}>
          📷 Tip: Tap "Scan" to auto-detect expiry date from medicine strip
          photo
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.saveButtonWrapper, loading && { opacity: 0.6 }]}
        onPress={handleSave}
        disabled={loading}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={["#8b80ff", "#5c54d8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.saveButton}
        >
          <Text style={styles.saveButtonText}>
            {loading ? "Saving..." : "Save Medicine"}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d0d",
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  pageTitle: {
    fontSize: 26,
    fontFamily: "Inter_800ExtraBold",
    color: "#ffffff",
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#8888aa",
    marginBottom: 28,
  },
  formCard: {
    backgroundColor: "#161616",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#222222",
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#8888aa",
    marginBottom: 8,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#0d0d0d",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#ffffff",
    marginBottom: 4,
  },
  expiryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  scanBtnWrapper: {
    borderRadius: 12,
    overflow: "hidden",
    minWidth: 80,
  },
  scanBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  scanBtnText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_800ExtraBold",
  },
  divider: {
    height: 1,
    backgroundColor: "#2a2a38",
    marginVertical: 14,
  },
  tipBox: {
    backgroundColor: "#161616",
    borderRadius: 14,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 3,
    borderLeftColor: "#6c63ff",
    borderWidth: 1,
    borderColor: "#222222",
  },
  tipText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#8888aa",
    lineHeight: 20,
  },
  saveButtonWrapper: {
    marginTop: 20,
    marginBottom: 40,
    borderRadius: 16,
    shadowColor: "#8b80ff",
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  saveButton: {
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 0.5,
  },
});
