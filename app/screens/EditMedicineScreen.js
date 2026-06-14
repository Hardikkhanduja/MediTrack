import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState, useRef, useEffect } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import { updateMedicine } from "../data/storage";
import { scheduleMedicineAlerts } from "../data/notifications";
import * as Haptics from "expo-haptics";
import PillLogo from "../components/PillLogo";
import { entranceAnimation, pressAnimation } from "../motion";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Accepts multiple date formats and normalizes to YYYY-MM-DD
function normalizeDate(input) {
  const trimmed = input.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const dmy = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  const my = trimmed.match(/^(\d{2})\/(\d{4})$/);
  if (my) return `${my[2]}-${my[1]}-01`;
  const myShort = trimmed.match(/^(\d{2})\/(\d{2})$/);
  if (myShort) return `20${myShort[2]}-${myShort[1]}-01`;
  return trimmed;
}

export default function EditMedicineScreen({ navigation, route }) {
  const { medicine } = route.params;

  const [name, setName] = useState(medicine.name || "");
  const [expiry, setExpiry] = useState(medicine.expiry || "");
  const [quantity, setQuantity] = useState(
    medicine.quantity ? medicine.quantity.toString() : "1",
  );
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    medicine.expiry ? new Date(medicine.expiry) : new Date(),
  );

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;
  const saveBtnScale = useRef(new Animated.Value(1)).current;

  const insets = useSafeAreaInsets();

  // Run entrance on mount
  useEffect(() => {
    entranceAnimation(fadeAnim, slideAnim).start();
  }, []);

  async function handleCalendarPress() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowDatePicker(true);
  }

  function handleDateChange(event, date) {
    if (Platform.OS === "android") setShowDatePicker(false);
    if (!date || event.type === "dismissed") return;
    setSelectedDate(date);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    setExpiry(`${yyyy}-${mm}-${dd}`);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function incrementQuantity() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setQuantity((prev) => ((parseInt(prev) || 0) + 1).toString());
  }

  async function decrementQuantity() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const current = parseInt(quantity) || 0;
    if (current > 0) setQuantity((current - 1).toString());
  }

  async function handleUpdate() {
    if (!name.trim()) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Missing Info", "Please enter medicine name");
      return;
    }

    const normalizedExpiry = normalizeDate(expiry);
    if (!normalizedExpiry || !/^\d{4}-\d{2}-\d{2}$/.test(normalizedExpiry)) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Invalid Date",
        "Please enter date in any of these formats:\nYYYY-MM-DD\nDD/MM/YYYY\nMM/YYYY\n\nOr tap the calendar icon to pick a date.",
      );
      return;
    }

    if (!quantity.trim() || parseInt(quantity) < 1) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Missing Info", "Please enter a valid quantity");
      return;
    }

    pressAnimation(saveBtnScale, 0.97).start();
    setLoading(true);

    const updatedMedicine = {
      id: medicine.id,
      name: name.trim(),
      expiry: normalizedExpiry,
      quantity: parseInt(quantity),
    };

    await updateMedicine(updatedMedicine);
    scheduleMedicineAlerts(updatedMedicine).catch(console.log);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setLoading(false);
    navigation.goBack();
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d0f" />

      {/* ── Header ── */}
      <View
        style={[
          styles.header,
          {
            paddingTop: insets.top + 12,
          },
        ]}
      >
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={20} color="#aaaacc" />
          </TouchableOpacity>
          <View style={styles.headerAccentBar} />
          <Text style={styles.headerBrand}>MediTrack</Text>
          <PillLogo
            size={14}
            colorLeft="#9b8fff"
            colorRight="#4b4ba3"
            rotate="-20deg"
          />
        </View>
        <TouchableOpacity
          style={styles.bellBtn}
          onPress={() => navigation.navigate("Notifications")}
        >
          <Ionicons name="notifications-outline" size={20} color="#aaaacc" />
        </TouchableOpacity>
      </View>

      <Animated.View
        style={[
          styles.screenWrapper,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.screenTitle}>Edit Medicine</Text>

          {/* ── Medicine info card (shows what you're editing) ── */}
          <View style={styles.editingCard}>
            <View style={styles.editingIconBox}>
              <PillLogo
                size={20}
                colorLeft="#9b8fff"
                colorRight="#4b4ba3"
                rotate="-20deg"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.editingLabel}>EDITING MEDICINE</Text>
              <Text style={styles.editingName} numberOfLines={1}>
                {medicine.name}
              </Text>
            </View>
          </View>

          {/* ── Medicine Name ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>MEDICINE NAME</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Dolo 650, Crocin"
              placeholderTextColor="#555568"
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* ── Expiry Date ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>EXPIRY DATE</Text>
            <Text style={styles.fieldHint}>
              Any format: DD/MM/YYYY · MM/YYYY · YYYY-MM-DD
            </Text>
            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { flex: 1, borderWidth: 0 }]}
                placeholder="e.g. 10/12/2026 or 12/2026"
                placeholderTextColor="#555568"
                value={expiry}
                onChangeText={setExpiry}
                keyboardType="numeric"
              />
              <TouchableOpacity
                onPress={handleCalendarPress}
                style={styles.calendarBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="calendar-outline" size={20} color="#9b8fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Date Picker */}
          {showDatePicker && (
            <DateTimePicker
              value={selectedDate}
              mode="date"
              display={Platform.OS === "android" ? "calendar" : "spinner"}
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}

          {/* ── Quantity ── */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>QUANTITY</Text>
            <View style={styles.quantityRow}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={decrementQuantity}
              >
                <Ionicons name="remove" size={20} color="#aaaacc" />
              </TouchableOpacity>
              <TextInput
                style={styles.qtyInput}
                value={quantity}
                onChangeText={(v) => setQuantity(v.replace(/[^0-9]/g, ""))}
                keyboardType="numeric"
                textAlign="center"
              />
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={incrementQuantity}
              >
                <Ionicons name="add" size={20} color="#aaaacc" />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Save Row ── */}
          <View style={styles.saveRow}>
            <Animated.View
              style={[{ flex: 1 }, { transform: [{ scale: saveBtnScale }] }]}
            >
              <TouchableOpacity
                style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
                onPress={handleUpdate}
                disabled={loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.saveBtnText}>UPDATE MEDICINE</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d0f",
  },
  screenWrapper: { flex: 1 },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1a1a24",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#2a2a38",
  },
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

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },

  screenTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#9b8fff",
    marginBottom: 20,
  },

  // Editing card — shows which medicine is being edited
  editingCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161620",
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#9b8fff33",
    gap: 14,
  },
  editingIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#9b8fff22",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#9b8fff33",
  },
  editingLabel: {
    fontSize: 10,
    color: "#9b8fff",
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  editingName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },

  // Form fields
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 10,
    color: "#666680",
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  fieldHint: {
    fontSize: 11,
    color: "#444458",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#161620",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#ffffff",
    borderWidth: 1,
    borderColor: "#222230",
    fontWeight: "500",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161620",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222230",
    paddingRight: 14,
  },
  calendarBtn: {
    padding: 4,
    marginLeft: 8,
  },

  // Quantity stepper
  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161620",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#222230",
    overflow: "hidden",
  },
  qtyBtn: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e1e2e",
  },
  qtyInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
    paddingVertical: 14,
  },

  // Save row
  saveRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: "#9b8fff",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
  },
  cancelBtn: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: "#2a2a38",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#3a3a50",
  },
});
