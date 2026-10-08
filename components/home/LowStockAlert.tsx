import { designTokens } from "@/components/ui/gluestack-ui-provider/config"
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons"
import { Pressable, Text, View } from "react-native"

export function LowStockAlert({
    name,
    remaining,
    runwaySessions,
    otherTypeHint,
    onPress,
}: {
    name: string,
    remaining: number,
    runwaySessions: number | null,
    otherTypeHint?: string,
    onPress: () => void
}) {
    const out = remaining <= 0
    const title = out ? `${name} is out of stock` : `${name} running low`
    const runway = runwaySessions === null
        ? null
        : runwaySessions < 1 ? "less than 1 session" : `about ${runwaySessions} ${runwaySessions === 1 ? "session" : "sessions"}`
    const sub = out
        ? "Buy again on the Shuttles tab"
        : [`${remaining} left`, otherTypeHint ?? runway].filter(Boolean).join(" · ")

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`${title}, ${sub}. Opens Shuttles.`}
        >
            {({ pressed }) => (
                <View className={`min-h-14 flex-row items-center gap-3 rounded-xl bg-clay-tint px-3 py-2.5 ${pressed ? "opacity-85" : ""}`}>
                    <View className="h-9 w-9 items-center justify-center rounded-lg bg-surface-raised">
                        <MaterialCommunityIcons name="alert-outline" size={20} color={designTokens["clay-strong"]} />
                    </View>
                    <View className="flex-1">
                        <Text className="text-card-title font-medium text-clay-strong">{title}</Text>
                        <Text className="text-body text-clay-strong">{sub}</Text>
                    </View>
                    <MaterialCommunityIcons name="chevron-right" size={20} color={designTokens["clay-strong"]} />
                </View>
            )}
        </Pressable>
    )
}
