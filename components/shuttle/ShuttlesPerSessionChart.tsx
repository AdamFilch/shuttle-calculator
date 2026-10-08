import { format } from "date-fns"
import { Text, View } from "react-native"

const BAR_AREA = 72

export function ShuttlesPerSessionChart({ points }: { points: { date: string, count: number }[] }) {
    const empty = points.length === 0
    const max = Math.max(1, ...points.map((p) => p.count))
    const latest = points[points.length - 1]
    const accessibilityLabel = empty
        ? "Shuttles per session. No sessions with paid shuttles yet."
        : `Shuttles per session, last ${points.length} ${points.length === 1 ? "session" : "sessions"}: ${points.map((p) => p.count).join(", ")}. Latest ${latest.count} on ${format(new Date(latest.date), "d MMMM")}.`

    return (
        <View
            accessible
            accessibilityLabel={accessibilityLabel}
            testID="shuttles-chart"
            className="gap-3 rounded-xl border border-border-subtle bg-surface-raised p-3.5"
        >
            <View className="flex-row items-center justify-between">
                <Text className="text-section-label font-medium uppercase text-muted">Shuttles per session</Text>
                <Text className="text-caption text-muted">Paid only</Text>
            </View>
            {empty ? (
                <View className="items-center gap-1 rounded-lg border border-dashed border-border-dashed px-4 py-5">
                    <Text className="text-body font-medium text-ink">No sessions yet</Text>
                    <Text className="text-center text-caption text-muted">
                        Bars appear after your first session that uses a paid shuttle.
                    </Text>
                </View>
            ) : (
                <View>
                    <View className="flex-row items-end gap-2 border-b border-border-subtle" style={{ height: BAR_AREA + 18 }}>
                        {points.map((point, index) => {
                            const isLatest = index === points.length - 1
                            return (
                                <View key={index} className="flex-1 items-center justify-end">
                                    {isLatest ? (
                                        <Text className="text-[11px] font-semibold text-ink" style={{ fontVariant: ["tabular-nums"] }}>
                                            {point.count}
                                        </Text>
                                    ) : null}
                                    <View
                                        className={`w-full max-w-10 rounded-t-[3px] ${isLatest ? "bg-clay" : "bg-clay-tint"}`}
                                        style={{ height: Math.max(2, (point.count / max) * BAR_AREA) }}
                                    />
                                </View>
                            )
                        })}
                    </View>
                    <View className="mt-1 flex-row gap-2">
                        {points.map((point, index) => (
                            <View key={index} className="flex-1 items-center">
                                {index === 0 || index === points.length - 1 ? (
                                    <Text className="text-[10px] font-medium text-muted" numberOfLines={1}>
                                        {format(new Date(point.date), "d MMM")}
                                    </Text>
                                ) : null}
                            </View>
                        ))}
                    </View>
                </View>
            )}
        </View>
    )
}
