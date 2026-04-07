import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useState, useEffect } from "react";
import * as Notifications from "expo-notifications";
import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";

function getStatus(expiryDate) {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0)
    return { label: "Expired", color: "#ff4757", days: diffDays };
  if (diffDays <= 30)
    return { label: "Expiring Soon", color: "#ffa502", days: diffDays };
  return { label: "Safe", color: "#2ed573", days: diffDays };
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

  const [modalConfig, setModalConfig] = useState({
    visible: false,
    title: "",
    message: "",
    icon: "✅",
    isConfirm: false,
    onConfirm: null,
    confirmText: "Yes",
  });

  function closeCustomModal() {
    setModalConfig((prev) => ({ ...prev, visible: false }));
  }

  function showSuccessModal(title, message, icon = "✅") {
    setModalConfig({ visible: true, title, message, icon, isConfirm: false });
  }

  function showConfirmModal(title, message, onConfirm, icon = "⚠️", confirmText = "Delete") {
    setModalConfig({
      visible: true,
      title,
      message,
      icon,
      isConfirm: true,
      onConfirm: async () => {
        closeCustomModal();
        await onConfirm();
      },
      confirmText,
    });
  }

  useEffect(() => {
    loadReminders();
  }, []);

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
    if (Platform.OS === "android") {
      setShowPicker(false);
    }

    if (!selectedDate) return;
    if (event.type === "dismissed") return;

    // Verify Notification Permissions
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      const { status: requestStatus } =
        await Notifications.requestPermissionsAsync();
      if (requestStatus !== "granted") {
        showSuccessModal(
          "Permission Denied",
          "You must enable notifications to schedule reminders.",
          "🚫"
        );
        return;
      }
    }

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const hours = selectedDate.getHours();
    const minutes = selectedDate.getMinutes();
    const label = formatTime(selectedDate);

    if (editingId) {
      // Edit existing reminder — save first
      const updated = reminders.map((r) =>
        r.id === editingId ? { ...r, hour: hours, minute: minutes, label } : r,
      );
      await saveReminders(updated);

      // Schedule notification separately
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
        console.log("Notification scheduling failed:", e);
      }
    } else {
      // Add new reminder — save first
      const id = `${medicine.id}_${Date.now()}`;
      const newReminder = { id, hour: hours, minute: minutes, label };
      const updated = [...reminders, newReminder];
      await saveReminders(updated);

      // Schedule notification separately
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
        console.log("Notification scheduling failed:", e);
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showSuccessModal(
        "Reminder Set!",
        `You'll be reminded to take ${medicine.name} every day at ${label}`
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
        } catch (e) {
          console.log("Cancel notification failed:", e);
        }
        const updated = reminders.filter((r) => r.id !== reminder.id);
        await saveReminders(updated);
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning,
        );
      },
      "🗑️",
      "Delete"
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
          } catch (e) {
            console.log("Cancel failed:", e);
          }
        }
        await saveReminders([]);
      },
      "🧹",
      "Clear All"
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Medicine Info Card */}
      <View style={[styles.infoCard, { borderLeftColor: status.color }]}>
        <View style={styles.infoTop}>
          <Text style={styles.medicineName}>{medicine.name}</Text>
          <View style={[styles.statusPill, { borderColor: status.color }]}>
            <Text style={[styles.statusPillText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>EXPIRY DATE</Text>
            <Text style={styles.infoValue}>
              {new Date(medicine.expiry).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>QUANTITY</Text>
            <Text style={styles.infoValue}>{medicine.quantity} units</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>STATUS</Text>
            <Text style={[styles.infoValue, { color: status.color }]}>
              {status.days < 0
                ? `${Math.abs(status.days)}d ago`
                : `${status.days}d left`}
            </Text>
          </View>
        </View>
      </View>

      {/* Reminders Section */}
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionTitle}>DAILY REMINDERS</Text>
          <Text style={styles.sectionSubtitle}>
            {reminders.length === 0
              ? "No reminders set yet"
              : `${reminders.length} reminder${reminders.length > 1 ? "s" : ""} active`}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addReminderBtnWrapper}
          onPress={openAddReminder}
        >
          <LinearGradient
            colors={["#8b80ff", "#5c54d8"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.addReminderBtn}
          >
            <Text style={styles.addReminderBtnText}>＋ Add</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Empty State */}
      {reminders.length === 0 && (
        <View style={styles.emptyReminders}>
          <Text style={styles.emptyReminderIcon}>⏰</Text>
          <Text style={styles.emptyReminderText}>No reminders yet</Text>
          <Text style={styles.emptyReminderSub}>
            Tap "+ Add" to set a daily reminder
          </Text>
        </View>
      )}

      {/* Reminder List */}
      {reminders.map((reminder) => (
        <View key={reminder.id} style={styles.reminderCard}>
          <Text style={styles.reminderIcon}>⏰</Text>
          <View style={styles.reminderInfo}>
            <Text style={styles.reminderTime}>{reminder.label}</Text>
            <Text style={styles.reminderSub}>Every day</Text>
          </View>
          <TouchableOpacity
            style={styles.editReminderBtn}
            onPress={() => openEditReminder(reminder)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.editReminderText}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteReminderBtn}
            onPress={() => deleteReminder(reminder)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.deleteReminderText}>🗑️</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* Clear All */}
      {reminders.length > 0 && (
        <TouchableOpacity style={styles.clearBtn} onPress={clearAllReminders}>
          <Text style={styles.clearBtnText}>Clear All Reminders</Text>
        </TouchableOpacity>
      )}

      {/* Edit Medicine Button */}
      <TouchableOpacity
        style={styles.editButton}
        onPress={() => navigation.navigate("EditMedicine", { medicine })}
        activeOpacity={0.85}
      >
        <Text style={styles.editButtonText}>✏️ Edit Medicine</Text>
      </TouchableOpacity>

      {/* Time Picker */}
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

      {/* Custom Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalConfig.visible}
        onRequestClose={closeCustomModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Text style={styles.modalIcon}>{modalConfig.icon}</Text>
            </View>
            <Text style={styles.modalTitle}>{modalConfig.title}</Text>
            <Text style={styles.modalText}>{modalConfig.message}</Text>
            
            {modalConfig.isConfirm ? (
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={closeCustomModal}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalDeleteBtn}
                  onPress={modalConfig.onConfirm}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalDeleteBtnText}>{modalConfig.confirmText}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.modalOkBtn}
                onPress={closeCustomModal}
                activeOpacity={0.7}
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
  container: {
    flex: 1,
    backgroundColor: "#0d0d0d",
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  infoCard: {
    backgroundColor: "#161616",
    borderRadius: 16,
    padding: 16,
    marginBottom: 28,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: "#222222",
  },
  infoTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  medicineName: {
    fontSize: 20,
    fontFamily: "Inter_800ExtraBold",
    color: "#ffffff",
    flex: 1,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginLeft: 8,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  infoItem: {
    flex: 1,
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 9,
    color: "#555566",
    letterSpacing: 1,
    marginBottom: 4,
    fontFamily: "Inter_800ExtraBold",
  },
  infoValue: {
    fontSize: 13,
    color: "#ffffff",
    fontWeight: "700",
    textAlign: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_800ExtraBold",
    color: "#444455",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#555566",
  },
  addReminderBtnWrapper: {
    borderRadius: 10,
    overflow: "hidden",
  },
  addReminderBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addReminderBtnText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_800ExtraBold",
  },
  emptyReminders: {
    alignItems: "center",
    paddingVertical: 30,
    backgroundColor: "#161616",
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#222222",
  },
  emptyReminderIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  emptyReminderText: {
    fontSize: 15,
    fontFamily: "Inter_800ExtraBold",
    color: "#ffffff",
  },
  emptyReminderSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: "#555566",
    marginTop: 4,
  },
  reminderCard: {
    backgroundColor: "#161616",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#6c63ff",
  },
  reminderIcon: {
    fontSize: 22,
    marginRight: 12,
  },
  reminderInfo: {
    flex: 1,
  },
  reminderTime: {
    fontSize: 16,
    fontFamily: "Inter_800ExtraBold",
    color: "#ffffff",
  },
  reminderSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: "#555566",
    marginTop: 2,
  },
  editReminderBtn: {
    padding: 6,
    marginRight: 4,
  },
  editReminderText: {
    fontSize: 15,
  },
  deleteReminderBtn: {
    padding: 6,
  },
  deleteReminderText: {
    fontSize: 15,
  },
  clearBtn: {
    alignItems: "center",
    padding: 14,
    marginTop: 4,
    marginBottom: 8,
  },
  clearBtnText: {
    color: "#ff4757",
    fontSize: 13,
    fontWeight: "600",
  },
  editButton: {
    backgroundColor: "#161616",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: "#222222",
  },
  editButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontFamily: "Inter_800ExtraBold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#161616",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 340,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2a2a38",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(108, 99, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  modalIcon: {
    fontSize: 28,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: "Inter_800ExtraBold",
    color: "#ffffff",
    marginBottom: 10,
    textAlign: "center",
  },
  modalText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "#8888aa",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#222233",
  },
  modalCancelBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontFamily: "Inter_800ExtraBold",
  },
  modalDeleteBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#ff4757",
  },
  modalDeleteBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontFamily: "Inter_800ExtraBold",
  },
  modalOkBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#6c63ff",
  },
  modalOkBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontFamily: "Inter_800ExtraBold",
  },
});
