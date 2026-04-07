import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { useState } from "react";
import { updateMedicine } from "../data/storage";
import { scheduleMedicineAlerts } from "../data/notifications";
import * as Haptics from "expo-haptics";

export default function EditMedicineScreen({ navigation, route }) {
  const { medicine } = route.params;

  const [name, setName] = useState(medicine.name);
  const [expiry, setExpiry] = useState(medicine.expiry);
  const [quantity, setQuantity] = useState(medicine.quantity.toString());
  const [loading, setLoading] = useState(false);

  async function handleUpdate() {
    if (!name.trim()) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Missing Info", "Please enter medicine name");
      return;
    }
    if (!expiry.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(expiry)) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Invalid Date",
        "Please enter date in YYYY-MM-DD format\ne.g. 2026-12-01",
      );
      return;
    }
    if (!quantity.trim()) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Missing Info", "Please enter quantity");
      return;
    }

    setLoading(true);

    const updatedMedicine = {
      id: medicine.id,
      name: name.trim(),
      expiry: expiry.trim(),
      quantity: parseInt(quantity),
    };

    // Save first — fast
    await updateMedicine(updatedMedicine);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Reschedule notifications in background — don't await
    scheduleMedicineAlerts(updatedMedicine).catch(console.log);

    setLoading(false);
    navigation.goBack();
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Edit Medicine</Text>
      <Text style={styles.pageSubtitle}>Update the details below</Text>

      <View style={styles.formCard}>
        <Text style={styles.label}>
          <FontAwesome5 name="pills" size={12} color="#8888aa" /> Medicine Name
        </Text>
        <TextInput
          style={styles.input}
          placeholderTextColor="#555570"
          value={name}
          onChangeText={setName}
        />

        <View style={styles.divider} />

        <Text style={styles.label}>
          <Ionicons name="calendar-outline" size={13} color="#8888aa" /> Expiry
          Date
        </Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#555570"
          value={expiry}
          onChangeText={setExpiry}
        />

        <View style={styles.divider} />

        <Text style={styles.label}>
          <Ionicons name="calculator-outline" size={13} color="#8888aa" />{" "}
          Quantity
        </Text>
        <TextInput
          style={styles.input}
          placeholderTextColor="#555570"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
        />
      </View>

      <TouchableOpacity
        style={[styles.saveButtonWrapper, loading && { opacity: 0.6 }]}
        onPress={handleUpdate}
        disabled={loading}
        activeOpacity={0.85}
      >
        <View style={styles.saveButton}>
          <Text style={styles.saveButtonText}>
            {loading ? "Saving..." : "Update Medicine"}
          </Text>
        </View>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d0d",
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  pageTitle: {
    fontSize: 26,
    fontFamily: "Inter_800ExtraBold",
    color: "#ffffff",
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#8888aa",
    marginBottom: 28,
  },
  formCard: {
    backgroundColor: "#161616",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#222222",
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#8888aa",
    marginBottom: 8,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: "#0d0d0d",
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: "#ffffff",
    marginBottom: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#2a2a38",
    marginVertical: 14,
  },
  saveButtonWrapper: {
    marginTop: 20,
    marginBottom: 40,
    borderRadius: 16,
    shadowColor: "#000000",
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
  saveButton: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#000000",
    fontSize: 16,
    fontFamily: "Inter_800ExtraBold",
    letterSpacing: 0.5,
  },
});
