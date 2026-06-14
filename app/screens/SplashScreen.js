import { View, Text, StyleSheet} from "react-native";
import { useEffect} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import PillLogo from "../components/PillLogo";

export default function SplashScreen({ navigation }) {


  useEffect(() => {
     async function navigate() {
      try {
        await new Promise((res) => setTimeout(res, 1500));
        const hasOnboarded = await AsyncStorage.getItem("hasOnboarded");
        if (hasOnboarded) {
          navigation.replace("Main");
        } else {
          navigation.replace("Onboarding");
        }
      } catch (e) {
        navigation.replace("Onboarding");
      }
    }
    navigate();
  }, [navigation]);

  return (
    <View style={styles.container}>
      {/* Center Content */}
      <View style={styles.center}>
        {/* Pill icon with glow */}
        <View style={styles.glowOuter}>

          <View style={styles.glowInner}>
            <View style={styles.iconWrapper}>
              <PillLogo
                size={34}
                colorLeft="#9b8fff"
                colorRight="#4b4ba3"
                rotate="-20deg"
              />
            </View>
          </View>
        </View>

        <Text style={styles.title}>MediTrack</Text>
        <Text style={styles.tagline}>Track medicines. Stay safe.</Text>
      </View>

      {/* Bottom text */}
      <Text style={styles.bottom}>— PRIVATE. OFFLINE. SECURE. —</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d0d",
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    alignItems: "center",
  },

  // Glow layers around icon
  glowOuter: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#9b8fff08",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  glowInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#9b8fff12",
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapper: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "#1e1e2e",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#2a2a40",
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 0.3,
    marginTop: 8,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    color: "#8888aa",
    letterSpacing: 0.2,
    fontWeight: "400",
  },
  bottom: {
    position: "absolute",
    bottom: 48,
    fontSize: 10,
    color: "#333344",
    letterSpacing: 2.5,
    fontWeight: "600",
  },
});
