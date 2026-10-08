import { HapticTab } from "@/components/HapticTab";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { designTokens } from "@/components/ui/gluestack-ui-provider/config";
import { Tabs } from "expo-router";
import { Platform, StyleSheet } from "react-native";

export const TAB_ACTIVE_TINT = designTokens.primary;
const TAB_INACTIVE_TINT = designTokens.muted;

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: TAB_ACTIVE_TINT,
        tabBarInactiveTintColor: TAB_INACTIVE_TINT,
        tabBarShowLabel: false,
        headerShown: false,
        tabBarButton: HapticTab,
        // tabBarBackground: TabBarBackground,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: "absolute",
            height: 80,
            paddingTop: 5,
            backgroundColor: designTokens["surface-raised"],
            borderTopColor: designTokens["border-subtle"],
            borderTopWidth: StyleSheet.hairlineWidth,
          },
          default: {
            backgroundColor: designTokens["surface-raised"],
            borderTopColor: designTokens["border-subtle"],
            borderTopWidth: StyleSheet.hairlineWidth,
          },
        }),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={29} name="home" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="session/index"
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialIcons name={"calendar-month"} size={29} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="player/index"
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialIcons name={"person"} size={29} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="shuttles/index"
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialIcons name={"inventory-2"} size={29} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings/index"
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialIcons name={"settings"} size={29} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
