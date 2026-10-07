import { formatRM } from "@/services/money-display"
import { Text, View } from "react-native"

type Segment = { label: string, amount: number, fillClass: string }

function SplitBar({ segments }: { segments: Segment[] }) {
    const total = segments.reduce((sum, segment) => sum + segment.amount, 0)

    return (
        <View
            className="mb-1.5 mt-2.5 h-1.5 flex-row overflow-hidden rounded-full bg-neutral-tint"
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
        >
            {total > 0 && segments.map((segment) => (
                <View
                    key={segment.label}
                    className={`h-full ${segment.fillClass}`}
                    style={{ width: `${(segment.amount / total) * 100}%` }}
                />
            ))}
        </View>
    )
}

function Legend({ segments }: { segments: Segment[] }) {
    return (
        <View className="flex-row flex-wrap gap-x-3.5 gap-y-1">
            {segments.map((segment) => (
                <View key={segment.label} className="flex-row items-center gap-1.5">
                    <View className={`h-2 w-2 rounded-sm ${segment.fillClass}`} />
                    <Text className="text-section-label tracking-normal text-muted" style={{ fontVariant: ["tabular-nums"] }}>
                        {segment.label} <Text className="font-medium text-ink">{formatRM(segment.amount)}</Text>
                    </Text>
                </View>
            ))}
        </View>
    )
}

export function OpenEstimateCard({
    courtTotal,
    shuttleTotal,
}: {
    courtTotal: number,
    shuttleTotal: number
}) {
    const total = courtTotal + shuttleTotal
    const segments: Segment[] = [
        { label: "Courts", amount: courtTotal, fillClass: "bg-primary" },
        { label: "Shuttles", amount: shuttleTotal, fillClass: "bg-clay" },
    ]

    return (
        <View
            accessible
            accessibilityLabel={`Estimated so far, about ${formatRM(total)}: courts ${formatRM(courtTotal)}, shuttles ${formatRM(shuttleTotal)}`}
            testID="estimate-card"
            className="gap-1 rounded-xl border border-border-subtle bg-surface-raised p-4"
        >
            <Text className="text-section-label font-medium uppercase text-muted">Estimated so far</Text>
            <Text className="text-screen-title font-semibold text-ink" style={{ fontVariant: ["tabular-nums"] }}>
                <Text className="font-medium text-clay">≈ </Text>
                {formatRM(total)}
            </Text>
            <SplitBar segments={segments} />
            <Legend segments={segments} />
            <Text className="mt-1.5 text-caption text-muted">
                {total > 0
                    ? "The final split is set when you close the session."
                    : "Book courts or add a match to start the estimate."}
            </Text>
        </View>
    )
}

export function ClosedEstimateCard({
    stillOwed,
    paidSoFar,
    amountDue,
    settledCount,
    playerCount,
    closedLabel,
}: {
    stillOwed: number,
    paidSoFar: number,
    amountDue: number | null,
    settledCount: number,
    playerCount: number,
    closedLabel?: string
}) {
    const paid = amountDue === null ? null : paidSoFar
    const segments: Segment[] = paid === null
        ? [{ label: "Owed", amount: stillOwed, fillClass: "bg-clay" }]
        : [
            { label: "Paid", amount: paid, fillClass: "bg-sage" },
            { label: "Owed", amount: stillOwed, fillClass: "bg-clay" },
        ]
    const caption = [
        `${settledCount} of ${playerCount} ${playerCount === 1 ? "player" : "players"} settled`,
        closedLabel ? `closed ${closedLabel}` : null,
    ].filter(Boolean).join(" · ")

    return (
        <View
            accessible
            accessibilityLabel={[
                `Still owed ${formatRM(stillOwed)}`,
                amountDue === null ? null : `of ${formatRM(amountDue)}`,
                paid === null ? null : `paid ${formatRM(paid)}`,
                caption,
            ].filter(Boolean).join(", ")}
            testID="estimate-card"
            className="gap-1 rounded-xl border border-border-subtle bg-surface-raised p-4"
        >
            <Text className="text-section-label font-medium uppercase text-muted">Still owed</Text>
            <View className="flex-row flex-wrap items-baseline gap-x-1.5">
                <Text className="text-screen-title font-semibold text-ink" style={{ fontVariant: ["tabular-nums"] }}>
                    {formatRM(stillOwed)}
                </Text>
                {amountDue !== null ? (
                    <Text className="text-body text-muted" style={{ fontVariant: ["tabular-nums"] }}>
                        of {formatRM(amountDue)}
                    </Text>
                ) : null}
            </View>
            <SplitBar segments={segments} />
            <Legend segments={segments} />
            <Text className="mt-1.5 text-caption text-muted">{caption}</Text>
        </View>
    )
}
