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
import {
  entranceAnimation,
  pressAnimation,
  configureLayoutTransition,
  DURATION,
  EASE,
} from "../motion";
import { useLayout } from "../layout";
import { getStockStatus } from "../stock";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
  const layout = useLayout();
  const { contentPadding, maxContentWidth, useDetailSideBySide, fs } = layout;

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
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(10)).current;
  // Taken pill opacity cross-fade
  const takenOpacity = useRef(new Animated.Value(0)).current;

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

  const { medicine } = route.params;

  const [weekHistory, setWeekHistory] = useState([]);
  const [currentMedicine, setCurrentMedicine] = useState(medicine);

  if (!currentMedicine) {
    return null;
  }

  const ownerLabel = currentMedicine.ownerName || "Self";
  const status = getStatus(currentMedicine.expiry);
  const isExpired = status.label === "EXPIRED";
  const stockStatus = getStockStatus(currentMedicine.quantity);
  const insets = useSafeAreaInsets();

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

  async function loadWeekHistory() {
    try {
      const history = [];

      const today = new Date();

      for (let i = 6; i >= 0; i--) {
        const checkDate = new Date(today);

        checkDate.setDate(today.getDate() - i);

        const key = `taken_all_${checkDate.getFullYear()}-${
          checkDate.getMonth() + 1
        }-${checkDate.getDate()}`;

        const stored = await AsyncStorage.getItem(key);

        const map = stored ? JSON.parse(stored) : {};

        history.push({
          date: new Date(checkDate),
          taken: !!map[currentMedicine.id],
        });
      }

      setWeekHistory(history);
    } catch (e) {
      console.log("Error loading week history", e);
    }
  }

  async function loadLatestMedicine() {
    try {
      const stored = await AsyncStorage.getItem("medicines");

      if (!stored) return;

      const medicines = JSON.parse(stored);

      const updated = medicines.find((m) => m.id === medicine.id);

      if (updated) { 
        setCurrentMedicine(updated);
      }
    } catch (e) {
      console.log("Error loading latest medicine", e);
    }
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
      async function refreshScreen() {
        fadeAnim.setValue(0);
        slideAnim.setValue(10);

        entranceAnimation(fadeAnim, slideAnim).start();

        await loadLatestMedicine();
        await loadReminders();
        await loadTakenStatus();
        await loadWeekHistory();

        takenOpacity.setValue(0);
      }

      refreshScreen();
    }, []),
  );

  async function loadTakenStatus() {
    try {
      const stored = await AsyncStorage.getItem(getTodayKey());
      const takenMap = stored ? JSON.parse(stored) : {};
      const streakData = await AsyncStorage.getItem(
        `streak_${currentMedicine.id}`,
      );
      const timeData = await AsyncStorage.getItem(
        `takenTime_${currentMedicine.id}`,
      );
      const isTaken = !!takenMap[currentMedicine.id];

      setTakenToday(isTaken);
      // Sync opacity to loaded state without animating
      takenOpacity.setValue(isTaken ? 1 : 0.65);

      if (timeData) setTakenTime(timeData);
      else setTakenTime(null);
      if (streakData) {
        setStreak(parseInt(streakData));
      } else {
        setStreak(0);
      }
    } catch (e) {
      console.log("Error loading taken status", e);
    }
  }

  async function handleMarkAsTaken() {
    if (isExpired) return;
    try {
      const stored = await AsyncStorage.getItem(getTodayKey());

      const takenMap = stored ? JSON.parse(stored) : {};

      // UNMARK
      if (takenToday) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        pressAnimation(scaleAnim, 0.97).start();

        delete takenMap[currentMedicine.id];
        await AsyncStorage.setItem(getTodayKey(), JSON.stringify(takenMap));

        const newStreak = Math.max(0, streak - 1);
        await AsyncStorage.setItem(
          `streak_${currentMedicine.id}`,
          String(newStreak),
        );
        await AsyncStorage.removeItem(`takenTime_${currentMedicine.id}`);

        // Fade out to pending opacity
        Animated.timing(takenOpacity, {
          toValue: 0.65,
          duration: DURATION.fast,
          easing: EASE.out,
          useNativeDriver: true,
        }).start(() => {
          setStreak(newStreak);
          setTakenToday(false);
          setTakenTime(null);
        });
        await loadWeekHistory();
        return;
      }

      // Press animation — unified spring
      pressAnimation(scaleAnim, 0.94).start();

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const now = new Date();

      const timeStr = formatTime(now);

      takenMap[currentMedicine.id] = true;

      await AsyncStorage.setItem(getTodayKey(), JSON.stringify(takenMap));

      await AsyncStorage.setItem(`takenTime_${currentMedicine.id}`, timeStr);

      // STREAK LOGIC
      const yesterday = new Date();

      yesterday.setDate(yesterday.getDate() - 1);

      const yKey = `taken_all_${yesterday.getFullYear()}-${yesterday.getMonth() + 1}-${yesterday.getDate()}`;

      const yStored = await AsyncStorage.getItem(yKey);

      const yMap = yStored ? JSON.parse(yStored) : {};

      const takenYesterday = !!yMap[currentMedicine.id];

      const newStreak = takenYesterday ? streak + 1 : 1;

      await AsyncStorage.setItem(
        `streak_${currentMedicine.id}`,
        String(newStreak),
      );

      // Fade in to full opacity on taken
      Animated.timing(takenOpacity, {
        toValue: 1,
        duration: DURATION.fast,
        easing: EASE.out,
        useNativeDriver: true,
      }).start();

      setStreak(newStreak);
      setTakenToday(true);
      setTakenTime(timeStr);

      await loadWeekHistory();
    } catch (e) {
      console.log("Error updating taken status", e);
    }
  }

  async function loadReminders() {
    try {
      const stored = await AsyncStorage.getItem(
        `reminders_${currentMedicine.id}`,
      );
      if (stored) setReminders(JSON.parse(stored));
    } catch (e) {
      console.log("Error loading reminders", e);
    }
  }

  async function saveReminders(updated) {
    configureLayoutTransition();
    setReminders(updated);
    await AsyncStorage.setItem(
      `reminders_${currentMedicine.id}`,
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
            title: "Medicine Reminder",
            body: `${currentMedicine.name} for ${ownerLabel}`,
            sound: true,
            data: {
              medicineId: currentMedicine.id,
              medicineName: currentMedicine.name,
              ownerName: ownerLabel,
            },
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
      const id = `${currentMedicine.id}_${Date.now()}`;
      const newReminder = { id, hour: hours, minute: minutes, label };
      const updated = [...reminders, newReminder];
      await saveReminders(updated);
      try {
        await Notifications.scheduleNotificationAsync({
          identifier: id,
          content: {
            title: "Medicine Reminder",
            body: `${currentMedicine.name} for ${ownerLabel}`,
            sound: true,
            data: {
              medicineId: currentMedicine.id,
              medicineName: currentMedicine.name,
              ownerName: ownerLabel,
            },
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
      const medicineLabel =
        ownerLabel === "Self"
          ? currentMedicine.name
          : `${ownerLabel}'s ${currentMedicine.name}`;

      showSuccessModal(
        "Reminder Set!",
        `You'll receive a daily reminder at ${label} for ${medicineLabel}.`,
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
      `Remove all reminders for ${currentMedicine.name}?`,
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

      <Animated.View
        style={[
          styles.screenWrapper,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 60 }}
        >
          {/* Centered content container */}
          <View
            style={[
              styles.contentContainer,
              maxContentWidth && {
                maxWidth: maxContentWidth,
                alignSelf: "center",
                width: "100%",
              },
            ]}
          >
            {/* ── Header ── */}
            <View
              style={[
                styles.header,
                {
                  paddingHorizontal: contentPadding,
                  paddingTop: insets.top + 12,
                },
              ]}
            >
              <View style={styles.headerLeft}>
                <TouchableOpacity
                  style={styles.backBtn}
                  onPress={() => navigation.goBack()}
                >
                  <Ionicons name="arrow-back" size={20} color="#aaaacc" />
                </TouchableOpacity>
                <View style={styles.headerAccentBar} />
                <Text style={[styles.headerBrand, { fontSize: fs(20, 22) }]}>
                  MediTrack
                </Text>
                <PillLogo
                  size={14}
                  colorLeft="#9b8fff"
                  colorRight="#4b4ba3"
                  rotate="-20deg"
                />
              </View>

              <TouchableOpacity
                style={styles.editBtn}
                onPress={() =>
                  navigation.navigate("EditMedicine", {
                    medicine: currentMedicine,
                  })
                }
              >
                <Ionicons name="pencil-outline" size={16} color="#9b8fff" />
              </TouchableOpacity>
            </View>

            <Text
              style={[
                styles.screenTitle,
                { paddingHorizontal: contentPadding },
              ]}
            >
              Medicine Details
            </Text>

            {/*
          On large tablets: info card + tracking card sit side-by-side.
          On phones/small tablets: stacked (existing layout).
          We use a row wrapper that only activates on large tablets.
        */}
            <View
              style={[
                useDetailSideBySide && {
                  flexDirection: "row",
                  alignItems: "flex-start",
                  paddingHorizontal: contentPadding,
                  gap: 16,
                },
              ]}
            >
              {/* ── Medicine Info Card ── */}
              <View
                style={[
                  styles.infoCard,
                  !useDetailSideBySide && { marginHorizontal: contentPadding },
                  useDetailSideBySide && { flex: 1, marginHorizontal: 0 },
                ]}
              >
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
                    <Text
                      style={[styles.medicineName, { fontSize: fs(18, 20) }]}
                      numberOfLines={1}
                    >
                      {currentMedicine.name}
                    </Text>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: status.bg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          { color: status.color },
                        ]}
                      >
                        {status.label}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>EXPIRY</Text>
                    <Text style={styles.infoValue}>
                      {new Date(currentMedicine.expiry).toLocaleDateString(
                        "en-IN",
                        {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        },
                      )}
                    </Text>
                  </View>

                  <View style={styles.infoDivider} />
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>QUANTITY</Text>
                    {stockStatus.isLow && !isExpired ? (
                      <View style={styles.stockChip}>
                        <Text
                          style={[
                            styles.stockChipText,
                            { color: stockStatus.color },
                          ]}
                        >
                          {currentMedicine.quantity} · {stockStatus.label}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.infoValue}>
                        {currentMedicine.quantity} units
                      </Text>
                    )}
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
                <View style={styles.assignedContainer}>
                  <Text style={styles.assignedText}>
                    Assigned to: {ownerLabel}
                  </Text>
                </View>
              </View>

              {/* ── MARK AS TAKEN + Reminders column (side-by-side on large tablets) ── */}
              <View style={useDetailSideBySide && { flex: 1 }}>
                {/* ── MARK AS TAKEN — Compact Row ── */}
                {reminders.length > 0 ? (
                  <View
                    style={[
                      styles.takenSection,
                      isExpired && styles.takenSectionExpired,
                      !useDetailSideBySide && {
                        marginHorizontal: contentPadding,
                      },
                      useDetailSideBySide && { marginHorizontal: 0 },
                    ]}
                  >
                    {/* Top row: streak + action button */}
                    <View style={styles.streakRow}>
                      <View
                        style={[
                          styles.streakBadge,
                          isExpired && styles.streakBadgeExpired,
                        ]}
                      >
                        {!isExpired && (
                          <>
                            <Text style={styles.streakFire}>🔥</Text>
                            <View style={styles.streakDivider} />
                          </>
                        )}
                        <Text
                          style={[
                            styles.streakCount,
                            isExpired && { color: "#444455" },
                          ]}
                        >
                          {isExpired ? "—" : streak}
                        </Text>
                        <Text style={styles.streakLabel}>day streak</Text>
                      </View>

                      {isExpired ? (
                        <View style={styles.expiredTrackingRow}>
                          <Ionicons
                            name="alert-circle-outline"
                            size={13}
                            color="#e05555"
                          />
                          <Text style={styles.expiredTrackingText}>
                            Expired medicine
                          </Text>
                        </View>
                      ) : (
                        <Animated.View
                          style={{
                            transform: [{ scale: scaleAnim }],
                            opacity: takenOpacity,
                          }}
                        >
                          <TouchableOpacity
                            style={[
                              styles.takenPillBtn,
                              takenToday
                                ? styles.takenPillDone
                                : styles.takenPillPending,
                            ]}
                            onPress={handleMarkAsTaken}
                            activeOpacity={0.8}
                          >
                            <Ionicons
                              name={
                                takenToday
                                  ? "checkmark-circle"
                                  : "medical-outline"
                              }
                              size={14}
                              color={takenToday ? "#2ea86e" : "#9b8fff"}
                            />
                            <Text
                              style={[
                                styles.takenPillText,
                                { color: takenToday ? "#2ea86e" : "#9b8fff" },
                              ]}
                            >
                              {takenToday
                                ? `Taken${takenTime ? ` · ${takenTime}` : ""}`
                                : "Mark as taken"}
                            </Text>
                          </TouchableOpacity>
                        </Animated.View>
                      )}
                    </View>

                    {/* Week dots */}
                    <View style={styles.weekRow}>
                      {weekHistory.map((day, index) => {
                        const today = new Date();

                        const isToday =
                          day.date.toDateString() === today.toDateString();

                        const label = day.date
                          .toLocaleDateString("en-IN", {
                            weekday: "short",
                          })
                          .charAt(0);

                        return (
                          <View key={index} style={styles.weekDayItem}>
                            <View
                              style={[
                                styles.weekDot,
                                isExpired
                                  ? styles.weekDotExpired
                                  : day.taken
                                    ? styles.weekDotTaken
                                    : isToday
                                      ? styles.weekDotToday
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
                              {label}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.takenSection,
                      isExpired && styles.takenSectionExpired,
                      !useDetailSideBySide && {
                        marginHorizontal: contentPadding,
                      },
                      useDetailSideBySide && { marginHorizontal: 0 },
                    ]}
                  >
                    <View style={styles.emptyTrackingIcon}>
                      <Ionicons
                        name={
                          isExpired
                            ? "ban-outline"
                            : "notifications-off-outline"
                        }
                        size={34}
                        color={isExpired ? "#e0555540" : "#555568"}
                      />
                    </View>

                    <Text style={styles.noTrackingTitle}>
                      {isExpired
                        ? "Tracking unavailable"
                        : "No daily reminders enabled"}
                    </Text>

                    <Text style={styles.noTrackingSubText}>
                      {isExpired
                        ? "This medicine has expired and cannot be tracked."
                        : "Add a reminder to enable medicine tracking"}
                    </Text>

                    {!isExpired && (
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
                        <Text style={styles.enableTrackingBtnText}>
                          Add Reminder
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* ── Reminders Section ── */}
                <View
                  style={[
                    styles.remindersSection,
                    !useDetailSideBySide && {
                      marginHorizontal: contentPadding,
                    },
                    useDetailSideBySide && { marginHorizontal: 0 },
                  ]}
                >
                  <View style={styles.remindersHeader}>
                    <View>
                      <Text style={styles.sectionTitle}>DAILY REMINDERS</Text>
                      <Text style={styles.sectionSubtitle}>
                        {isExpired
                          ? "Inactive — medicine expired"
                          : reminders.length === 0
                            ? "No reminders set"
                            : `${reminders.length} reminder${reminders.length > 1 ? "s" : ""} active`}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.addReminderBtn,
                        isExpired && styles.addReminderBtnDisabled,
                      ]}
                      onPress={isExpired ? undefined : openAddReminder}
                      activeOpacity={isExpired ? 1 : 0.8}
                    >
                      <Ionicons
                        name="add"
                        size={16}
                        color={isExpired ? "#333344" : "#9b8fff"}
                      />
                      <Text
                        style={[
                          styles.addReminderBtnText,
                          isExpired && { color: "#333344" },
                        ]}
                      >
                        ADD
                      </Text>
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
                      <Text style={styles.emptyReminderText}>
                        No reminders yet
                      </Text>
                      <Text style={styles.emptyReminderSub}>
                        Tap ADD to set a daily reminder
                      </Text>
                    </View>
                  )}

                  {reminders.map((reminder) => (
                    <View
                      key={reminder.id}
                      style={[
                        styles.reminderCard,
                        isExpired && styles.reminderCardExpired,
                      ]}
                    >
                      <View
                        style={[
                          styles.reminderIconBox,
                          isExpired && styles.reminderIconBoxExpired,
                        ]}
                      >
                        <Ionicons
                          name="alarm-outline"
                          size={18}
                          color={isExpired ? "#333344" : "#9b8fff"}
                        />
                      </View>
                      <View style={styles.reminderInfo}>
                        <Text
                          style={[
                            styles.reminderTime,
                            isExpired && { color: "#444455" },
                          ]}
                        >
                          {reminder.label}
                        </Text>
                        <Text style={styles.reminderSub}>
                          {isExpired ? "Inactive" : "Every day"}
                        </Text>
                      </View>
                      {!isExpired && (
                        <View style={styles.reminderActionsGroup}>
                          <TouchableOpacity
                            onPress={() => openEditReminder(reminder)}
                            style={styles.reminderAction}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons
                              name="pencil-outline"
                              size={15}
                              color="#555568"
                            />
                          </TouchableOpacity>
                          <View style={styles.reminderActionDivider} />
                          <TouchableOpacity
                            onPress={() => deleteReminder(reminder)}
                            style={styles.reminderAction}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={15}
                              color="#c04444"
                            />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))}

                  {reminders.length > 0 && (
                    <TouchableOpacity
                      style={styles.clearBtn}
                      onPress={clearAllReminders}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={13}
                        color="#7a3535"
                      />
                      <Text style={styles.clearBtnText}>
                        Clear all reminders
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              {/* end side-by-side column */}
            </View>
            {/* end side-by-side row */}
          </View>
          {/* end contentContainer */}

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
      </Animated.View>

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
  screenWrapper: { flex: 1 },
  contentContainer: { flex: 1 },

  // Header — paddingHorizontal applied inline from layout
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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

  screenTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#9b8fff",
    marginBottom: 16,
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

  // Info card — marginHorizontal applied inline from layout
  infoCard: {
    backgroundColor: "#161620",
    borderRadius: 16,
    padding: 16,
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

  // Stock chip — shown inside info card when stock is low/critical
  stockChip: {
    alignSelf: "center",
  },
  stockChipText: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    letterSpacing: 0.1,
  },
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

  // Mark as Taken — marginHorizontal applied inline from layout
  takenSection: {
    marginBottom: 20,
    backgroundColor: "#161620",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#222230",
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 12,
  },
  takenPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },
  takenPillPending: {
    backgroundColor: "#1a1a2e",
    borderColor: "#9b8fff40",
  },
  takenPillDone: {
    backgroundColor: "#0c2218",
    borderColor: "#145030",
  },
  takenPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e1e2e",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "#2a2a3e",
    gap: 5,
  },
  streakBadgeExpired: {
    borderColor: "#222230",
    backgroundColor: "#161620",
  },
  streakFire: { fontSize: 13, lineHeight: 18 },
  streakDivider: {
    width: 1,
    height: 12,
    backgroundColor: "#2e2e42",
    marginHorizontal: 1,
  },
  streakCount: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 0.2,
  },
  streakLabel: {
    fontSize: 11,
    color: "#444455",
    fontWeight: "500",
    letterSpacing: 0.1,
  },

  takenSectionExpired: {
    borderColor: "#1e1515",
    opacity: 0.7,
  },
  expiredTrackingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#1e0e0e",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#3a1515",
  },
  expiredTrackingText: {
    fontSize: 11,
    color: "#e05555",
    fontWeight: "500",
  },

  // Week dots
  weekRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  weekDayItem: { alignItems: "center", gap: 6 },
  weekDot: { width: 10, height: 10, borderRadius: 5 },
  weekDotEmpty: { backgroundColor: "#2e2e40" },
  weekDotExpired: { backgroundColor: "#2a1515" },
  weekDotToday: {
    backgroundColor: "#9b8fff30",
    borderWidth: 1,
    borderColor: "#9b8fff80",
  },
  weekDotTaken: { backgroundColor: "#2ea86e" },
  weekDayLabel: { fontSize: 10, color: "#555568", fontWeight: "600" },

  // Reminders — marginHorizontal applied inline from layout
  remindersSection: {},
  remindersHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#3d3d52",
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  sectionSubtitle: { fontSize: 12, color: "#6e6e88", fontWeight: "500" },
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
  reminderActionsGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a28",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2a2a3a",
    overflow: "hidden",
  },
  reminderAction: { paddingHorizontal: 10, paddingVertical: 8 },
  reminderActionDivider: { width: 1, height: 16, backgroundColor: "#2a2a3a" },
  reminderCardExpired: { borderColor: "#1e1e28", opacity: 0.5 },
  reminderIconBoxExpired: {
    borderColor: "#1e1e28",
    backgroundColor: "#111118",
  },
  addReminderBtnDisabled: {
    borderColor: "#1e1e28",
    backgroundColor: "#111118",
  },
  clearBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2e1a1a",
    backgroundColor: "#130d0d",
  },
  clearBtnText: {
    color: "#7a3535",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.2,
  },

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

  assignedContainer: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#222230",
    paddingTop: 12,
    alignItems: "center",
  },

  assignedText: {
    color: "#6e6e88",
    fontSize: 12,
    fontWeight: "500",
  },
});
