import { ChevronRightIcon, Icon } from "@/components/ui/icon"
import { StockStatus, WarnUnit } from "@/services/shuttle"
import { Pressable, Text, View } from "react-native"

function sessionsText(k: number) {
    return `${k} ${k === 1 ? "session" : "sessions"}`
}

export function ShuttleStockRow({
    name,
    remaining,
    runwaySessions,
    meterFraction,
    status,
    warnAt,
    onPress,
}: {
    name: string,
    remaining: number,
    runwaySessions: number | null,
    meterFraction: number,
    status: StockStatus,
    warnAt?: { value: number, unit: WarnUnit },
    onPress: () => void
}) {
    const runway = runwaySessions === null ? null : runwaySessions < 1 ? "<1 session" : `~${sessionsText(runwaySessions)}`
    const statusText = status === "out"
        ? "Out of stock"
        : [`${remaining} left`, runway].filter(Boolean).join(" · ")
    const warnText = warnAt ? `warns at ${warnAt.value} ${warnAt.unit}` : null
    const note = status === "out"
        ? "Buy again to restock"
        : status === "low" && warnText ? `Low · ${warnText}` : null
    const tone = status === "out" ? "text-error-600" : status === "low" ? "text-clay-strong" : "text-ink"
    const fill = status === "low" ? "bg-clay" : "bg-primary"
    const fraction = status === "out" ? 0 : Math.min(1, Math.max(0, meterFraction))

    const spokenRunway = runwaySessions === null ? null : runwaySessions < 1 ? "less than 1 session" : `about ${sessionsText(runwaySessions)}`
    const accessibilityLabel = status === "out"
        ? `${name}, out of stock. Buy again to restock.`
        : `${[name, status === "low" ? "low" : null, `${remaining} left`, spokenRunway].filter(Boolean).join(", ")}.${warnText ? ` ${warnText[0].toUpperCase()}${warnText.slice(1)}.` : ""}`

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel}
            testID={`stock-row-${name}`}
        >
            {({ pressed }) => (
                <View className={`min-h-[56px] flex-row items-center gap-2 px-3.5 py-2.5 ${pressed ? "bg-primary-tint" : ""}`}>
                    <View className="flex-1 gap-1.5">
                        <View className="flex-row flex-wrap items-center justify-between gap-x-3">
                            <Text className="shrink text-card-title font-medium text-ink" numberOfLines={1}>
                                {name}
                            </Text>
                            <Text className={`text-body font-medium ${tone}`} style={{ fontVariant: ["tabular-nums"] }}>
                                {statusText}
                            </Text>
                        </View>
                        <View
                            className="h-1.5 overflow-hidden rounded-full bg-neutral-tint"
                            accessibilityElementsHidden
                            importantForAccessibility="no-hide-descendants"
                        >
                            <View className={`h-full rounded-full ${fill}`} style={{ width: `${fraction * 100}%` }} />
                        </View>
                        {note ? <Text className={`text-caption ${tone}`}>{note}</Text> : null}
                    </View>
                    <Icon as={ChevronRightIcon} size="sm" className="text-muted" />
                </View>
            )}
        </Pressable>
    )
}
