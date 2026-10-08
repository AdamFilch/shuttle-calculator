import { designTokens } from "@/components/ui/gluestack-ui-provider/config"
import { formatRM } from "@/services/money-display"
import { DisplayDateDMonYYYY } from "@/services/time-display"
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons"
import { format, startOfDay } from "date-fns"
import { Pressable, Text, useWindowDimensions, View } from "react-native"
import { isOwed, StatusBadge } from "./StatusBadge"

export function pluralise(count: number, singular: string, plural: string): string {
    return `${count} ${count === 1 ? singular : plural}`
}

export function isStaleOpen(session: { status: "open" | "closed", date: string }): boolean {
    return session.status === "open" && new Date(session.date) < startOfDay(new Date())
}

export function SessionCard({
    name,
    date,
    status,
    playerCount,
    shuttleCount,
    outstandingAmount,
    onPress,
    variant = "card",
    matchCount = 0,
    totalAmount = 0,
    isEstimate = false,
}: {
    name: string | null,
    date: string,
    status: "open" | "closed",
    playerCount: number,
    shuttleCount: number,
    outstandingAmount: number,
    onPress?: () => void,
    variant?: "card" | "compact",
    matchCount?: number,
    totalAmount?: number,
    isEstimate?: boolean
}) {
    const dateLabel = DisplayDateDMonYYYY(date) ?? ""
    const players = pluralise(playerCount, "player", "players")
    const title = name || dateLabel
    const compact = variant === "compact"
    const stacked = useWindowDimensions().fontScale >= 1.5
    const meta = compact
        ? [format(new Date(date), "d MMM"), players, pluralise(matchCount, "match", "matches"), `${isEstimate ? "≈ " : ""}${formatRM(totalAmount)}`].join(" · ")
        : name ? `${dateLabel} · ${players}` : players

    const badge = isStaleOpen({ status, date }) ? (
        <StatusBadge variant="stale" since={date} />
    ) : status === "open" ? (
        <StatusBadge variant="open" />
    ) : isOwed(outstandingAmount) ? (
        <StatusBadge variant="owes" amount={outstandingAmount} format="due" />
    ) : (
        <StatusBadge variant="settled" />
    )

    return (
        <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? "button" : undefined}>
            {({ pressed }) => (
                <View
                    className={`${compact ? "min-h-14 px-3.5 py-2.5" : "rounded-xl border border-border-subtle p-4"} ${pressed ? "bg-primary-tint" : "bg-surface-raised"}`}
                >
                    <View className={stacked ? "gap-2" : "flex-row items-start justify-between"}>
                        <View className={stacked ? "" : "flex-1 mr-3"}>
                            <Text className="text-card-title font-medium text-ink" numberOfLines={2}>
                                {title}
                            </Text>
                            <Text className="text-body text-muted mt-1" style={compact ? { fontVariant: ["tabular-nums"] } : undefined}>
                                {meta}
                            </Text>
                        </View>
                        {badge}
                    </View>
                    {compact ? null : (
                        <View className="flex-row items-center mt-2">
                            <MaterialCommunityIcons name="feather" size={16} color={designTokens.clay} />
                            <Text className="text-body text-muted ml-1.5">
                                {pluralise(shuttleCount, "shuttle used", "shuttles used")}
                            </Text>
                        </View>
                    )}
                </View>
            )}
        </Pressable>
    )
}
