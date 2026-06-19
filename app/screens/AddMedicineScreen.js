import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Platform,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState, useEffect, useRef } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import { addMedicine } from "../data/storage";
import {
  scheduleMedicineAlerts,
  requestPermissions,
} from "../data/notifications";
import { scanExpiryDate } from "../data/ocr";
import * as Haptics from "expo-haptics";
import PillLogo from "../components/PillLogo";
import { entranceAnimation, pressAnimation } from "../motion";
import AppModal from "../components/AppModal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
const FAMILY_MEMBERS_KEY = "meditrack_family_members";

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

export default function AddMedicineScreen({ navigation, route }) {
  const [name, setName] = useState("");
  const [expiry, setExpiry] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [members, setMembers] = useState([]);
  const [selectedMemberId, setSelectedMemberId] = useState("self");

  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const insets = useSafeAreaInsets();

  const [validationModal, setValidationModal] = useState({
    visible: false,
    title: "",
    message: "",
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;
  const saveBtnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    entranceAnimation(fadeAnim, slideAnim).start();
  }, []);

  useEffect(() => {
    loadFamilyMembers();
  }, []);

  async function loadFamilyMembers() {
    try {
      const stored = await AsyncStorage.getItem(FAMILY_MEMBERS_KEY);

      if (stored) {
        setMembers(JSON.parse(stored));
      }
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    if (route?.params?.prefill) {
      const { name: n, expiry: e, quantity: q } = route.params.prefill;
      if (n) setName(n);
      if (e) setExpiry(e);
      if (q) setQuantity(String(q));
    }
  }, [route?.params?.prefill]);

  async function handleCalendarPress() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowDatePicker(true);
  }

  function handleDateChange(event, date) {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
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
    const current = parseInt(quantity) || 0;
    setQuantity((current + 1).toString());
  }

  async function decrementQuantity() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const current = parseInt(quantity) || 0;
    if (current > 0) setQuantity((current - 1).toString());
  }

  async function handleClearForm() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setName("");
    setExpiry("");
    setQuantity("1");
  }

  async function handleScan() {
    setScanning(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const result = await scanExpiryDate();
    setScanning(false);

    if (result.canceled) return;
    if (result.error) {
      setErrorModalVisible(true);
      return;
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (result.date) setExpiry(result.date);
    if (result.name) setName(result.name);
    if (result.quantity) setQuantity(result.quantity.toString());
  }

  async function retryScan() {
    if (scanning) return;

    setErrorModalVisible(false);

    setTimeout(async () => {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      await handleScan();
    }, 250);
  }

  async function handleSave() {
    if (!name.trim()) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      setValidationModal({
        visible: true,
        title: "Missing Information",
        message: "Please enter a medicine name.",
      });

      return;
    }

    const normalizedExpiry = normalizeDate(expiry);

    if (!normalizedExpiry || !/^\d{4}-\d{2}-\d{2}$/.test(normalizedExpiry)) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setValidationModal({
        visible: true,
        title: "Invalid Expiry Date",
        message: "Please enter a valid expiry date or use the calendar picker.",
      });
      return;
    }

    if (!quantity.trim() || parseInt(quantity) < 1) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setValidationModal({
        visible: true,
        title: "Invalid Quantity",
        message: "Please enter a quantity greater than zero.",
      });
      return;
    }

    pressAnimation(saveBtnScale, 0.97).start();
    setLoading(true);

    const ownerName =
      selectedMemberId === "self"
        ? "Self"
        : members.find((m) => m.id === selectedMemberId)?.relationship ||
          "Self";

    const newMedicine = {
      id: Date.now().toString(),
      name,
      quantity,
      expiry,
      ownerId: selectedMemberId,
      ownerName,
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d0f" />

      {/* Header */}
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
          <Text style={styles.screenTitle}>Add Medicine</Text>

          {/* Scan Card */}
          <View style={styles.scanCard}>
            <View style={styles.scanIconBox}>
              <Ionicons name="scan" size={32} color="#9b8fff" />
            </View>
            <Text style={styles.scanCardTitle}>Scan Medicine</Text>
            <Text style={styles.scanCardSubtitle}>
              Auto-fill details instantly by scanning the packaging
            </Text>
            <TouchableOpacity
              style={[
                styles.startScannerBtn,
                scanning && styles.startScannerBtnDisabled,
              ]}
              onPress={handleScan}
              disabled={scanning}
              activeOpacity={0.85}
            >
              {scanning ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons
                    name="scan-outline"
                    size={16}
                    color="#ffffff"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.startScannerText}>Start Scanner</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* OR Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Medicine Name */}
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

          {/* Expiry Date */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>EXPIRY DATE</Text>
            <Text style={styles.fieldHint}>
              Type any format or tap calendar to pick
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

          {/* Quantity */}
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

          {/* Assign To */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>ASSIGN TO</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{
                gap: 8,
                paddingVertical: 4,
              }}
            >
              <TouchableOpacity
                style={[
                  styles.memberChip,
                  selectedMemberId === "SELF" && styles.memberChipActive,
                ]}
                onPress={() => setSelectedMemberId("SELF")}
              >
                <Text
                  style={[
                    styles.memberChipText,
                    selectedMemberId === "SELF" && styles.memberChipTextActive,
                  ]}
                >
                  Self
                </Text>
              </TouchableOpacity>

              {members.map((member) => (
                <TouchableOpacity
                  key={member.id}
                  style={[
                    styles.memberChip,
                    selectedMemberId === member.id && styles.memberChipActive,
                  ]}
                  onPress={() => setSelectedMemberId(member.id)}
                >
                  <Text
                    style={[
                      styles.memberChipText,
                      selectedMemberId === member.id &&
                        styles.memberChipTextActive,
                    ]}
                  >
                    {member.relationship || member.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Save Row */}
          <View style={styles.saveRow}>
            <Animated.View
              style={[{ flex: 1 }, { transform: [{ scale: saveBtnScale }] }]}
            >
              <TouchableOpacity
                style={[styles.saveBtn, loading && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={loading}
                activeOpacity={0.88}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.saveBtnText}>SAVE MEDICINE</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={handleClearForm}
            >
              <Ionicons name="trash-outline" size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </Animated.View>

      {/* Scan Error Modal */}
      <AppModal
        visible={errorModalVisible}
        type="error"
        title="Unable to Complete Scan"
        message="We couldn't analyze the medicine image at the moment. Please try again later or enter the medicine details manually."
        primaryText="Retry"
        secondaryText="Continue Manually"
        onPrimary={retryScan}
        onSecondary={() => setErrorModalVisible(false)}
        onClose={() => setErrorModalVisible(false)}
      />

      {/* Validation Modal */}
      <AppModal
        visible={validationModal.visible}
        type="warning"
        title={validationModal.title}
        message={validationModal.message}
        primaryText="OK"
        singleButton={true}
        onPrimary={() =>
          setValidationModal({
            visible: false,
            title: "",
            message: "",
          })
        }
        onClose={() =>
          setValidationModal({
            visible: false,
            title: "",
            message: "",
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d0f",
  },
  memberChip: {
    backgroundColor: "#161620",
    borderWidth: 1,
    borderColor: "#222230",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  memberChipActive: {
    backgroundColor: "#9b8fff",
    borderColor: "#9b8fff",
  },

  memberChipText: {
    color: "#aaaacc",
    fontWeight: "600",
  },

  memberChipTextActive: {
    color: "#ffffff",
  },

  screenWrapper: { flex: 1 },
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
    paddingTop: 16,
  },

  screenTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#9b8fff",
    marginBottom: 20,
  },
  scanCard: {
    backgroundColor: "#161620",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#222230",
    marginBottom: 24,
  },
  scanIconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#9b8fff22",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#9b8fff33",
  },
  scanCardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 6,
  },
  scanCardSubtitle: {
    fontSize: 13,
    color: "#666680",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
  },
  startScannerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#9b8fff",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    width: "100%",
  },
  startScannerBtnDisabled: {
    opacity: 0.6,
  },
  startScannerText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#222230",
  },
  dividerText: {
    fontSize: 12,
    color: "#444458",
    fontWeight: "600",
    letterSpacing: 1,
  },
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
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 1,
  },
  deleteBtn: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: "#aa2222",
    alignItems: "center",
    justifyContent: "center",
  },
});
