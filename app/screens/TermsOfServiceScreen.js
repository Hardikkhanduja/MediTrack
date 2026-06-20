import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TermsOfServiceScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#05060A" }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 24,
          paddingTop: insets.top + 12,
          marginBottom: 24,
        }}
      >
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#A78BFA" />
        </TouchableOpacity>

        <Text
          style={{
            color: "#A78BFA",
            fontSize: 34,
            fontWeight: "700",
            marginLeft: 16,
          }}
        >
          Terms of Service
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: 40,
        }}
      >
        <View
          style={{
            backgroundColor: "#111224",
            borderRadius: 24,
            padding: 24,
            borderWidth: 1,
            borderColor: "#232544",
          }}
        >
          <Text style={styles.updated}>Last Updated: June 2026</Text>

          <Text style={styles.heading}>Acceptance of Terms</Text>
          <Text style={styles.body}>
            By using MediTrack, you agree to these Terms of Service.
          </Text>

          <Text style={styles.heading}>Informational Purpose</Text>
          <Text style={styles.body}>
            MediTrack is designed to help users track medicines, reminders, and
            expiry dates. The app is intended for informational and
            organizational purposes only.
          </Text>

          <Text style={styles.heading}>Not Medical Advice</Text>
          <Text style={styles.body}>
            MediTrack does not provide medical advice, diagnosis, or treatment.
            Always consult a qualified healthcare professional regarding medical
            decisions.
          </Text>

          <Text style={styles.heading}>User Responsibility</Text>
          <Text style={styles.body}>
            Users are responsible for verifying medicine information, reminder
            schedules, quantities, and expiry dates entered into the app.
          </Text>

          <Text style={styles.heading}>AI Scan Results</Text>
          <Text style={styles.body}>
            Medicine information extracted through AI scanning may not always be
            accurate. Users should verify scanned information before relying on
            it.
          </Text>

          <Text style={styles.heading}>Limitation of Liability</Text>
          <Text style={styles.body}>
            MediTrack and its developers are not liable for losses, damages, or
            health outcomes arising from the use of the app or reliance on its
            information.
          </Text>

          <Text style={styles.heading}>Changes to Terms</Text>
          <Text style={styles.body}>
            These Terms of Service may be updated from time to time. Continued
            use of MediTrack constitutes acceptance of any future updates.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = {
  updated: {
    color: "#8B8DA8",
    fontSize: 14,
    marginBottom: 20,
  },
  heading: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 16,
  },
  body: {
    color: "#B7B8CC",
    fontSize: 16,
    lineHeight: 26,
  },
};
