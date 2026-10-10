import { HapticTab } from "@/components/HapticTab";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { designTokens } from "@/components/ui/gluestack-ui-provider/config";
import { subscribeShuttleStock } from "@/components/shuttle/stockSignal";
import { fetchShuttleStock } from "@/services/shuttle";
import { Tabs } from "expo-router";
import { useEffect, useState } from "react";
import { AppState, Platform, StyleSheet, View } from "react-native";

export const TAB_ACTIVE_TINT = designTokens.primary;
const TAB_INACTIVE_TINT = designTokens.muted;

function useShuttleAlertCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const refresh = () =>
      fetchShuttleStock()
        .then((stock) => setCount(stock.totals.alert_count))
        .catch(() => undefined);
    refresh();
    const unsubscribe = subscribeShuttleStock(refresh);
    const appState = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    return () => {
      unsubscribe();
      appState.remove();
    };
  }, []);

  return count;
}

export default function TabLayout() {
  const alertCount = useShuttleAlertCount();

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
          tabBarAccessibilityLabel:
            alertCount > 0
              ? `Shuttles, ${alertCount} ${alertCount === 1 ? "type needs" : "types need"} restocking`
              : "Shuttles",
          tabBarButtonTestID: "tab-shuttles",
          tabBarIcon: ({ color }) => (
            <View>
              <MaterialIcons name={"inventory-2"} size={29} color={color} />
              {alertCount > 0 ? (
                <View
                  testID="shuttles-tab-dot"
                  style={{
                    position: "absolute",
                    top: -3,
                    right: -5,
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: designTokens["surface-raised"],
                    backgroundColor: designTokens.clay,
                  }}
                />
              ) : null}
            </View>
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
