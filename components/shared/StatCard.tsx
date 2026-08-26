import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { View } from "react-native";

/**
 * Generic label + big-number box used for home-screen summary stats
 * (total outstanding, total shuttles used, remaining shuttles, ...).
 * `size="lg"` renders the value larger for a hero stat; `size="md"`
 * (default) is meant for equal-width stats laid out side by side.
 * `highlightClassName`, when passed, draws a colored pill behind the
 * value (e.g. the light-yellow/pink/green backgrounds on the home page).
 */
export function StatCard({
  label,
  value,
  size = "md",
  valueClassName = "text-typography-900",
  highlightClassName,
  className = "",
}: {
  label: string;
  value: string;
  size?: "md" | "lg";
  valueClassName?: string;
  highlightClassName?: string;
  className?: string;
}) {
  const valueText = (
    <Text bold size={size === "lg" ? "4xl" : "2xl"} className={valueClassName}>
      {value}
    </Text>
  );

  return (
    <VStack
      space="sm"
      className={`rounded-xl border border-outline-100 bg-background-0 p-4 shadow-soft-1 ${className}`}
    >
      <Text size="sm" className="text-typography-500">
        {label}
      </Text>
      {highlightClassName ? (
        <View
          className={` rounded-full px-3 ${size === "lg" ? "py-2" : "py-1"} ${highlightClassName}`}
        >
          {valueText}
        </View>
      ) : (
        valueText
      )}
    </VStack>
  );
}
