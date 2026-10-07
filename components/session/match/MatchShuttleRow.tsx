import { designTokens } from "@/components/ui/gluestack-ui-provider/config"
import { MatchShuttleRow as MatchShuttle } from "@/services/match"
import { formatRM } from "@/services/money-display"
import { Text, View } from "react-native"
import { ShuttleGlyph } from "./ShuttleGlyph"

export function MatchShuttleRow({ shuttle }: { shuttle: MatchShuttle }) {
    const free = shuttle.origin === "free"
    const isNew = shuttle.origin === "new"
    const badge = isNew
        ? "New"
        : shuttle.origin === "reused"
            ? `Reused from match ${(shuttle.from_match_number ?? 0) + 1}`
            : "Free"

    return (
        <View className="flex-row items-center gap-3 px-4 py-3">
            <View className={`h-8 w-8 items-center justify-center rounded-lg ${free ? "bg-neutral-tint" : "bg-clay-tint"}`}>
                <ShuttleGlyph colour={free ? designTokens.muted : designTokens.clay} size={18} />
            </View>
            <View className="flex-1 gap-0.5">
                <Text className="text-body font-medium text-ink" numberOfLines={1}>
                    {shuttle.name ?? "Free shuttle"}
                </Text>
                <Text className="text-body text-muted" style={{ fontVariant: ["tabular-nums"] }}>
                    {`×${shuttle.quantity} · ${free ? "no charge" : `${formatRM(shuttle.unit_price)} each`}`}
                </Text>
            </View>
            <View className={`rounded-full px-2.5 py-1 ${isNew ? "bg-clay-tint" : "bg-neutral-tint"}`}>
                <Text className={`text-badge font-medium ${isNew ? "text-clay-strong" : "text-muted"}`}>
                    {badge}
                </Text>
            </View>
        </View>
    )
}
