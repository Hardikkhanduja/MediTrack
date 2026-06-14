import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
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
  return diffDays;
}

function getDayLabel(diffDays) {
  if (diffDays < 0) return `${Math.abs(diffDays)}d ago`;
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return `In ${diffDays} days`;
}

function getDayLabelColor(diffDays) {
  if (diffDays < 0) return "#e05555";
  if (diffDays <= 7) return "#c9940a";
  return "#666680";
}

function MedicineIconBox({ status }) {
  const bgColor = status < 0 ? "#2a1515" : status <= 7 ? "#251d08" : "#131320";
  const pillLeft = status < 0 ? "#c94444" : status <= 7 ? "#b87c10" : "#6060b0";
  const pillRight =
    status < 0 ? "#6a1e1e" : status <= 7 ? "#6a4208" : "#303060";

  return (
    <View style={[styles.iconBox, { backgroundColor: bgColor }]}>
      <PillLogo
        size={14}
        colorLeft={pillLeft}
        colorRight={pillRight}
        rotate="-35deg"
      />
    </View>
  );
}

export default function NotificationScreen({ navigation }) {
  const [medicines, setMedicines] = useState([]);
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

  const sorted = [...medicines].sort(
    (a, b) => new Date(a.expiry) - new Date(b.expiry),
  );

  const pastDue = sorted.filter((m) => getStatus(m.expiry) < 0);
  const thisWeek = sorted.filter((m) => {
    const d = getStatus(m.expiry);
    return d >= 0 && d <= 7;
  });
  const later = sorted.filter((m) => getStatus(m.expiry) > 7);

  function SectionHeader({ dot, title, count }) {
    return (
      <View style={styles.sectionHeader}>
        <View style={[styles.sectionDot, { backgroundColor: dot }]} />
        <Text style={styles.sectionTitle}>
          {title} ({count})
        </Text>
      </View>
    );
  }

  function MedicineNotifCard({ item }) {
    const diffDays = getStatus(item.expiry);
    const label = getDayLabel(diffDays);
    const labelColor = getDayLabelColor(diffDays);

    return (
      <TouchableOpacity
        style={styles.notifCard}
        onPress={() =>
          navigation.navigate("MedicineDetail", { medicine: item })
        }
        activeOpacity={0.75}
      >
        <MedicineIconBox status={diffDays} />
        <View style={styles.cardInfo}>
          <Text style={styles.cardName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.cardSub}>{item.quantity} units left</Text>
        </View>
        <Text style={[styles.cardLabel, { color: labelColor }]}>{label}</Text>
      </TouchableOpacity>
    );
  }

  const isEmpty = medicines.length === 0;

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
        <View style={styles.bellBtn}>
          <Ionicons name="notifications" size={20} color="#9b8fff" />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.screenTitle}>Notifications</Text>

        {isEmpty && (
          <View style={styles.emptyState}>
            <Ionicons
              name="notifications-off-outline"
              size={48}
              color="#2a2a38"
              style={{ marginBottom: 16 }}
            />
            <Text style={styles.emptyTitle}>No notifications</Text>
            <Text style={styles.emptySubText}>
              Add medicines to get expiry alerts
            </Text>
          </View>
        )}

        {pastDue.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              dot="#e05555"
              title="Past Due"
              count={pastDue.length}
            />
            <View style={styles.cardGroup}>
              {pastDue.map((item) => (
                <MedicineNotifCard key={item.id} item={item} />
              ))}
            </View>
          </View>
        )}

        {thisWeek.length > 0 && (
          <View style={styles.section}>
            <SectionHeader
              dot="#c9940a"
              title="This Week"
              count={thisWeek.length}
            />
            <View style={styles.cardGroup}>
              {thisWeek.map((item) => (
                <MedicineNotifCard key={item.id} item={item} />
              ))}
            </View>
          </View>
        )}

        {later.length > 0 && (
          <View style={styles.section}>
            <SectionHeader dot="#3a3a52" title="Later" count={later.length} />
            <View style={styles.cardGroup}>
              {later.map((item) => {
                const diffDays = getStatus(item.expiry);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.laterCard}
                    onPress={() =>
                      navigation.navigate("MedicineDetail", { medicine: item })
                    }
                    activeOpacity={0.75}
                  >
                    <View style={styles.laterCardTop}>
                      <View style={styles.iconBoxLater}>
                        <PillLogo
                          size={14}
                          colorLeft="#6060b0"
                          colorRight="#303060"
                          rotate="-35deg"
                        />
                      </View>
                      <Text style={styles.laterTag}>
                        {diffDays > 30 ? "UPCOMING" : `IN ${diffDays} DAYS`}
                      </Text>
                    </View>
                    <Text style={styles.laterName}>{item.name}</Text>
                    <Text style={styles.laterSub}>
                      Expires{" "}
                      {new Date(item.expiry).toLocaleDateString("en-IN", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        <View style={{ height: 110 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d0d0f" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
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
    marginBottom: 20,
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

  scrollContent: { paddingHorizontal: 20, paddingTop: 20 },

  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  sectionDot: { width: 10, height: 10, borderRadius: 5 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",  
    color: "#ccccdd",  
  },

  cardGroup: {
    backgroundColor: "#161620",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222230",
    overflow: "hidden",
  },

  notifCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,  
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1e1e2e",
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: { flex: 1 },
  cardName: {
    fontSize: 14,
    fontWeight: "500",  
    color: "#e0e0f0", 
    marginBottom: 3,
  },
  cardSub: {
    fontSize: 12,
    fontWeight: "400",
    color: "#555568",
  },
  cardLabel: {
    fontSize: 12, 
    fontWeight: "500", 
  },

  laterCard: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1e1e2e",
  },
  laterCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  iconBoxLater: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#131320",
    alignItems: "center",
    justifyContent: "center",
  },
  laterTag: {
    fontSize: 10,
    fontWeight: "600",  
    color: "#555568",  
    letterSpacing: 0.8,
  },
  laterName: {
    fontSize: 14,  
    fontWeight: "500", 
    color: "#e0e0f0",
    marginBottom: 4,
  },
  laterSub: {
    fontSize: 12,
    fontWeight: "400",
    color: "#555568",
  },

  emptyState: { alignItems: "center", paddingTop: 60 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#ccccdd",
    marginBottom: 8,
  },
  emptySubText: { fontSize: 13, color: "#555568", textAlign: "center" },
});
