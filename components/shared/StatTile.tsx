import { ChevronRightIcon, Icon } from "@/components/ui/icon"
import { ReactNode } from "react"
import { Pressable, Text, useWindowDimensions, View } from "react-native"

export function StatTile({
    label,
    value,
    subLine,
    subLineTone = "muted",
    icon,
    onPress,
    accessibilityLabel,
    testID,
}: {
    label: string,
    value: string,
    subLine?: string,
    subLineTone?: "muted" | "warn",
    icon?: ReactNode,
    onPress?: () => void,
    accessibilityLabel?: string,
    testID?: string
}) {
    const { fontScale } = useWindowDimensions()
    const minWidth = 96 * Math.max(1, fontScale)

    const content = (pressed: boolean) => (
        <View
            className={`flex-1 gap-0.5 rounded-xl border border-border-subtle p-3 ${pressed ? "bg-primary-tint" : "bg-surface-raised"}`}
        >
            <View className="flex-row items-center gap-1 pr-4">
                {icon}
                <Text className="text-badge font-medium text-muted">{label}</Text>
            </View>
            <Text className="text-modal-title font-semibold text-ink" style={{ fontVariant: ["tabular-nums"] }}>
                {value}
            </Text>
            {subLine ? (
                <Text className={`text-caption ${subLineTone === "warn" ? "font-medium text-clay-strong" : "text-muted"}`} style={{ fontVariant: ["tabular-nums"] }}>
                    {subLine}
                </Text>
            ) : null}
            {onPress ? (
                <View className="absolute right-2 top-2.5">
                    <Icon as={ChevronRightIcon} size="sm" className="text-muted" />
                </View>
            ) : null}
        </View>
    )

    const containerStyle = { minWidth, flexGrow: 1, flexBasis: minWidth }

    if (!onPress) {
        return (
            <View
                style={containerStyle}
                accessible
                accessibilityLabel={accessibilityLabel ?? [label, value, subLine].filter(Boolean).join(", ")}
                testID={testID}
            >
                {content(false)}
            </View>
        )
    }

    return (
        <Pressable
            style={containerStyle}
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? [label, value, subLine].filter(Boolean).join(", ")}
            testID={testID}
        >
            {({ pressed }) => content(pressed)}
        </Pressable>
    )
}
