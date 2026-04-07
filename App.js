import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "./app/screens/HomeScreen";
import AddMedicineScreen from "./app/screens/AddMedicineScreen";
import EditMedicineScreen from "./app/screens/EditMedicineScreen";
import MedicineDetailScreen from "./app/screens/MedicineDetailScreen";
import { Text, View, Image } from "react-native";
import { useState, useEffect } from "react";
import * as Notifications from "expo-notifications";
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_800ExtraBold,
} from "@expo-google-fonts/inter";

// Handle notifications when app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const Stack = createNativeStackNavigator();

export default function App() {
  const [isReady, setIsReady] = useState(false);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_800ExtraBold,
  });

  useEffect(() => {
    async function setup() {
      // Request permission
      const { status } = await Notifications.requestPermissionsAsync();
      console.log("Notification permission:", status);

      // Create notification channels for Android
      await Notifications.setNotificationChannelAsync("meditrack-alerts", {
        name: "Expiry Alerts",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#6c63ff",
        sound: true,
      });

      await Notifications.setNotificationChannelAsync("meditrack-reminders", {
        name: "Daily Reminders",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#6c63ff",
        sound: true,
      });
    }

    setup();
    const timer = setTimeout(() => setIsReady(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (!isReady || !fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0d0d0d",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Image
          source={require("./assets/splash.png")}
          style={{ width: 180, height: 180, resizeMode: "contain" }}
        />
        <Text
          style={{
            color: "#ffffff",
            fontSize: 28,
            fontWeight: "800",
            marginTop: 20,
            letterSpacing: 0.3,
          }}
        >
          MediTrack
        </Text>
        <Text
          style={{
            color: "#6c63ff",
            fontSize: 13,
            marginTop: 8,
          }}
        >
          Your Medicine Cabinet 💊
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: "#0f0f14" },
          headerTintColor: "#ffffff",
          headerTitleStyle: { fontWeight: "bold" },
          headerShadowVisible: false,
          animation: "fade_from_bottom",
          animationDuration: 250,
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            headerTitle: () => (
              <Text
                style={{
                  color: "#fff",
                  fontSize: 18,
                  fontFamily: "Inter_800ExtraBold",
                  letterSpacing: 0.3,
                }}
              >
                MediTrack 💊
              </Text>
            ),
          }}
        />
        <Stack.Screen
          name="AddMedicine"
          component={AddMedicineScreen}
          options={{ title: "Add Medicine" }}
        />
        <Stack.Screen
          name="EditMedicine"
          component={EditMedicineScreen}
          options={{ title: "Edit Medicine" }}
        />
        <Stack.Screen
          name="MedicineDetail"
          component={MedicineDetailScreen}
          options={{ title: "Medicine Details" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
