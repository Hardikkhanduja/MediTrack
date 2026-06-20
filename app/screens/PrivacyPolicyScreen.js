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

export default function PrivacyPolicyScreen({ navigation }) {
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
          Privacy Policy
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

          <Text style={styles.heading}>Information We Store</Text>
          <Text style={styles.body}>
            MediTrack stores medicine information such as medicine names, expiry
            dates, quantities, reminder schedules, and family member assignments
            on your device.
          </Text>

          <Text style={styles.heading}>Camera Usage</Text>
          <Text style={styles.body}>
            Camera access is used only when you choose to scan medicine
            packaging. Images are processed solely to identify medicine details.
          </Text>

          <Text style={styles.heading}>Notifications</Text>
          <Text style={styles.body}>
            Notification permissions are used to send medicine reminders and
            expiry alerts that you configure within the app.
          </Text>

          <Text style={styles.heading}>AI Medicine Scanning</Text>
          <Text style={styles.body}>
            When you use the medicine scanning feature, images may be sent to
            Google's Gemini AI service to extract medicine information. These
            images are used only for processing your scan request.
          </Text>

          <Text style={styles.heading}>Data Storage</Text>
          <Text style={styles.body}>
            MediTrack currently stores your data locally on your device. No
            account is required and your medicine records are not synced to a
            cloud service by MediTrack.
          </Text>

          <Text style={styles.heading}>Third-Party Services</Text>
          <Text style={styles.body}>
            MediTrack uses Google Gemini for medicine image analysis. Usage of
            that service is subject to Google's policies.
          </Text>

          <Text style={styles.heading}>Contact</Text>
          <Text style={styles.body}>
            If you have questions regarding this Privacy Policy, please contact
            the MediTrack development team.
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
