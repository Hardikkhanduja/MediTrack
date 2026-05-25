import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Modal,
  StatusBar,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useState, useRef, useCallback } from "react";
import * as Notifications from "expo-notifications";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import PillLogo from "../components/PillLogo";

function getStatus(expiryDate) {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0)
    return {
      label: "EXPIRED",
      color: "#e05555",
      bg: "#2a1515",
      days: diffDays,
    };
  if (diffDays <= 30)
    return { label: "SOON", color: "#c9940a", bg: "#251d08", days: diffDays };
  return { label: "SAFE", color: "#2ea86e", bg: "#0c2218", days: diffDays };
}

function getTodayKey() {
  const d = new Date();

  return `taken_all_${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function formatTime(date) {
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function MedicineDetailScreen({ route, navigation }) {
  const { medicine } = route.params;
  const status = getStatus(medicine.expiry);

  const [reminders, setReminders] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerTime, setPickerTime] = useState(new Date());
  const [editingId, setEditingId] = useState(null);

  // Mark as Taken state
  const [takenToday, setTakenToday] = useState(false);
  const [streak, setStreak] = useState(0);
  const [takenTime, setTakenTime] = useState(null);

  // Animation
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: "",
    message: "",
    icon: "checkmark-circle",
    iconColor: "#9b8fff",
    isConfirm: false,
    onConfirm: null,
    confirmText: "Yes",
  });

  function closeCustomModal() {
    setModalConfig((prev) => ({ ...prev, visible: false }));
  }

  function showSuccessModal(title, message, iconColor = "#9b8fff") {
    setModalConfig({
      visible: true,
      title,
      message,
      icon: "checkmark-circle",
      iconColor,
      isConfirm: false,
    });
  }

  function showConfirmModal(
    title,
    message,
    onConfirm,
    icon = "warning-outline",
    iconColor = "#e05555",
    confirmText = "Delete",
  ) {
    setModalConfig({
      visible: true,
      title,
      message,
      icon,
      iconColor,
      isConfirm: true,
      onConfirm: async () => {
        closeCustomModal();
        await onConfirm();
      },
      confirmText,
    });
  }

  useFocusEffect(
    useCallback(() => {
      loadReminders();
      loadTakenStatus();
      startGlowAnimation();
    }, []),
  );

  function startGlowAnimation() {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }

  async function loadTakenStatus() {
    try {
      const stored = await AsyncStorage.getItem(getTodayKey());

      const takenMap = stored ? JSON.parse(stored) : {};

      const streakData = await AsyncStorage.getItem(`streak_${medicine.id}`);

      const timeData = await AsyncStorage.getItem(`takenTime_${medicine.id}`);

      const isTaken = !!takenMap[medicine.id];

      setTakenToday(isTaken);

      if (timeData) {
        setTakenTime(timeData);
      } else {
        setTakenTime(null);
      }

      if (streakData) {
        setStreak(parseInt(streakData));
      }
    } catch (e) {
      console.log("Error loading taken status", e);
    }
  }

  async function handleMarkAsTaken() {
    try {
      const stored = await AsyncStorage.getItem(getTodayKey());

      const takenMap = stored ? JSON.parse(stored) : {};

      // UNMARK
      if (takenToday) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        delete takenMap[medicine.id];

        await AsyncStorage.setItem(getTodayKey(), JSON.stringify(takenMap));

        const newStreak = Math.max(0, streak - 1);

        await AsyncStorage.setItem(`streak_${medicine.id}`, String(newStreak));

        await AsyncStorage.removeItem(`takenTime_${medicine.id}`);

        setStreak(newStreak);
        setTakenToday(false);
        setTakenTime(null);

        return;
      }

      // BUTTON ANIMATION
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.88,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 3,
          useNativeDriver: true,
        }),
      ]).start();

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const now = new Date();

      const timeStr = formatTime(now);

      takenMap[medicine.id] = true;

      await AsyncStorage.setItem(getTodayKey(), JSON.stringify(takenMap));

      await AsyncStorage.setItem(`takenTime_${medicine.id}`, timeStr);

      // STREAK LOGIC
      const yesterday = new Date();

      yesterday.setDate(yesterday.getDate() - 1);

      const yKey = `taken_all_${yesterday.getFullYear()}-${yesterday.getMonth() + 1}-${yesterday.getDate()}`;

      const yStored = await AsyncStorage.getItem(yKey);

      const yMap = yStored ? JSON.parse(yStored) : {};

      const takenYesterday = !!yMap[medicine.id];

      const newStreak = takenYesterday ? streak + 1 : 1;

      await AsyncStorage.setItem(`streak_${medicine.id}`, String(newStreak));

      setStreak(newStreak);
      setTakenToday(true);
      setTakenTime(timeStr);
    } catch (e) {
      console.log("Error updating taken status", e);
    }
  }

  async function loadReminders() {
    try {
      const stored = await AsyncStorage.getItem(`reminders_${medicine.id}`);
      if (stored) setReminders(JSON.parse(stored));
    } catch (e) {
      console.log("Error loading reminders", e);
    }
  }

  async function saveReminders(updated) {
    setReminders(updated);
    await AsyncStorage.setItem(
      `reminders_${medicine.id}`,
      JSON.stringify(updated),
    );
  }

  function openAddReminder() {
    setEditingId(null);
    setPickerTime(new Date());
    setShowPicker(true);
  }

  function openEditReminder(reminder) {
    setEditingId(reminder.id);
    const d = new Date();
    d.setHours(reminder.hour);
    d.setMinutes(reminder.minute);
    setPickerTime(d);
    setShowPicker(true);
  }

  async function handleTimeSelected(event, selectedDate) {
    if (Platform.OS === "android") setShowPicker(false);
    if (!selectedDate) return;
    if (event.type === "dismissed") return;

    const { status: permStatus } = await Notifications.getPermissionsAsync();
    if (permStatus !== "granted") {
      const { status: reqStatus } =
        await Notifications.requestPermissionsAsync();
      if (reqStatus !== "granted") {
        showSuccessModal(
          "Permission Denied",
          "Enable notifications to set reminders.",
          "#e05555",
        );
        return;
      }
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const hours = selectedDate.getHours();
    const minutes = selectedDate.getMinutes();
    const label = formatTime(selectedDate);

    if (editingId) {
      const updated = reminders.map((r) =>
        r.id === editingId ? { ...r, hour: hours, minute: minutes, label } : r,
      );
      await saveReminders(updated);
      try {
        await Notifications.cancelScheduledNotificationAsync(editingId);
        await Notifications.scheduleNotificationAsync({
          identifier: editingId,
          content: {
            title: "💊 Time to take your medicine!",
            body: `Don't forget to take ${medicine.name}`,
            sound: true,
          },
          trigger: {
            type: "daily",
            hour: hours,
            minute: minutes,
            channelId: "meditrack-reminders",
          },
        });
      } catch (e) {
        console.log("Notification error:", e);
      }
    } else {
      const id = `${medicine.id}_${Date.now()}`;
      const newReminder = { id, hour: hours, minute: minutes, label };
      const updated = [...reminders, newReminder];
      await saveReminders(updated);
      try {
        await Notifications.scheduleNotificationAsync({
          identifier: id,
          content: {
            title: "💊 Time to take your medicine!",
            body: `Don't forget to take ${medicine.name}`,
            sound: true,
          },
          trigger: {
            type: "daily",
            hour: hours,
            minute: minutes,
            channelId: "meditrack-reminders",
          },
        });
      } catch (e) {
        console.log("Notification error:", e);
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showSuccessModal(
        "Reminder Set!",
        `You'll be reminded every day at ${label}`,
        "#9b8fff",
      );
    }
  }

  async function deleteReminder(reminder) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    showConfirmModal(
      "Delete Reminder",
      `Remove ${reminder.label} reminder?`,
      async () => {
        try {
          await Notifications.cancelScheduledNotificationAsync(reminder.id);
        } catch (e) {}
        const updated = reminders.filter((r) => r.id !== reminder.id);
        await saveReminders(updated);
      },
      "trash-outline",
      "#e05555",
      "Delete",
    );
  }

  async function clearAllReminders() {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    showConfirmModal(
      "Clear All Reminders",
      `Remove all reminders for ${medicine.name}?`,
      async () => {
        for (const r of reminders) {
          try {
            await Notifications.cancelScheduledNotificationAsync(r.id);
          } catch (e) {}
        }
        await saveReminders([]);
      },
      "trash-outline",
      "#e05555",
      "Clear All",
    );
  }

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  const pillLeft =
    status.label === "EXPIRED"
      ? "#c94444"
      : status.label === "SOON"
        ? "#b87c10"
        : "#2a9060";
  const pillRight =
    status.label === "EXPIRED"
      ? "#6a1e1e"
      : status.label === "SOON"
        ? "#6a4208"
        : "#145030";

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d0f" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
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
            style={styles.editBtn}
            onPress={() => navigation.navigate("EditMedicine", { medicine })}
          >
            <Ionicons name="pencil-outline" size={16} color="#9b8fff" />
          </TouchableOpacity>
        </View>

        {/* ── Medicine Info Card ── */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardTop}>
            <View
              style={[
                styles.pillIconBg,
                {
                  backgroundColor:
                    status.label === "EXPIRED"
                      ? "#1e0e0e"
                      : status.label === "SOON"
                        ? "#1a1208"
                        : "#0a1a12",
                },
              ]}
            >
              <PillLogo
                size={18}
                colorLeft={pillLeft}
                colorRight={pillRight}
                rotate="-35deg"
              />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.medicineName} numberOfLines={1}>
                {medicine.name}
              </Text>
              <View
                style={[styles.statusBadge, { backgroundColor: status.bg }]}
              >
                <Text style={[styles.statusBadgeText, { color: status.color }]}>
                  {status.label}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>EXPIRY</Text>
              <Text style={styles.infoValue}>
                {new Date(medicine.expiry).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>QUANTITY</Text>
              <Text style={styles.infoValue}>{medicine.quantity} units</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>DAYS LEFT</Text>
              <Text style={[styles.infoValue, { color: status.color }]}>
                {status.days < 0
                  ? `${Math.abs(status.days)}d ago`
                  : `${status.days}d`}
              </Text>
            </View>
          </View>
        </View>

        {/* ── MARK AS TAKEN — Hero Section ── */}
        {reminders.length > 0 ? (
          <View style={styles.takenSection}>
            {/* Streak bar */}
            <View style={styles.streakRow}>
              <View style={styles.streakBadge}>
                <Text style={styles.streakFire}>🔥</Text>
                <Text style={styles.streakCount}>{streak}</Text>
                <Text style={styles.streakLabel}>day streak</Text>
              </View>

              {takenToday && takenTime && (
                <View style={styles.takenTimeBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#2ea86e" />
                  <Text style={styles.takenTimeText}>Taken at {takenTime}</Text>
                </View>
              )}
            </View>

            {/* Big Mark as Taken button */}
            <View style={styles.takenButtonWrapper}>
              {!takenToday && (
                <>
                  <Animated.View
                    style={[
                      styles.glowRing,
                      styles.glowRing3,
                      { opacity: glowOpacity },
                    ]}
                  />

                  <Animated.View
                    style={[
                      styles.glowRing,
                      styles.glowRing2,
                      { opacity: glowOpacity },
                    ]}
                  />

                  <Animated.View
                    style={[
                      styles.glowRing,
                      styles.glowRing1,
                      { opacity: glowOpacity },
                    ]}
                  />
                </>
              )}

              <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                <TouchableOpacity
                  style={[
                    styles.takenButton,
                    takenToday
                      ? styles.takenButtonDone
                      : styles.takenButtonPending,
                  ]}
                  onPress={handleMarkAsTaken}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={takenToday ? "checkmark" : "medical"}
                    size={48}
                    color={takenToday ? "#2ea86e" : "#9b8fff"}
                  />
                </TouchableOpacity>
              </Animated.View>
            </View>

            {/* Status text */}
            <Text
              style={[
                styles.takenStatusText,
                {
                  color: takenToday ? "#2ea86e" : "#9b8fff",
                },
              ]}
            >
              {takenToday ? "Taken today ✓" : "Tap to mark as taken"}
            </Text>

            <Text style={styles.takenSubText}>
              {takenToday
                ? "Great job! Come back tomorrow to keep your streak going."
                : "Track your daily dose and build a healthy habit."}
            </Text>

            {/* Week dots */}
            <View style={styles.weekRow}>
              {["M", "T", "W", "T", "F", "S", "S"].map((day, i) => {
                const today = new Date().getDay();

                const adjustedToday = today === 0 ? 6 : today - 1;

                const isToday = i === adjustedToday;

                const isPast = i < adjustedToday;

                const isTakenDay = isToday && takenToday;

                return (
                  <View key={i} style={styles.weekDayItem}>
                    <View
                      style={[
                        styles.weekDot,
                        isTakenDay
                          ? styles.weekDotTaken
                          : isToday
                            ? styles.weekDotToday
                            : isPast && streak > adjustedToday - i
                              ? styles.weekDotPast
                              : styles.weekDotEmpty,
                      ]}
                    />

                    <Text
                      style={[
                        styles.weekDayLabel,
                        isToday && {
                          color: "#ffffff",
                        },
                      ]}
                    >
                      {day}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.takenSection}>
            <View style={styles.emptyTrackingIcon}>
              <Ionicons
                name="notifications-off-outline"
                size={34}
                color="#555568"
              />
            </View>

            <Text style={styles.noTrackingTitle}>
              No daily reminders enabled
            </Text>

            <Text style={styles.noTrackingSubText}>
              Add a reminder to enable medicine tracking
            </Text>

            <TouchableOpacity
              style={styles.enableTrackingBtn}
              onPress={openAddReminder}
              activeOpacity={0.85}
            >
              <Ionicons
                name="add-circle-outline"
                size={18}
                color="#ffffff"
                style={{ marginRight: 8 }}
              />

              <Text style={styles.enableTrackingBtnText}>Add Reminder</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Reminders Section ── */}
        <View style={styles.remindersSection}>
          <View style={styles.remindersHeader}>
            <View>
              <Text style={styles.sectionTitle}>DAILY REMINDERS</Text>
              <Text style={styles.sectionSubtitle}>
                {reminders.length === 0
                  ? "No reminders set"
                  : `${reminders.length} reminder${reminders.length > 1 ? "s" : ""} active`}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.addReminderBtn}
              onPress={openAddReminder}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={16} color="#9b8fff" />
              <Text style={styles.addReminderBtnText}>ADD</Text>
            </TouchableOpacity>
          </View>

          {reminders.length === 0 && (
            <View style={styles.emptyReminders}>
              <Ionicons
                name="alarm-outline"
                size={32}
                color="#222230"
                style={{ marginBottom: 8 }}
              />
              <Text style={styles.emptyReminderText}>No reminders yet</Text>
              <Text style={styles.emptyReminderSub}>
                Tap ADD to set a daily reminder
              </Text>
            </View>
          )}

          {reminders.map((reminder) => (
            <View key={reminder.id} style={styles.reminderCard}>
              <View style={styles.reminderIconBox}>
                <Ionicons name="alarm-outline" size={18} color="#9b8fff" />
              </View>
              <View style={styles.reminderInfo}>
                <Text style={styles.reminderTime}>{reminder.label}</Text>
                <Text style={styles.reminderSub}>Every day</Text>
              </View>
              <TouchableOpacity
                onPress={() => openEditReminder(reminder)}
                style={styles.reminderAction}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="pencil" size={16} color="#555568" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => deleteReminder(reminder)}
                style={styles.reminderAction}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={16} color="#e05555" />
              </TouchableOpacity>
            </View>
          ))}

          {reminders.length > 0 && (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={clearAllReminders}
            >
              <Text style={styles.clearBtnText}>Clear All Reminders</Text>
            </TouchableOpacity>
          )}
        </View>

        {showPicker && (
          <DateTimePicker
            value={pickerTime}
            mode="time"
            is24Hour={false}
            display={Platform.OS === "android" ? "clock" : "spinner"}
            onChange={handleTimeSelected}
          />
        )}
      </ScrollView>

      {/* ── Modal ── */}
      <Modal
        animationType="fade"
        transparent
        visible={modalConfig.visible}
        onRequestClose={closeCustomModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View
              style={[
                styles.modalIconContainer,
                { backgroundColor: modalConfig.iconColor + "20" },
              ]}
            >
              <Ionicons
                name={modalConfig.icon}
                size={28}
                color={modalConfig.iconColor}
              />
            </View>
            <Text style={styles.modalTitle}>{modalConfig.title}</Text>
            <Text style={styles.modalText}>{modalConfig.message}</Text>
            {modalConfig.isConfirm ? (
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={closeCustomModal}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.modalDeleteBtn,
                    { backgroundColor: modalConfig.iconColor },
                  ]}
                  onPress={modalConfig.onConfirm}
                >
                  <Text style={styles.modalDeleteBtnText}>
                    {modalConfig.confirmText}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.modalOkBtn}
                onPress={closeCustomModal}
              >
                <Text style={styles.modalOkBtnText}>OK</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d0d0f" },

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
  editBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#1a1a24",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#2a2a38",
  },

  // Info card
  infoCard: {
    backgroundColor: "#161620",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#222230",
  },
  infoCardTop: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  pillIconBg: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  medicineName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 6,
  },
  statusBadge: {
    alignSelf: "flex-start",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  infoRow: { flexDirection: "row", alignItems: "center" },
  infoItem: { flex: 1, alignItems: "center" },
  infoDivider: { width: 1, height: 30, backgroundColor: "#222230" },
  infoLabel: {
    fontSize: 9,
    color: "#555568",
    letterSpacing: 1,
    marginBottom: 4,
    fontWeight: "700",
  },
  infoValue: {
    fontSize: 13,
    color: "#ffffff",
    fontWeight: "700",
    textAlign: "center",
  },

  // Mark as Taken section
  takenSection: {
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: "#161620",
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: "#222230",
    alignItems: "center",
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 24,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e1e2e",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#2a2a3e",
    gap: 6,
  },
  streakFire: { fontSize: 16 },
  streakCount: { fontSize: 20, fontWeight: "800", color: "#ffffff" },
  streakLabel: { fontSize: 12, color: "#555568", fontWeight: "500" },
  takenTimeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#0c2218",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#145030",
  },
  takenTimeText: { fontSize: 11, color: "#2ea86e", fontWeight: "600" },

  // Glow button
  takenButtonWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    width: 180,
    height: 180,
  },
  glowRing: { position: "absolute", borderRadius: 100, borderWidth: 1 },
  glowRing1: {
    width: 140,
    height: 140,
    borderColor: "#9b8fff",
    backgroundColor: "#9b8fff08",
  },
  glowRing2: {
    width: 160,
    height: 160,
    borderColor: "#9b8fff",
    backgroundColor: "#9b8fff05",
    borderWidth: 0.5,
  },
  glowRing3: {
    width: 180,
    height: 180,
    borderColor: "#9b8fff",
    backgroundColor: "#9b8fff03",
    borderWidth: 0.3,
  },
  takenButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
  },
  takenButtonPending: {
    backgroundColor: "#1a1a2e",
    borderColor: "#9b8fff",
  },
  takenButtonDone: {
    backgroundColor: "#0c2218",
    borderColor: "#2ea86e",
  },
  takenStatusText: { fontSize: 18, fontWeight: "700", marginBottom: 6 },
  takenSubText: {
    fontSize: 12,
    color: "#555568",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 10,
  },

  // Week dots
  weekRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  weekDayItem: { alignItems: "center", gap: 6 },
  weekDot: { width: 10, height: 10, borderRadius: 5 },
  weekDotEmpty: { backgroundColor: "#222230" },
  weekDotToday: {
    backgroundColor: "#9b8fff40",
    borderWidth: 1,
    borderColor: "#9b8fff",
  },
  weekDotTaken: { backgroundColor: "#2ea86e" },
  weekDotPast: { backgroundColor: "#2ea86e60" },
  weekDayLabel: { fontSize: 10, color: "#555568", fontWeight: "600" },

  // Reminders
  remindersSection: { marginHorizontal: 20 },
  remindersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#444455",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  sectionSubtitle: { fontSize: 11, color: "#555568" },
  addReminderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#1a1a24",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#9b8fff40",
  },
  addReminderBtnText: {
    color: "#9b8fff",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  emptyReminders: {
    alignItems: "center",
    paddingVertical: 28,
    backgroundColor: "#161620",
    borderRadius: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#222230",
  },
  emptyReminderText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#ccccdd",
    marginBottom: 4,
  },
  emptyReminderSub: { fontSize: 11, color: "#555568" },
  reminderCard: {
    backgroundColor: "#161620",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#222230",
  },
  reminderIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#1a1a2e",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#2a2a3e",
  },
  reminderInfo: { flex: 1 },
  reminderTime: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 2,
  },
  reminderSub: { fontSize: 11, color: "#555568" },
  reminderAction: { padding: 6 },
  clearBtn: { alignItems: "center", padding: 14, marginTop: 4 },
  clearBtnText: { color: "#e05555", fontSize: 12, fontWeight: "600" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#161620",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#222230",
  },
  modalIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 10,
    textAlign: "center",
  },
  modalText: {
    fontSize: 13,
    color: "#888899",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButtons: { flexDirection: "row", width: "100%", gap: 10 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#222230",
  },
  modalCancelBtnText: { color: "#ffffff", fontSize: 14, fontWeight: "700" },
  modalDeleteBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  modalDeleteBtnText: { color: "#ffffff", fontSize: 14, fontWeight: "700" },
  modalOkBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#9b8fff",
  },
  modalOkBtnText: { color: "#ffffff", fontSize: 14, fontWeight: "800" },

  emptyTrackingIcon: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "#1a1a24",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#2a2a38",
  },

  noTrackingTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 8,
    textAlign: "center",
  },

  noTrackingSubText: {
    fontSize: 13,
    color: "#555568",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 22,
    paddingHorizontal: 20,
  },

  enableTrackingBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#9b8fff",
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 14,
  },

  enableTrackingBtnText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
});
