import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Modal,
  LayoutAnimation,
  ScrollView,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useState, useCallback, useRef } from "react";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getMedicines, deleteMedicine } from "../data/storage";
import { cancelMedicineAlerts } from "../data/notifications";
import * as Haptics from "expo-haptics";
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

function getFormattedDate() {
  const now = new Date();
  return now.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

const GREETINGS = [
  "Your Health, Your Priority",
  "Stay Safe, Stay Informed",
  "Track Today, Thrive Tomorrow",
  "Medicine Done Right",
  "Know What You Take",
  "Your Wellness Journey",
  "One Day at a Time",
];

function getDailyGreeting() {
  const dayOfYear = Math.floor(
    (new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000,
  );
  return GREETINGS[dayOfYear % GREETINGS.length];
}

function getTodayKey() {
  const d = new Date();
  return `taken_all_${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function MedicinePillIcon({ status }) {
  const leftColor =
    status.label === "EXPIRED"
      ? "#c94444"
      : status.label === "SOON"
        ? "#b87c10"
        : "#2a9060";
  const rightColor =
    status.label === "EXPIRED"
      ? "#6a1e1e"
      : status.label === "SOON"
        ? "#6a4208"
        : "#145030";
  const bgColor =
    status.label === "EXPIRED"
      ? "#1e0e0e"
      : status.label === "SOON"
        ? "#1a1208"
        : "#0a1a12";

  return (
    <View style={[styles.cardIconCircle, { backgroundColor: bgColor }]}>
      <PillLogo
        size={14}
        colorLeft={leftColor}
        colorRight={rightColor}
        rotate="-35deg"
      />
    </View>
  );
}

// Animated checkmark button — unified press spring
function CheckButton({ isTaken, onPress }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const rippleAnim = useRef(new Animated.Value(0)).current;

  function handlePress() {
    if (!isTaken) {
      rippleAnim.setValue(0);
      Animated.parallel([
        Animated.timing(rippleAnim, {
          toValue: 1,
          duration: 380,
          easing: EASE.out,
          useNativeDriver: true,
        }),
        pressAnimation(scaleAnim, 0.88),
      ]).start();
    } else {
      pressAnimation(scaleAnim, 0.92).start();
    }
    onPress();
  }

  const rippleScale = rippleAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.2],
  });
  const rippleOpacity = rippleAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.4, 0.2, 0],
  });

  return (
    <View style={styles.checkBtnWrapper}>
      {/* Ripple ring — only visible when marking as taken */}
      {!isTaken && (
        <Animated.View
          style={[
            styles.rippleRing,
            {
              transform: [{ scale: rippleScale }],
              opacity: rippleOpacity,
            },
          ]}
        />
      )}
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <TouchableOpacity
          style={[styles.checkBtn, isTaken && styles.checkBtnActive]}
          onPress={handlePress}
          activeOpacity={0.8}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={isTaken ? "checkmark" : "checkmark-outline"}
            size={20}
            color={isTaken ? "#ffffff" : "#444458"}
          />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

export default function HomeScreen({ navigation }) {
  const layout = useLayout();
  const {
    contentPadding,
    maxContentWidth,
    urgentCardWidth,
    useTwoColumnCards,
    twoColCardWidth,
    fabRight,
    fabBottom,
    isTablet,
    fs,
  } = layout;

  const [medicines, setMedicines] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteModalVisible, setDeleteModal] = useState(false);
  const [medicineToDelete, setMedicineToDelete] = useState(null);
  const [takenMap, setTakenMap] = useState({});
  const [reminderMap, setReminderMap] = useState({});

  // Screen entrance
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;
  const fabScale = useRef(new Animated.Value(0)).current;
  const fabOpacity = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      // Screen entrance on every focus
      fadeAnim.setValue(0);
      slideAnim.setValue(12);
      fabScale.setValue(0);
      fabOpacity.setValue(0);
      entranceAnimation(fadeAnim, slideAnim).start();

      loadMedicines();
      loadTakenStatus();
    }, []),
  );

  async function loadMedicines() {
    const data = await getMedicines();

    const reminderStatusMap = {};
    for (const medicine of data) {
      try {
        const stored = await AsyncStorage.getItem(`reminders_${medicine.id}`);
        const reminders = stored ? JSON.parse(stored) : [];
        reminderStatusMap[medicine.id] = reminders.length > 0;
      } catch (e) {
        reminderStatusMap[medicine.id] = false;
      }
    }

    setReminderMap(reminderStatusMap);
    setMedicines(data);

    // Animate FAB in after data loads
    if (data.length > 0) {
      Animated.parallel([
        Animated.spring(fabScale, {
          toValue: 1,
          friction: 6,
          tension: 140,
          useNativeDriver: true,
        }),
        Animated.timing(fabOpacity, {
          toValue: 1,
          duration: DURATION.normal,
          easing: EASE.out,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }

  async function loadTakenStatus() {
    try {
      const stored = await AsyncStorage.getItem(getTodayKey());
      setTakenMap(stored ? JSON.parse(stored) : {});
    } catch (e) {
      setTakenMap({});
    }
  }

  async function handleMarkTaken(item) {
    const isTaken = !!takenMap[item.id];

    try {
      if (isTaken) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        const updated = { ...takenMap };

        delete updated[item.id];

        setTakenMap(updated);

        await AsyncStorage.setItem(getTodayKey(), JSON.stringify(updated));

        const currentStreak =
          parseInt(await AsyncStorage.getItem(`streak_${item.id}`)) || 0;

        await AsyncStorage.setItem(
          `streak_${item.id}`,
          String(Math.max(0, currentStreak - 1)),
        );

        await AsyncStorage.removeItem(`takenTime_${item.id}`);

        return;
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const updated = {
        ...takenMap,
        [item.id]: true,
      };

      setTakenMap(updated);

      await AsyncStorage.setItem(getTodayKey(), JSON.stringify(updated));

      const now = new Date();

      const timeStr = now.toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      await AsyncStorage.setItem(`takenTime_${item.id}`, timeStr);

      const yesterday = new Date();

      yesterday.setDate(yesterday.getDate() - 1);

      const yKey = `taken_all_${yesterday.getFullYear()}-${
        yesterday.getMonth() + 1
      }-${yesterday.getDate()}`;

      const yStored = await AsyncStorage.getItem(yKey);

      const yMap = yStored ? JSON.parse(yStored) : {};

      const takenYesterday = !!yMap[item.id];

      const currentStreak =
        parseInt(await AsyncStorage.getItem(`streak_${item.id}`)) || 0;

      const newStreak = takenYesterday ? currentStreak + 1 : 1;

      await AsyncStorage.setItem(`streak_${item.id}`, String(newStreak));
    } catch (e) {
      console.log("Error updating medicine status", e);
    }
  }

  const sorted = [...medicines].sort((a, b) => {
    const order = { EXPIRED: 0, SOON: 1, SAFE: 2 };
    const sa = order[getStatus(a.expiry).label];
    const sb = order[getStatus(b.expiry).label];
    if (sa !== sb) return sa - sb;
    return new Date(a.expiry) - new Date(b.expiry);
  });

  const filtered = searchQuery.trim()
    ? sorted.filter((m) =>
        m.name.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : sorted;

  const expiredList = sorted.filter(
    (m) => getStatus(m.expiry).label === "EXPIRED",
  );
  const soonList = sorted.filter((m) => getStatus(m.expiry).label === "SOON");
  const expiredCount = expiredList.length;
  const soonCount = soonList.length;
  const safeCount = sorted.filter(
    (m) => getStatus(m.expiry).label === "SAFE",
  ).length;

  // Low-stock list: non-expired medicines with quantity <= 5
  const lowStockList = sorted.filter((m) => {
    const expStatus = getStatus(m.expiry);
    return expStatus.label !== "EXPIRED" && getStockStatus(m.quantity).isLow;
  });

  async function handleDeletePress(item) {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMedicineToDelete(item);
    setDeleteModal(true);
  }

  async function confirmDelete() {
    if (!medicineToDelete) return;
    setDeleteModal(false);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await cancelMedicineAlerts(medicineToDelete.id);
    await deleteMedicine(medicineToDelete.id);
    configureLayoutTransition();
    const updated = await getMedicines();
    setMedicines(updated);
    setMedicineToDelete(null);
  }

  const isEmpty = medicines.length === 0;

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
          contentContainerStyle={{ paddingBottom: 110 }}
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
            {/* Header */}
            <View
              style={[styles.header, { paddingHorizontal: contentPadding }]}
            >
              <View style={styles.headerLeft}>
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
                style={styles.bellBtn}
                onPress={() => navigation.navigate("Notifications")}
              >
                <Ionicons
                  name="notifications-outline"
                  size={20}
                  color="#aaaacc"
                />
              </TouchableOpacity>
            </View>

            {/* Date + Title */}
            <View
              style={[
                styles.titleSection,
                { paddingHorizontal: contentPadding },
              ]}
            >
              <Text style={styles.dateText}>{getFormattedDate()}</Text>
              <Text style={[styles.mainTitle, { fontSize: fs(28, 32) }]}>
                {getDailyGreeting()}
              </Text>
            </View>

            {/* Search Bar */}
            <View
              style={[styles.searchBar, { marginHorizontal: contentPadding }]}
            >
              <Ionicons
                name="search-outline"
                size={16}
                color="#555568"
                style={{ marginRight: 8 }}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Search your medicines..."
                placeholderTextColor="#555568"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={16} color="#555568" />
                </TouchableOpacity>
              )}
            </View>

            {/* Empty State */}
            {isEmpty && (
              <View
                style={[
                  styles.emptyState,
                  isTablet && { paddingHorizontal: 60 },
                ]}
              >
                <View style={styles.emptyCardWrapper}>
                  <View style={styles.emptyCard}>
                    <View style={styles.emptyCardGlow} />
                    <View style={styles.emptyPillCircle}>
                      <PillLogo
                        size={28}
                        colorLeft="#9b8fff"
                        colorRight="#4b4ba3"
                        rotate="-20deg"
                      />
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.emptyBadgeTR}
                    onPress={() => navigation.navigate("AddMedicine")}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="medkit-outline" size={18} color="#d4780a" />
                  </TouchableOpacity>
                  <View style={styles.emptyBadgeBL}>
                    <Ionicons name="person-outline" size={16} color="#d4780a" />
                  </View>
                </View>
                <Text style={styles.emptyTitle}>No medicines added yet</Text>
                <Text style={styles.emptySubText}>
                  Scan your first medicine to begin tracking your prescriptions
                  and health metrics effortlessly.
                </Text>
                <TouchableOpacity
                  style={styles.scanCTA}
                  onPress={() => navigation.navigate("AddMedicine")}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="scan-outline"
                    size={16}
                    color="#fff"
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.scanCTAText}>Scan Medicine</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => navigation.navigate("AddMedicine")}
                >
                  <Text style={styles.addManuallyText}>ADD MANUALLY</Text>
                </TouchableOpacity>
              </View>
            )}

            {!isEmpty && (
              <>
                {/* Expiring Soon */}
                {soonList.length > 0 && (
                  <View style={styles.section}>
                    <View
                      style={[
                        styles.sectionHeader,
                        { paddingHorizontal: contentPadding },
                      ]}
                    >
                      <Ionicons
                        name="warning-outline"
                        size={15}
                        color="#c9940a"
                      />
                      <Text style={styles.soonTitle}>
                        Expiring Soon ({soonList.length})
                      </Text>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={[
                        styles.horizontalScroll,
                        { paddingHorizontal: contentPadding },
                      ]}
                    >
                      {soonList.map((item) => {
                        const status = getStatus(item.expiry);
                        return (
                          <View
                            key={item.id}
                            style={[
                              styles.urgentCard,
                              { width: urgentCardWidth },
                            ]}
                          >
                            <View style={styles.urgentAccent} />
                            <View style={styles.urgentBody}>
                              <View style={styles.urgentTop}>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.urgentName}>
                                    {item.name}
                                  </Text>
                                  <Text style={styles.urgentDays}>
                                    Expires in {status.days} days
                                  </Text>
                                </View>
                                <View style={styles.urgentPillWrapper}>
                                  <PillLogo
                                    size={14}
                                    colorLeft="#555570"
                                    colorRight="#333348"
                                    rotate="-35deg"
                                  />
                                </View>
                              </View>
                              <TouchableOpacity
                                style={styles.useFirstBtn}
                                onPress={() =>
                                  navigation.navigate("MedicineDetail", {
                                    medicine: item,
                                    isTaken: !!takenMap[item.id],
                                  })
                                }
                                activeOpacity={0.75}
                              >
                                <Text style={styles.useFirstText}>
                                  Use First
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* Expired Banner */}
                {expiredCount > 0 && (
                  <TouchableOpacity
                    style={[
                      styles.expiredBanner,
                      { marginHorizontal: contentPadding },
                    ]}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="warning-outline"
                      size={15}
                      color="#e05555"
                    />
                    <View style={{ marginLeft: 10 }}>
                      <Text style={styles.expiredBannerTitle}>
                        {expiredCount} Medicine{expiredCount > 1 ? "s" : ""} are
                        EXPIRED!
                      </Text>
                      <Text style={styles.expiredBannerSub}>
                        Tap to Review & Remove
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                {/* Stats Row */}
                <View
                  style={[
                    styles.statsRow,
                    { paddingHorizontal: contentPadding },
                  ]}
                >
                  <View style={styles.statBox}>
                    <View
                      style={[
                        styles.statTopLine,
                        { backgroundColor: "#e05555" },
                      ]}
                    />
                    <Text style={styles.statLabel}>EXPIRED</Text>
                    <Text style={[styles.statNumber, { color: "#e05555" }]}>
                      {String(expiredCount).padStart(2, "0")}
                    </Text>
                  </View>
                  <View style={styles.statBox}>
                    <View
                      style={[
                        styles.statTopLine,
                        { backgroundColor: "#c9940a" },
                      ]}
                    />
                    <Text style={styles.statLabel}>SOON</Text>
                    <Text style={[styles.statNumber, { color: "#c9940a" }]}>
                      {String(soonCount).padStart(2, "0")}
                    </Text>
                  </View>
                  <View style={styles.statBox}>
                    <View
                      style={[
                        styles.statTopLine,
                        { backgroundColor: "#2ea86e" },
                      ]}
                    />
                    <Text style={styles.statLabel}>SAFE</Text>
                    <Text style={[styles.statNumber, { color: "#2ea86e" }]}>
                      {String(safeCount).padStart(2, "0")}
                    </Text>
                  </View>
                </View>

                {/* Running Low — only renders when exceptions exist */}
                {lowStockList.length > 0 && (
                  <View
                    style={[
                      styles.lowStockSection,
                      { marginHorizontal: contentPadding },
                    ]}
                  >
                    <View style={styles.lowStockHeader}>
                      <Ionicons name="cube-outline" size={13} color="#7a6030" />
                      <Text style={styles.lowStockTitle}>Running Low</Text>
                    </View>
                    {lowStockList.map((item) => {
                      const stock = getStockStatus(item.quantity);
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.lowStockRow}
                          onPress={() =>
                            navigation.navigate("MedicineDetail", {
                              medicine: item,
                              isTaken: !!takenMap[item.id],
                            })
                          }
                          activeOpacity={0.75}
                        >
                          <Text style={styles.lowStockName} numberOfLines={1}>
                            {item.name}
                          </Text>
                          <Text
                            style={[
                              styles.lowStockMeta,
                              { color: stock.color },
                            ]}
                          >
                            {item.quantity} left
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* All Medications */}
                <View style={styles.section}>
                  <View
                    style={[
                      styles.allMedsHeader,
                      { paddingHorizontal: contentPadding },
                    ]}
                  >
                    <Text
                      style={[styles.allMedsTitle, { fontSize: fs(20, 22) }]}
                    >
                      All Medications
                    </Text>
                    <TouchableOpacity
                      onPress={() => navigation.navigate("Medication")}
                    >
                      <Ionicons
                        name="arrow-forward"
                        size={20}
                        color="#555568"
                      />
                    </TouchableOpacity>
                  </View>

                  {filtered.length === 0 && (
                    <View style={styles.noResults}>
                      <Ionicons
                        name="search-outline"
                        size={36}
                        color="#222230"
                        style={{ marginBottom: 10 }}
                      />
                      <Text style={styles.emptyTitle}>No results found</Text>
                      <Text style={styles.emptySubText}>
                        Try a different medicine name
                      </Text>
                    </View>
                  )}

                  {/* Two-column on tablets, single-column on phones */}
                  <View
                    style={[
                      useTwoColumnCards && {
                        flexDirection: "row",
                        flexWrap: "wrap",
                        paddingHorizontal: contentPadding,
                        gap: 12,
                      },
                    ]}
                  >
                    {filtered.map((item) => {
                      const status = getStatus(item.expiry);
                      const isTaken = !!takenMap[item.id];

                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[
                            styles.medicineCard,
                            isTaken && styles.medicineCardTaken,
                            useTwoColumnCards && {
                              width: twoColCardWidth,
                              borderRadius: 12,
                              borderWidth: 1,
                              borderColor: "#1a1a2a",
                              borderBottomWidth: 1,
                              paddingHorizontal: 14,
                            },
                          ]}
                          onPress={() =>
                            navigation.navigate("MedicineDetail", {
                              medicine: item,
                              isTaken: !!takenMap[item.id],
                            })
                          }
                          onLongPress={() => handleDeletePress(item)}
                          activeOpacity={0.75}
                        >
                          <View style={{ opacity: isTaken ? 0.45 : 1 }}>
                            <MedicinePillIcon status={status} />
                          </View>
                          <View style={styles.cardInfo}>
                            <Text
                              style={[
                                styles.cardName,
                                isTaken && styles.cardNameTaken,
                              ]}
                              numberOfLines={1}
                            >
                              {item.name}
                            </Text>
                            {(() => {
                              // Sub-text logic: taken > stock exception > healthy default
                              if (isTaken) {
                                return (
                                  <Text
                                    style={[
                                      styles.cardSub,
                                      styles.cardSubTaken,
                                    ]}
                                  >
                                    ✓ Taken today
                                  </Text>
                                );
                              }
                              if (!reminderMap[item.id]) {
                                return (
                                  <Text
                                    style={[
                                      styles.cardSub,
                                      styles.expiryOnlyText,
                                    ]}
                                  >
                                    Expiry monitored
                                  </Text>
                                );
                              }
                              const stock = getStockStatus(item.quantity);
                              if (stock.isLow) {
                                return (
                                  <Text
                                    style={[
                                      styles.cardSub,
                                      { color: stock.color },
                                    ]}
                                  >
                                    {stock.label}
                                  </Text>
                                );
                              }
                              return (
                                <Text style={styles.cardSub}>
                                  {item.quantity} units left
                                </Text>
                              );
                            })()}
                          </View>
                          {reminderMap[item.id] ? (
                            <CheckButton
                              isTaken={isTaken}
                              onPress={() => handleMarkTaken(item)}
                            />
                          ) : (
                            <View style={styles.passiveChip}>
                              <Text style={styles.passiveChipText}>
                                TRACKED
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </>
            )}
          </View>
          {/* end contentContainer */}
        </ScrollView>
      </Animated.View>

      {/* Floating Add Button */}
      {!isEmpty && (
        <Animated.View
          style={[
            styles.fabWrapper,
            { bottom: fabBottom, right: fabRight },
            { opacity: fabOpacity, transform: [{ scale: fabScale }] },
          ]}
        >
          <TouchableOpacity
            style={styles.fab}
            onPress={() => navigation.navigate("AddMedicine")}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={28} color="#ffffff" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Delete Modal */}
      <Modal
        animationType="fade"
        transparent
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalBox,
              isTablet && { maxWidth: 420, width: "60%" },
            ]}
          >
            <Text style={styles.modalText}>
              Are you sure you want to remove the medicine?
            </Text>
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setDeleteModal(false)}
              >
                <Text style={styles.cancelBtnText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={confirmDelete}
              >
                <Text style={styles.removeBtnText}>REMOVE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0d0d0f" },
  screenWrapper: { flex: 1 },
  // Centered content wrapper — maxWidth applied inline from layout hook
  contentContainer: { flex: 1 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
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

  titleSection: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 18 },
  dateText: { fontSize: 13, color: "#66667a", marginBottom: 6 },
  mainTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#9b8fff",
    letterSpacing: 0.1,
  },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161620",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginHorizontal: 20,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: "#222230",
  },
  searchInput: { flex: 1, fontSize: 14, color: "#ffffff" },

  emptyState: { alignItems: "center", paddingHorizontal: 28, paddingTop: 10 },
  emptyCardWrapper: {
    width: 220,
    height: 220,
    marginBottom: 32,
    position: "relative",
  },
  emptyCard: {
    width: 200,
    height: 200,
    borderRadius: 40,
    backgroundColor: "#111118",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#1e1e2a",
  },
  emptyCardGlow: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#9b8fff0a",
  },
  emptyPillCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#1e1e2e",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#2a2a3e",
  },
  emptyBadgeTR: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#1e1a10",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#2a2010",
  },
  emptyBadgeBL: {
    position: "absolute",
    bottom: 10,
    left: 0,
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#1e1a10",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#2a2010",
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 12,
    textAlign: "center",
    lineHeight: 32,
  },
  emptySubText: {
    fontSize: 14,
    color: "#555568",
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 28,
  },
  scanCTA: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#9b8fff",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 32,
    marginBottom: 16,
    width: "100%",
    justifyContent: "center",
  },
  scanCTAText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  addManuallyText: {
    fontSize: 12,
    color: "#555568",
    fontWeight: "600",
    letterSpacing: 1.5,
  },

  section: { marginBottom: 18 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 7,
  },
  soonTitle: { fontSize: 15, fontWeight: "700", color: "#c9940a" },

  allMedsHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  allMedsTitle: { fontSize: 20, fontWeight: "800", color: "#ffffff", flex: 1 },

  horizontalScroll: { paddingHorizontal: 20, gap: 12 },
  urgentCard: {
    // width applied inline from layout.urgentCardWidth
    backgroundColor: "#161620",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#222230",
    flexDirection: "row",
    overflow: "hidden",
  },
  urgentAccent: { width: 4, backgroundColor: "#e05555" },
  urgentBody: { flex: 1, padding: 14 },
  urgentTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  urgentName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 5,
  },
  urgentDays: { fontSize: 12, color: "#e05555", fontWeight: "600" },
  urgentPillWrapper: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  useFirstBtn: {
    backgroundColor: "#222230",
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  useFirstText: { color: "#ffffff", fontSize: 13, fontWeight: "700" },

  expiredBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e1010",
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#3a1818",
  },
  expiredBannerTitle: { fontSize: 13, fontWeight: "700", color: "#e05555" },
  expiredBannerSub: {
    fontSize: 11,
    color: "#886666",
    marginTop: 2,
    fontStyle: "italic",
  },

  statsRow: { flexDirection: "row", paddingHorizontal: 20, marginBottom: 28 },
  statBox: { flex: 1, paddingTop: 10, paddingRight: 8 },
  statTopLine: { height: 2, borderRadius: 1, marginBottom: 8, width: "55%" },
  statLabel: {
    fontSize: 10,
    color: "#555568",
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 4,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: 1,
    lineHeight: 38,
  },

  medicineCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1a1a2a",
  },
  medicineCardTaken: {
    backgroundColor: "#080f0b",
  },
  cardIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  cardInfo: { flex: 1 },
  cardName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 4,
  },
  cardNameTaken: { color: "#666670" },
  cardSub: { fontSize: 12, color: "#555568" },
  cardSubTaken: { color: "#36b978" },

  // Checkmark button + ripple
  checkBtnWrapper: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  rippleRing: {
    position: "absolute",
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 2,
    borderColor: "#2ea86e",
    backgroundColor: "transparent",
  },
  checkBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: "#2a2a3a",
    alignItems: "center",
    justifyContent: "center",
  },
  checkBtnActive: {
    backgroundColor: "#2ea86e",
    borderColor: "#2ea86e",
  },

  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#9b8fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#9b8fff",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabWrapper: {
    position: "absolute",
    bottom: 100,
    right: 20,
  },
  noResults: { alignItems: "center", paddingVertical: 32 },

  // Running Low section
  lowStockSection: {
    backgroundColor: "#111108",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2010",
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
  },
  lowStockHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  lowStockTitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#7a6030",
    letterSpacing: 1,
  },
  lowStockRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 5,
  },
  lowStockName: {
    fontSize: 13,
    fontWeight: "500",
    color: "#aaaabc",
    flex: 1,
    marginRight: 12,
  },
  lowStockMeta: {
    fontSize: 12,
    fontWeight: "600",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 50,
  },
  modalBox: {
    backgroundColor: "#1a1a24",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    borderWidth: 1,
    borderColor: "#2a2a38",
  },
  modalText: {
    fontSize: 14,
    color: "#ccccdd",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 18,
  },
  modalBtns: { flexDirection: "row", gap: 10 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#2a2a38",
    borderWidth: 1,
    borderColor: "#3a3a50",
  },
  cancelBtnText: {
    color: "#aaaacc",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  removeBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#aa2222",
  },
  removeBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  expiryOnlyText: {
    color: "#7a7a92",
    fontWeight: "500",
  },

  passiveChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "#101018",
    borderWidth: 1,
    borderColor: "#1d1d2b",
  },

  passiveChipText: {
    color: "#74748a",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
});
