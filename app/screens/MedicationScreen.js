import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { getMedicines } from "../data/storage";
import PillLogo from "../components/PillLogo";
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
      textColor: "#e05555",
    };
  if (diffDays <= 30)
    return {
      label: "SOON",
      color: "#c9940a",
      bg: "#251d08",
      textColor: "#c9940a",
    };
  return {
    label: "SAFE",
    color: "#2ea86e",
    bg: "#0c2218",
    textColor: "#2ea86e",
  };
}

const FILTERS = ["ALL", "EXPIRED", "SOON", "SAFE"];

export default function MedicationScreen({ navigation }) {
  const [medicines, setMedicines] = useState([]);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const insets = useSafeAreaInsets();

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
    const order = { EXPIRED: 0, SOON: 1, SAFE: 2 };
    const sa = order[getStatus(a.expiry).label];
    const sb = order[getStatus(b.expiry).label];
    if (sa !== sb) return sa - sb;
    return new Date(a.expiry) - new Date(b.expiry);
  });

  const filterApplied =
    activeFilter === "ALL"
      ? sorted
      : sorted.filter((m) => getStatus(m.expiry).label === activeFilter);

  const displayed = searchQuery.trim()
    ? filterApplied.filter((m) =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : filterApplied;

  const counts = {
    ALL: medicines.length,
    EXPIRED: medicines.filter((m) => getStatus(m.expiry).label === "EXPIRED")
      .length,
    SOON: medicines.filter((m) => getStatus(m.expiry).label === "SOON").length,
    SAFE: medicines.filter((m) => getStatus(m.expiry).label === "SAFE").length,
  };

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

      <Text style={styles.screenTitle}>Medications</Text>

      {/* ── Filter Tabs ── */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const isActive = activeFilter === f;
          const count = counts[f];
          return (
            <TouchableOpacity
              key={f}
              style={[styles.filterTab, isActive && styles.filterTabActive]}
              onPress={() => setActiveFilter(f)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterTabText,
                  isActive && styles.filterTabTextActive,
                ]}
              >
                {f}
              </Text>
              {count > 0 && (
                <View
                  style={[
                    styles.filterCount,
                    isActive && styles.filterCountActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterCountText,
                      isActive && styles.filterCountTextActive,
                    ]}
                  >
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Search + Add ── */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons
            name="search-outline"
            size={15}
            color="#555568"
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search medicines..."
            placeholderTextColor="#555568"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={15} color="#555568" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate("AddMedicine")}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* ── List ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {displayed.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons
              name="medical-outline"
              size={40}
              color="#222230"
              style={{ marginBottom: 12 }}
            />
            <Text style={styles.emptyTitle}>
              {activeFilter === "ALL"
                ? "No medicines added yet"
                : `No ${activeFilter.toLowerCase()} medicines`}
            </Text>
            <Text style={styles.emptySubText}>
              {activeFilter === "ALL"
                ? "Tap + to add your first medicine"
                : "All clear in this category"}
            </Text>
          </View>
        )}

        {displayed.map((item) => {
          const status = getStatus(item.expiry);

          // Pill icon colors — EXPIRED=red, SOON=amber, SAFE=green, all muted
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
          const iconBg =
            status.label === "EXPIRED"
              ? "#1e0e0e"
              : status.label === "SOON"
                ? "#1a1208"
                : "#0a1a12";

          return (
            <TouchableOpacity
              key={item.id}
              style={styles.medicineCard}
              onPress={() =>
                navigation.navigate("MedicineDetail", { medicine: item })
              }
              activeOpacity={0.75}
            >
              <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
                <PillLogo
                  size={12}
                  colorLeft={pillLeft}
                  colorRight={pillRight}
                  rotate="-35deg"
                />
              </View>

              <View style={styles.cardInfo}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.cardSub}>{item.quantity} units left</Text>
              </View>

              <View style={styles.cardRight}>
                <View
                  style={[styles.statusBadge, { backgroundColor: status.bg }]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: status.textColor },
                    ]}
                  >
                    {status.label}
                  </Text>
                </View>
                <Text style={styles.expiryText}>
                  {new Date(item.expiry).toLocaleDateString("en-IN", {
                    month: "short",
                    year: "numeric",
                  })}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 110 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d0f",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
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

  screenTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#9b8fff",
    paddingHorizontal: 20,
    marginBottom: 16,
  },

  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 14,
  },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#161620",
    borderWidth: 1,
    borderColor: "#222230",
  },
  filterTabActive: {
    backgroundColor: "#9b8fff",
    borderColor: "#9b8fff",
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#555568",
    letterSpacing: 0.3,
  },
  filterTabTextActive: { color: "#ffffff" },
  filterCount: {
    backgroundColor: "#222230",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  filterCountActive: { backgroundColor: "rgba(255,255,255,0.25)" },
  filterCountText: { fontSize: 10, fontWeight: "700", color: "#555568" },
  filterCountTextActive: { color: "#ffffff" },

  searchRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 14,
    alignItems: "center",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161620",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#222230",
  },
  searchInput: { flex: 1, fontSize: 14, color: "#ffffff" },
  addBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#9b8fff",
    alignItems: "center",
    justifyContent: "center",
  },

  listContent: {
    paddingHorizontal: 20,
    gap: 8,
  },

  medicineCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161620",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#1e1e2e",
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: { flex: 1 },
  cardName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
    marginBottom: 3,
  },
  cardSub: { fontSize: 12, color: "#555568" },
  cardRight: { alignItems: "flex-end", gap: 4 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusBadgeText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  expiryText: { fontSize: 11, color: "#555568" },

  emptyState: { alignItems: "center", paddingTop: 60 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubText: { fontSize: 13, color: "#555568", textAlign: "center" },
});
