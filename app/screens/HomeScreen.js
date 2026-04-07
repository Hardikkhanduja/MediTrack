import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Alert,
  TextInput,
  Modal,
  LayoutAnimation,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { getMedicines, deleteMedicine } from "../data/storage";
import { cancelMedicineAlerts } from "../data/notifications";
import * as Haptics from "expo-haptics";

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

function getFormattedDate() {
  const now = new Date();
  return now.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function HomeScreen({ navigation }) {
  const [medicines, setMedicines] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [medicineToDelete, setMedicineToDelete] = useState(null);

  useFocusEffect(
    useCallback(() => {
      async function load() {
        const data = await getMedicines();
        setMedicines(data);
      }
      load();
    }, []),
  );

  const sorted = [...medicines].sort((a, b) => {
    const statusOrder = { Expired: 0, "Expiring Soon": 1, Safe: 2 };
    const statusA = statusOrder[getStatus(a.expiry).label];
    const statusB = statusOrder[getStatus(b.expiry).label];
    if (statusA !== statusB) return statusA - statusB;
    return new Date(a.expiry) - new Date(b.expiry);
  });

  const filtered = searchQuery.trim()
    ? sorted.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : sorted;

  const expired = medicines.filter(
    (m) => getStatus(m.expiry).label === "Expired",
  ).length;
  const expiringSoon = medicines.filter(
    (m) => getStatus(m.expiry).label === "Expiring Soon",
  ).length;
  const safe = medicines.filter(
    (m) => getStatus(m.expiry).label === "Safe",
  ).length;

  async function handleDeletePress(item) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMedicineToDelete(item);
    setDeleteModalVisible(true);
  }

  async function confirmDelete() {
    if (!medicineToDelete) return;
    setDeleteModalVisible(false);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await cancelMedicineAlerts(medicineToDelete.id);
    await deleteMedicine(medicineToDelete.id);

    // Trigger graceful animation for remaining items
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

    const updated = await getMedicines();
    setMedicines(updated);
    setMedicineToDelete(null);
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0d0d0d" />

      {/* Date Bar */}
      <View style={styles.datebar}>
        <Text style={styles.dateText}>{getFormattedDate()}</Text>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Medicine Cabinet</Text>
        <Text style={styles.headerSub}>
          {medicines.length} medicine{medicines.length !== 1 ? "s" : ""} tracked
        </Text>
      </View>

      {/* Summary Row */}
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryCount, { color: "#ff4757" }]}>
            {expired}
          </Text>
          <Text style={styles.summaryLabel}>Expired</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryCount, { color: "#ffa502" }]}>
            {expiringSoon}
          </Text>
          <Text style={styles.summaryLabel}>Expiring Soon</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryCount, { color: "#2ed573" }]}>
            {safe}
          </Text>
          <Text style={styles.summaryLabel}>Safe</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search medicines..."
          placeholderTextColor="#444455"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Text style={styles.searchClear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Section Label */}
      <Text style={styles.sectionTitle}>
        {searchQuery
          ? `RESULTS FOR "${searchQuery.toUpperCase()}"`
          : "ALL MEDICINES"}
      </Text>

      {/* Empty State */}
      {medicines.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>💊</Text>
          <Text style={styles.emptyText}>Nothing here yet</Text>
          <Text style={styles.emptySubText}>Add your first medicine below</Text>
        </View>
      )}

      {/* No search results */}
      {medicines.length > 0 && filtered.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyText}>No results found</Text>
          <Text style={styles.emptySubText}>Try a different medicine name</Text>
        </View>
      )}

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 110 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const status = getStatus(item.expiry);
          return (
            <TouchableOpacity
              style={styles.medicineCard}
              onPress={() =>
                navigation.navigate("MedicineDetail", { medicine: item })
              }
              activeOpacity={0.7}
            >
              <View
                style={[styles.accentLine, { backgroundColor: status.color }]}
              />
              <View style={styles.medicineContent}>
                <View style={styles.medicineTop}>
                  <Text style={styles.medicineName}>{item.name}</Text>
                  <View
                    style={[styles.statusPill, { borderColor: status.color }]}
                  >
                    <Text
                      style={[styles.statusPillText, { color: status.color }]}
                    >
                      {status.label}
                    </Text>
                  </View>
                </View>
                <Text style={styles.medicineExpiry}>
                  Expiry:{" "}
                  {new Date(item.expiry).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}{" "}
                  · Qty: {item.quantity} units
                </Text>
                <Text style={[styles.medicineDays, { color: status.color }]}>
                  {status.days < 0
                    ? `⚠ Expired ${Math.abs(status.days)} days ago`
                    : status.days === 0
                      ? "⚠ Expires today!"
                      : `✓ ${status.days} days remaining`}
                </Text>
              </View>
              <View style={styles.medicineRight}>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() =>
                    navigation.navigate("EditMedicine", { medicine: item })
                  }
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.editIcon}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeletePress(item)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Text style={styles.deleteIcon}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* Add Button */}
      <TouchableOpacity
        style={styles.addButtonWrapper}
        onPress={() => navigation.navigate("AddMedicine")}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={["#8b80ff", "#5c54d8"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.addButton}
        >
          <Text style={styles.addButtonText}>＋ Add Medicine</Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Custom Delete Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIconContainer}>
              <Text style={styles.modalIcon}>🗑️</Text>
            </View>
            <Text style={styles.modalTitle}>Delete Medicine?</Text>
            <Text style={styles.modalText}>
              Are you sure you want to remove{" "}
              <Text style={{ color: "#fff", fontWeight: "bold" }}>
                {medicineToDelete?.name}
              </Text>{" "}
              from your cabinet? This will also cancel any scheduled reminders.
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setDeleteModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalDeleteBtn}
                onPress={confirmDelete}
                activeOpacity={0.7}
              >
                <Text style={styles.modalDeleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
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
    paddingTop: 12,
  },
  datebar: {
    marginBottom: 20,
  },
  dateText: {
    fontSize: 12,
    color: "#555566",
    letterSpacing: 0.5,
  },
  header: {
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_800ExtraBold",
    color: "#ffffff",
    letterSpacing: 0.2,
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#555566",
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: "row",
    backgroundColor: "#161616",
    borderRadius: 16,
    padding: 16,
    marginBottom: 28,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#222222",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryCount: {
    fontSize: 24,
    fontFamily: "Inter_800ExtraBold",
  },
  summaryLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#555566",
    marginTop: 3,
    textAlign: "center",
  },
  summaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: "#222222",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161616",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#222222",
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#ffffff",
  },
  searchClear: {
    fontSize: 12,
    color: "#555566",
    padding: 4,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#444455",
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 120,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: 14,
  },
  emptyText: {
    fontSize: 18,
    fontFamily: "Inter_800ExtraBold",
    color: "#ffffff",
  },
  emptySubText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#555566",
    marginTop: 6,
  },
  medicineCard: {
    backgroundColor: "#161616",
    borderRadius: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#222222",
    overflow: "hidden",
  },
  accentLine: {
    width: 3,
    alignSelf: "stretch",
  },
  medicineContent: {
    flex: 1,
    padding: 14,
  },
  medicineTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  medicineName: {
    fontSize: 15,
    fontFamily: "Inter_800ExtraBold",
    color: "#ffffff",
    flex: 1,
  },
  statusPill: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "700",
  },
  medicineExpiry: {
    fontSize: 12,
    color: "#555566",
    marginBottom: 4,
  },
  medicineDays: {
    fontSize: 12,
    fontWeight: "600",
  },
  medicineRight: {
    alignItems: "center",
    paddingRight: 10,
    gap: 10,
  },
  editBtn: {
    padding: 6,
    opacity: 0.7,
  },
  editIcon: {
    fontSize: 16,
  },
  deleteBtn: {
    padding: 6,
    opacity: 0.6,
  },
  deleteIcon: {
    fontSize: 16,
  },
  addButtonWrapper: {
    position: "absolute",
    bottom: 24,
    left: 16,
    right: 16,
    shadowColor: "#8b80ff",
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  addButton: {
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 0.5,
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
    backgroundColor: "rgba(255, 71, 87, 0.15)",
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
    fontWeight: "700",
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
    fontWeight: "700",
  },
});
