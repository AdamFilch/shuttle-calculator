import { designTokens } from "@/components/ui/gluestack-ui-provider/config"
import { Pressable, Text, View } from "react-native"
import { ShuttleGlyph } from "./ShuttleGlyph"

export function ShuttleChip({ count, onPress }: { count: number, onPress: () => void }) {
    const isEmpty = count === 0

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`Shuttles, ${count} selected`}
            testID="shuttle-chip"
            className={`flex-row items-center gap-2 rounded-full py-1.5 pl-3 pr-1.5 active:opacity-85 ${isEmpty ? "bg-neutral-tint" : "bg-clay-tint"}`}
        >
            <ShuttleGlyph colour={isEmpty ? designTokens.muted : designTokens.clay} />
            <Text className={`text-body font-medium ${isEmpty ? "text-muted" : "text-clay"}`}>
                Shuttles
            </Text>
            <View className={`h-[22px] min-w-[22px] items-center justify-center rounded-full px-1.5 ${isEmpty ? "bg-muted" : "bg-clay"}`}>
                <Text className="text-badge font-semibold text-surface">{count}</Text>
            </View>
        </Pressable>
    )
}
