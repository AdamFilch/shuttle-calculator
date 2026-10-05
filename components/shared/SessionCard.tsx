import { designTokens } from "@/components/ui/gluestack-ui-provider/config"
import { DisplayDateDMonYYYY } from "@/services/time-display"
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons"
import { Pressable, Text, View } from "react-native"
import { isOwed, StatusBadge } from "./StatusBadge"

function pluralise(count: number, singular: string, plural: string): string {
    return `${count} ${count === 1 ? singular : plural}`
}

export function SessionCard({
    name,
    date,
    status,
    playerCount,
    shuttleCount,
    outstandingAmount,
    onPress,
}: {
    name: string | null,
    date: string,
    status: "open" | "closed",
    playerCount: number,
    shuttleCount: number,
    outstandingAmount: number,
    onPress?: () => void
}) {
    const dateLabel = DisplayDateDMonYYYY(date) ?? ""
    const players = pluralise(playerCount, "player", "players")
    const title = name || dateLabel
    const meta = name ? `${dateLabel} · ${players}` : players

    return (
        <Pressable onPress={onPress} disabled={!onPress}>
            {({ pressed }) => (
                <View
                    className={`rounded-xl border border-border-subtle p-4 ${pressed ? "bg-primary-tint" : "bg-surface-raised"}`}
                >
                    <View className="flex-row items-start justify-between">
                        <View className="flex-1 mr-3">
                            <Text className="text-card-title font-medium text-ink">
                                {title}
                            </Text>
                            <Text className="text-body text-muted mt-1">
                                {meta}
                            </Text>
                        </View>
                        {status === "open" ? (
                            <StatusBadge variant="open" />
                        ) : isOwed(outstandingAmount) ? (
                            <StatusBadge variant="owes" amount={outstandingAmount} format="due" />
                        ) : (
                            <StatusBadge variant="settled" />
                        )}
                    </View>
                    <View className="flex-row items-center mt-2">
                        <MaterialCommunityIcons name="feather" size={16} color={designTokens.clay} />
                        <Text className="text-body text-muted ml-1.5">
                            {pluralise(shuttleCount, "shuttle used", "shuttles used")}
                        </Text>
                    </View>
                </View>
            )}
        </Pressable>
    )
}
