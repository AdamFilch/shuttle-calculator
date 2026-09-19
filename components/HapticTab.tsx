import * as Haptics from "expo-haptics";
import { BottomTabBarButtonProps } from "expo-router/js-tabs";
import { PlatformPressable } from "expo-router/react-navigation";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

export function HapticTab(props: BottomTabBarButtonProps) {
  const focused = props["aria-selected"] ?? false;
  const scale = useSharedValue(1);
  const indicatorProgress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    indicatorProgress.value = withTiming(focused ? 1 : 0, { duration: 180 });
  }, [focused, indicatorProgress]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const indicatorAnimatedStyle = useAnimatedStyle(() => ({
    opacity: indicatorProgress.value,
    transform: [{ scale: 0.7 + indicatorProgress.value * 0.3 }],
  }));

  return (
    <PlatformPressable
      {...props}
      // Overrides the library's default tab item style, which top-aligns
      // content to leave room for a label — even when the label is hidden.
      style={[props.style, styles.centered]}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === "ios") {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        // eslint-disable-next-line react-hooks/immutability -- Reanimated shared values are mutated via `.value` by design
        scale.value = withTiming(0.85, { duration: 100 });
        props.onPressIn?.(ev);
      }}
      // onPressOut={(ev) => {
      //   // eslint-disable-next-line react-hooks/immutability -- Reanimated shared values are mutated via `.value` by design
      //   scale.value = withSequence(
      //     withSpring(1.15, { damping: 10, stiffness: 300 }),
      //     withSpring(1, { damping: 12, stiffness: 200 }),
      //   );
      //   props.onPressOut?.(ev);
      // }}
    >
      <Animated.View style={[styles.indicator, indicatorAnimatedStyle]} />
      <Animated.View style={iconAnimatedStyle}>{props.children}</Animated.View>
    </PlatformPressable>
  );
}

const styles = StyleSheet.create({
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  indicator: {
    position: "absolute",
    width: 44,
    height: 42,
    // borderRadius: 16,
    // borderWidth: 1.5,
    // borderColor: TAB_ACTIVE_TINT,
  },
});
