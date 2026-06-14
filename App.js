import { View, TouchableOpacity, StyleSheet, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";

import SplashScreen from "./app/screens/SplashScreen";
import OnboardingScreen from "./app/screens/OnboardingScreen";
import HomeScreen from "./app/screens/HomeScreen";
import MedicationScreen from "./app/screens/MedicationScreen";
import ScanScreen from "./app/screens/ScanScreen";
import SettingsScreen from "./app/screens/SettingsScreen";
import AddMedicineScreen from "./app/screens/AddMedicineScreen";
import EditMedicineScreen from "./app/screens/EditMedicineScreen";
import MedicineDetailScreen from "./app/screens/MedicineDetailScreen";
import NotificationScreen from "./app/screens/NotificationScreen";
import { SafeAreaProvider } from "react-native-safe-area-context";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TABS = [
  { name: "Home", icon: "home", iconOutline: "home-outline", label: "HOME" },
  { name: "Scan", icon: "scan", iconOutline: "scan-outline", label: "SCAN" },
  {
    name: "Medication",
    icon: "medkit",
    iconOutline: "medkit-outline",
    label: "MEDICATION",
  },
  {
    name: "Settings",
    icon: "settings-sharp",
    iconOutline: "settings-outline",
    label: "SETTINGS",
  },
];

function CustomTabBar({ state, navigation }) {
  return (
    <View style={styles.tabBarOuter}>
      <View style={styles.tabBarContainer}>
        {TABS.map((tab, index) => {
          const isFocused = state.index === index;
          return (
            <TouchableOpacity
              key={tab.name}
              onPress={() => {
                if (!isFocused) navigation.navigate(tab.name);
              }}
              activeOpacity={0.7}
              style={styles.tabItem}
            >
              <Ionicons
                name={isFocused ? tab.icon : tab.iconOutline}
                size={22}
                color={isFocused ? "#9b8fff" : "#555568"}
              />
              <Text
                style={[styles.tabLabel, isFocused && styles.tabLabelActive]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Scan" component={ScanScreen} />
      <Tab.Screen name="Medication" component={MedicationScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen
            name="AddMedicine"
            component={AddMedicineScreen}
            options={{ animation: "slide_from_bottom" }}
          />
          <Stack.Screen
            name="EditMedicine"
            component={EditMedicineScreen}
            options={{ animation: "fade_from_bottom" }}
          />
          <Stack.Screen
            name="MedicineDetail"
            component={MedicineDetailScreen}
            options={{ animation: "fade_from_bottom" }}
          />
          <Stack.Screen
            name="Notifications"
            component={NotificationScreen}
            options={{ animation: "slide_from_right" }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  tabBarOuter: {
    position: "absolute",
    bottom: 16,
    left: 12,
    right: 12,
  },
  tabBarContainer: {
    flexDirection: "row",
    backgroundColor: "#12121e",
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: "#3a3560",
    paddingVertical: 10,
    paddingHorizontal: 8,
    shadowColor: "#9b8fff",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    gap: 4,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#555568",
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: "#9b8fff",
  },
});
