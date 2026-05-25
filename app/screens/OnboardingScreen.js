import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from "react-native";
import { useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

const SLIDES = [
  {
    id: "1",
    title: "Expired medicines\nare risky",
    subtitle: "You probably have some at home right now.",
    alert: "Using outdated medication can lead to reduced efficacy or unexpected side effects.",
  },
  {
    id: "2",
    title: "Scan. Track. Relax.",
    subtitle: "Just scan your medicine strip. We'll handle expiry tracking and refill alerts for you.",
  },
  {
    id: "3",
    title: "No Login.\nNo Tracking.",
    subtitle: "Your health journey is personal.",
    subtitleAccent: "Your data stays on your device. Always.",
    feature: "Nothing is ever uploaded to our servers or the cloud.",
  },
];

function Slide1Icon() {
  return (
    <View style={s1.circleWrapper}>
      <View style={s1.dashedCircle}>
        <View style={s1.rotatedCard}>
          <View style={s1.pillWrapper}>
            <View style={s1.pill}>
              <View style={s1.pillLeft} />
              <View style={s1.pillRight} />
            </View>
          </View>
        </View>
        <View style={s1.exclamationDot}>
          <Text style={s1.exclamationText}>!</Text>
        </View>
      </View>
    </View>
  );
}

function Slide2Icon() {
  return (
    <View style={s2.wrapper}>
      <View style={s2.grid}>

        {/* Top Left — Medicine image card with green glow */}
        <View style={s2.imageCard}>
          <View style={s2.imageGlow} />
          <View style={s2.imageSurface}>
            <View style={s2.imagePillRow}>
              <View style={[s2.imagePill, { backgroundColor: "#4a9a6a" }]} />
              <View style={[s2.imagePill, { backgroundColor: "#6ab88a", width: 28 }]} />
              <View style={[s2.imagePill, { backgroundColor: "#3a7a5a", width: 20 }]} />
            </View>
            <View style={s2.imagePillRow}>
              <View style={[s2.imagePill, { backgroundColor: "#5aaa7a", width: 20 }]} />
              <View style={[s2.imagePill, { backgroundColor: "#4a9a6a", width: 32 }]} />
            </View>
          </View>
          <View style={s2.liveRow}>
            <View style={s2.liveDot} />
            <View>
              <Text style={s2.liveLabel}>LIVE RECOGNITION</Text>
              <Text style={s2.liveSub}>Detecting Batch ID...</Text>
            </View>
          </View>
        </View>

        {/* Top Right — Verified Database */}
        <View style={s2.smallCard}>
          <View style={s2.verifiedIcon}>
            <Ionicons name="checkmark-circle" size={32} color="#9b8fff" />
          </View>
          <Text style={s2.smallCardLabel}>Verified{"\n"}Database</Text>
        </View>

        {/* Bottom Left — Progress bar */}
        <View style={s2.progressCard}>
          <View style={s2.progressBar}>
            <View style={s2.progressFill} />
          </View>
          <Ionicons name="checkmark-circle" size={20} color="#4ade80" />
        </View>

        {/* Bottom Right — EXP. TRACK */}
        <View style={s2.smallCard}>
          <View style={s2.trackIcon}>
            <Ionicons name="time" size={28} color="#ff8c00" />
          </View>
          <Text style={s2.expLabel}>EXP. TRACK</Text>
          <Text style={s2.activeLabel}>Active</Text>
        </View>

      </View>
    </View>
  );
}

function Slide3Icon() {
  return (
    <View style={s3.wrapper}>
      <View style={s3.lockCard}>
        <Ionicons name="lock-closed" size={40} color="#9b8fff" />
      </View>
      <View style={s3.offlineBadge}>
        <Ionicons name="lock-closed-outline" size={10} color="#888890" />
        <Text style={s3.offlineBadgeText}>OFFLINE FIRST</Text>
      </View>
    </View>
  );
}

export default function OnboardingScreen({ navigation }) {
  const scrollRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  function handleNext() {
    if (currentIndex < SLIDES.length - 1) {
      scrollRef.current?.scrollTo({
        x: width * (currentIndex + 1),
        animated: true,
      });
      setCurrentIndex(currentIndex + 1);
    }
  }

  async function handleGetStarted() {
    await AsyncStorage.setItem("hasOnboarded", "true");
    navigation.replace("Main");
  }

  function handleSkip() {
    handleGetStarted();
  }

  const isLast = currentIndex === SLIDES.length - 1;

  return (
    <View style={styles.container}>

      {/* Skip */}
      <TouchableOpacity style={styles.skip} onPress={handleSkip}>
        <Text style={styles.skipText}>SKIP</Text>
      </TouchableOpacity>

      {/* Slides */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
      >
        {SLIDES.map((slide, index) => (
          <View key={slide.id} style={styles.slide}>

            {/* Illustration */}
            <View style={styles.illustrationArea}>
              {index === 0 && <Slide1Icon />}
              {index === 1 && <Slide2Icon />}
              {index === 2 && <Slide3Icon />}
            </View>

            {/* Text */}
            <View style={styles.textContent}>

              {index === 1 ? (
                <Text style={styles.slideTitle}>
                  Scan. Track.{" "}
                  <Text style={{ color: "#9b8fff" }}>Relax.</Text>
                </Text>
              ) : (
                <Text style={styles.slideTitle}>{slide.title}</Text>
              )}

              {index === 1 ? (
                <Text style={styles.slideSubtitle}>
                  Just scan your medicine strip. We'll handle{" "}
                  <Text style={{ color: "#ffffff", fontWeight: "700" }}>
                    expiry tracking
                  </Text>
                  {" "}and refill alerts for you.
                </Text>
              ) : (
                <Text style={styles.slideSubtitle}>{slide.subtitle}</Text>
              )}

              {slide.subtitleAccent && (
                <Text style={styles.slideAccent}>{slide.subtitleAccent}</Text>
              )}

              {slide.alert && (
                <View style={styles.alertCard}>
                  <View style={styles.alertIconBox}>
                    <Ionicons name="warning" size={16} color="#e07060" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.alertTitle}>HEALTH ALERT</Text>
                    <Text style={styles.alertText}>{slide.alert}</Text>
                  </View>
                </View>
              )}

              {slide.feature && (
                <View style={styles.featureCard}>
                  <Ionicons name="cloud-offline-outline" size={20} color="#888890" />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.featureTitle}>Zero Cloud</Text>
                    <Text style={styles.featureText}>{slide.feature}</Text>
                  </View>
                </View>
              )}

            </View>
          </View>
        ))}
      </ScrollView>

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i === currentIndex ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      {/* Button */}
      <TouchableOpacity
        style={styles.button}
        onPress={isLast ? handleGetStarted : handleNext}
        activeOpacity={0.85}
      >
        <Text style={styles.buttonText}>
          {isLast ? "GET STARTED" : "NEXT"}
        </Text>
        <Ionicons name="arrow-forward" size={16} color="#ffffff" />
      </TouchableOpacity>

    </View>
  );
}

// ─── Slide 1 styles ───────────────────────────────────────────
const s1 = StyleSheet.create({
  circleWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  dashedCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: "#444450",
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
  },
  rotatedCard: {
    width: 110,
    height: 110,
    borderRadius: 20,
    backgroundColor: "#1a1a26",
    borderWidth: 1,
    borderColor: "#2a2a3a",
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "-15deg" }],
  },
  pillWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    width: 56,
    height: 26,
    borderRadius: 13,
    flexDirection: "row",
    overflow: "hidden",
    transform: [{ rotate: "-35deg" }],
    borderWidth: 2,
    borderColor: "#e07060",
  },
  pillLeft: {
    flex: 1,
    backgroundColor: "#e07060",
  },
  pillRight: {
    flex: 1,
    backgroundColor: "transparent",
  },
  exclamationDot: {
    position: "absolute",
    top: 18,
    right: 18,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#e07060",
    alignItems: "center",
    justifyContent: "center",
  },
  exclamationText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
});

// ─── Slide 2 styles ───────────────────────────────────────────
const s2 = StyleSheet.create({
  wrapper: {
    width: "100%",
    alignItems: "center",
  },
  grid: {
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  imageCard: {
    width: "55%",
    backgroundColor: "#0f1a14",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1a2a20",
    overflow: "hidden",
    minHeight: 130,
    justifyContent: "space-between",
  },
  imageGlow: {
    position: "absolute",
    top: 10,
    left: 20,
    width: 80,
    height: 50,
    borderRadius: 40,
    backgroundColor: "#00ff6a18",
  },
  imageSurface: {
    flex: 1,
    justifyContent: "center",
    gap: 6,
    marginBottom: 8,
  },
  imagePillRow: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  imagePill: {
    height: 10,
    width: 24,
    borderRadius: 5,
    opacity: 0.85,
  },
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0a1410",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#1a2a20",
  },
  liveDot: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#1a2a20",
    alignItems: "center",
    justifyContent: "center",
  },
  liveLabel: {
    fontSize: 8,
    color: "#888890",
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  liveSub: {
    fontSize: 10,
    color: "#ccccdd",
    marginTop: 1,
  },
  smallCard: {
    width: "38%",
    backgroundColor: "#161620",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#222230",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 130,
  },
  verifiedIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#9b8fff18",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  smallCardLabel: {
    fontSize: 11,
    color: "#aaaacc",
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 16,
  },
  trackIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#ff8c0018",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
    borderWidth: 1.5,
    borderColor: "#ff8c0044",
  },
  expLabel: {
    fontSize: 9,
    color: "#888890",
    fontWeight: "700",
    letterSpacing: 1,
    marginTop: 4,
  },
  activeLabel: {
    fontSize: 18,
    color: "#ffffff",
    fontWeight: "800",
    marginTop: 2,
  },
  progressCard: {
    width: "55%",
    backgroundColor: "#161620",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#222230",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 60,
  },
  progressBar: {
    flex: 1,
    height: 5,
    backgroundColor: "#222230",
    borderRadius: 3,
  },
  progressFill: {
    width: "65%",
    height: 5,
    backgroundColor: "#9b8fff",
    borderRadius: 3,
  },
});

// ─── Slide 3 styles ───────────────────────────────────────────
const s3 = StyleSheet.create({
  wrapper: {
    alignItems: "center",
  },
  lockCard: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "#1e1e28",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  offlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#161618",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "#222228",
  },
  offlineBadgeText: {
    fontSize: 10,
    color: "#888890",
    letterSpacing: 1,
    fontWeight: "600",
  },
});

// ─── Main styles ──────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0d0d0f",
  },
  skip: {
    position: "absolute",
    top: 56,
    right: 24,
    zIndex: 10,
  },
  skipText: {
    fontSize: 13,
    color: "#888890",
    fontWeight: "600",
    letterSpacing: 1,
  },
  slide: {
    width,
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 72,
  },
  illustrationArea: {
    height: 240,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 36,
  },
  textContent: {
    flex: 1,
  },
  slideTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: "#ffffff",
    lineHeight: 42,
    marginBottom: 14,
  },
  slideSubtitle: {
    fontSize: 15,
    color: "#888890",
    lineHeight: 22,
    marginBottom: 8,
    textAlign: "center",
  },
  slideAccent: {
    fontSize: 15,
    color: "#9b8fff",
    fontWeight: "600",
    lineHeight: 22,
    marginBottom: 20,
  },
  alertCard: {
    flexDirection: "row",
    backgroundColor: "#1e1616",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e0706022",
    gap: 12,
    marginTop: 20,
    alignItems: "flex-start",
  },
  alertIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#e0706018",
    alignItems: "center",
    justifyContent: "center",
  },
  alertTitle: {
    fontSize: 10,
    color: "#e07060",
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  alertText: {
    fontSize: 13,
    color: "#888890",
    lineHeight: 18,
  },
  featureCard: {
    flexDirection: "row",
    backgroundColor: "#161618",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#222228",
    marginTop: 16,
    alignItems: "flex-start",
  },
  featureTitle: {
    fontSize: 14,
    color: "#ffffff",
    fontWeight: "700",
    marginBottom: 4,
  },
  featureText: {
    fontSize: 12,
    color: "#888890",
    lineHeight: 18,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginBottom: 16,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 24,
    backgroundColor: "#9b8fff",
  },
  dotInactive: {
    width: 6,
    backgroundColor: "#333338",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1a1a26",
    marginHorizontal: 24,
    marginBottom: 40,
    borderRadius: 16,
    padding: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: "#2a2a3a",
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
    letterSpacing: 1,
  },
});