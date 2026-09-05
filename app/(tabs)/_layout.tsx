import { Tabs } from "expo-router";
import { Platform } from "react-native";

import { HapticTab } from "@/components/HapticTab";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

const TAB_ACTIVE_TINT = "#0C856E";
const TAB_INACTIVE_TINT = "#8C8C8C";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: TAB_ACTIVE_TINT,
        tabBarInactiveTintColor: TAB_INACTIVE_TINT,
        headerShown: false,
        tabBarButton: HapticTab,
        // tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: "absolute",
          },
          default: {},
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={28} name="home" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="session/index"
        options={{
          title: "Sessions",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name={"calendar-month"} size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="player/index"
        options={{
          title: "Players",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name={"person"} size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="insights/index"
        options={{
          title: "Insights",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name={"leaderboard"} size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="shuttles/index"
        options={{
          title: "Shuttles",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name={"inventory-2"} size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings/index"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => (
            <MaterialIcons name={"settings"} size={28} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
