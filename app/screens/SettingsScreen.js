import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Switch,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import PillLogo from "../components/PillLogo";

const USER_NAME_KEY = "meditrack_user_name";

export default function SettingsScreen() {
  const [userName, setUserName]               = useState("");
  const [notificationsEnabled, setNotif]      = useState(true);
  const [reminderTime]                        = useState("08:30 AM");
  const [nameModalVisible, setNameModal]      = useState(false);
  const [inputName, setInputName]             = useState("");

  // Load saved name on focus
  useFocusEffect(
    useCallback(() => {
      async function loadName() {
        try {
          const saved = await AsyncStorage.getItem(USER_NAME_KEY);
          if (saved) {
            setUserName(saved);
          } else {
            // First time — auto open modal
            setInputName("");
            setNameModal(true);
          }
        } catch (e) {
          console.log("Error loading name:", e);
        }
      }
      loadName();
    }, [])
  );

  function openEditName() {
    setInputName(userName);
    setNameModal(true);
  }

  async function saveName() {
    const trimmed = inputName.trim();
    if (!trimmed) {
      Alert.alert("Name Required", "Please enter your name to continue.");
      return;
    }
    try {
      await AsyncStorage.setItem(USER_NAME_KEY, trimmed);
      setUserName(trimmed);
      setNameModal(false);
    } catch (e) {
      Alert.alert("Error", "Could not save name. Please try again.");
    }
  }

  function handleTerms() {
    Alert.alert("Terms of Service", "Terms of Service will be available soon.");
  }

  function handlePrivacy() {
    Alert.alert("Privacy Policy", "Privacy Policy will be available soon.");
  }

  // First letter of name for avatar
  const avatarLetter = userName ? userName.trim()[0].toUpperCase() : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d0f" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerAccentBar} />
          <Text style={styles.headerBrand}>MediTrack</Text>
          <PillLogo size={14} colorLeft="#9b8fff" colorRight="#4b4ba3" rotate="-20deg" />
        </View>
        <TouchableOpacity style={styles.bellBtn}>
          <Ionicons name="notifications-outline" size={20} color="#aaaacc" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Profile Section ── */}
        <TouchableOpacity
          style={styles.profileSection}
          onPress={openEditName}
          activeOpacity={0.8}
        >
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarCircle}>
              {avatarLetter ? (
                <Text style={styles.avatarLetter}>{avatarLetter}</Text>
              ) : (
                <Ionicons name="person" size={40} color="#9b8fff" />
              )}
            </View>
            <View style={styles.editBadge}>
              <Ionicons name="pencil" size={10} color="#ffffff" />
            </View>
          </View>
          <Text style={styles.profileName}>
            {userName || "Tap to set your name"}
          </Text>
          {userName ? (
            <Text style={styles.profileEditHint}>Tap to edit</Text>
          ) : null}
        </TouchableOpacity>

        {/* ── PREFERENCES ── */}
        <Text style={styles.sectionLabel}>PREFERENCES</Text>
        <View style={styles.card}>

          {/* Notifications */}
          <View style={styles.settingRow}>
            <View style={styles.settingIconBox}>
              <Ionicons name="notifications-outline" size={18} color="#9b8fff" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Notifications</Text>
              <Text style={styles.settingSubtitle}>Manage medication alerts</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotif}
              trackColor={{ false: "#2a2a38", true: "#9b8fff" }}
              thumbColor="#ffffff"
              ios_backgroundColor="#2a2a38"
            />
          </View>

          <View style={styles.rowDivider} />

          {/* Reminder Time */}
          <View style={styles.settingRow}>
            <View style={styles.settingIconBox}>
              <Ionicons name="time-outline" size={18} color="#9b8fff" />
            </View>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Reminder Time</Text>
              <Text style={styles.settingSubtitle}>Daily summary alert</Text>
            </View>
            <View style={styles.timeChip}>
              <Text style={styles.timeChipText}>{reminderTime}</Text>
            </View>
          </View>

        </View>

        {/* ── PRIVACY ── */}
        <Text style={styles.sectionLabel}>PRIVACY</Text>
        <View style={styles.card}>
          <View style={styles.privacyRow}>
            <View style={styles.settingIconBox}>
              <Ionicons name="shield-checkmark-outline" size={18} color="#9b8fff" />
            </View>
            <View style={styles.privacyInfo}>
              <View style={styles.privacyTitleRow}>
                <Text style={styles.settingTitle}>Offline Mode Enabled</Text>
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>ACTIVE</Text>
                </View>
              </View>
              <Text style={styles.privacyDesc}>
                Your medical data is encrypted and stored locally on this device. Syncing is currently disabled for maximum privacy.
              </Text>
            </View>
          </View>
        </View>

        {/* ── LEGAL & INFORMATION ── */}
        <Text style={styles.sectionLabel}>LEGAL & INFORMATION</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.legalRow} onPress={handleTerms} activeOpacity={0.7}>
            <View style={styles.settingIconBox}>
              <Ionicons name="document-text-outline" size={18} color="#9b8fff" />
            </View>
            <Text style={styles.legalTitle}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={18} color="#555568" />
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity style={styles.legalRow} onPress={handlePrivacy} activeOpacity={0.7}>
            <View style={styles.settingIconBox}>
              <Ionicons name="shield-outline" size={18} color="#9b8fff" />
            </View>
            <Text style={styles.legalTitle}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={18} color="#555568" />
          </TouchableOpacity>
        </View>

        {/* ── App Info ── */}
        <View style={styles.appInfo}>
          <View style={styles.appIconBox}>
            <PillLogo size={22} colorLeft="#9b8fff" colorRight="#4b4ba3" rotate="-20deg" />
          </View>
          <Text style={styles.appName}>MediTrack</Text>
          <Text style={styles.appVersion}>VERSION 1.0</Text>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* ── Name Input Modal ── */}
      <Modal
        visible={nameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (userName) setNameModal(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
        >
          <View style={styles.modalBox}>

            {/* Icon */}
            <View style={styles.modalIconBox}>
              <Ionicons name="person-outline" size={28} color="#9b8fff" />
            </View>

            <Text style={styles.modalTitle}>
              {userName ? "Edit Your Name" : "Welcome to MediTrack!"}
            </Text>
            <Text style={styles.modalSubtitle}>
              {userName
                ? "Update the name shown on your profile."
                : "What should we call you? This stays on your device only."}
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Enter your name"
              placeholderTextColor="#555568"
              value={inputName}
              onChangeText={setInputName}
              autoFocus
              maxLength={30}
              returnKeyType="done"
              onSubmitEditing={saveName}
            />

            <View style={styles.modalBtns}>
              {userName ? (
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setNameModal(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[styles.modalSaveBtn, !userName && { flex: 1 }]}
                onPress={saveName}
                activeOpacity={0.85}
              >
                <Text style={styles.modalSaveText}>
                  {userName ? "Save" : "Get Started"}
                </Text>
              </TouchableOpacity>
            </View>

          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    paddingBottom: 8,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerAccentBar: { width: 3, height: 22, backgroundColor: "#9b8fff", borderRadius: 2 },
  headerBrand: { fontSize: 20, fontWeight: "700", color: "#ffffff", letterSpacing: 0.2 },
  bellBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: "#1a1a24", alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: "#2a2a38",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },

  // Profile
  profileSection: {
    alignItems: "center",
    paddingVertical: 24,
  },
  avatarWrapper: {
    position: "relative",
    marginBottom: 14,
  },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#1a1a2e",
    borderWidth: 2,
    borderColor: "#2a2a48",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    fontSize: 36,
    fontWeight: "800",
    color: "#9b8fff",
  },
  editBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#9b8fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#0d0d0f",
  },
  profileName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 4,
  },
  profileEditHint: {
    fontSize: 12,
    color: "#555568",
  },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#555568",
    letterSpacing: 1.5,
    marginBottom: 10,
    marginTop: 4,
  },

  // Card
  card: {
    backgroundColor: "#161620",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222230",
    marginBottom: 20,
    overflow: "hidden",
  },

  // Setting row
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  settingIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#1e1e30",
    alignItems: "center",
    justifyContent: "center",
  },
  settingInfo: { flex: 1 },
  settingTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 12,
    color: "#555568",
  },
  rowDivider: {
    height: 1,
    backgroundColor: "#1e1e2e",
    marginHorizontal: 16,
  },

  // Time chip
  timeChip: {
    backgroundColor: "#222230",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#2a2a3a",
  },
  timeChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#ffffff",
  },

  // Privacy
  privacyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    gap: 12,
  },
  privacyInfo: { flex: 1 },
  privacyTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
    flexWrap: "wrap",
  },
  activeBadge: {
    backgroundColor: "#222230",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#3a3a50",
  },
  activeBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#9b8fff",
    letterSpacing: 0.5,
  },
  privacyDesc: {
    fontSize: 12,
    color: "#555568",
    lineHeight: 18,
  },

  // Legal
  legalRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  legalTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
  },

  // App info
  appInfo: {
    alignItems: "center",
    paddingVertical: 10,
    gap: 8,
  },
  appIconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: "#9b8fff22",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#9b8fff33",
    marginBottom: 4,
  },
  appName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  appVersion: {
    fontSize: 11,
    color: "#555568",
    letterSpacing: 1.5,
    fontWeight: "600",
  },

  // Name Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  modalBox: {
    backgroundColor: "#161620",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    borderWidth: 1,
    borderColor: "#222230",
  },
  modalIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#9b8fff22",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#9b8fff33",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#666680",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: "#0d0d0f",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#ffffff",
    borderWidth: 1,
    borderColor: "#2a2a3a",
    marginBottom: 20,
    fontWeight: "500",
  },
  modalBtns: {
    flexDirection: "row",
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#222230",
    borderWidth: 1,
    borderColor: "#2a2a3a",
  },
  modalCancelText: {
    color: "#aaaacc",
    fontSize: 15,
    fontWeight: "700",
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
    backgroundColor: "#9b8fff",
  },
  modalSaveText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
});