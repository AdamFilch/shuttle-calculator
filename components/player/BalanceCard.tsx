import { plural } from "@/components/player/format"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { formatRM } from "@/services/money-display"
import { Pressable, Text, useWindowDimensions, View } from "react-native"

function SecondaryButton({ label, onPress, testID }: { label: string, onPress: () => void, testID?: string }) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            testID={testID}
            className="min-h-11 flex-1 items-center justify-center rounded-lg border border-border bg-surface-raised px-3 active:opacity-85"
        >
            <Text className="text-center text-body font-medium text-ink">{label}</Text>
        </Pressable>
    )
}

export function BalanceCard({
    owed,
    paid,
    sessionsOwing,
    closedSessions,
    openCaption,
    onPayAll,
    onPayIndividually,
    onWaive,
}: {
    owed: number,
    paid: number,
    sessionsOwing: number,
    closedSessions: number,
    openCaption?: string,
    onPayAll: () => void,
    onPayIndividually: () => void,
    onWaive: () => void
}) {
    const { fontScale } = useWindowDimensions()
    const stacked = fontScale >= 1.5
    const isOwing = owed > 0
    const total = paid + owed

    const historyCaption = !isOwing && closedSessions > 0
        ? `Paid ${formatRM(paid)} across ${plural(closedSessions, "closed session")}.`
        : null
    const accessibilityLabel = isOwing
        ? `Owes ${formatRM(owed)} across ${plural(sessionsOwing, "session")}. Paid ${formatRM(paid)} so far.`
        : `All settled, ${formatRM(0)}.${historyCaption ? ` ${historyCaption}` : ""}`

    return (
        <View className="gap-1 rounded-xl border border-border-subtle bg-surface-raised p-4" testID="balance-card">
            <View accessible accessibilityLabel={[accessibilityLabel, openCaption].filter(Boolean).join(" ")} className="gap-1">
                <View className="flex-row items-center justify-between gap-2">
                    <Text className="text-section-label font-medium uppercase text-muted">
                        {isOwing ? "Owes" : "All settled"}
                    </Text>
                    {isOwing ? (
                        <View className="rounded-full bg-clay-tint px-2.5 py-1">
                            <Text className="text-badge font-medium text-clay-strong">{plural(sessionsOwing, "session")}</Text>
                        </View>
                    ) : (
                        <StatusBadge variant="settled" />
                    )}
                </View>
                <Text
                    className="text-[34px] font-semibold leading-[40px] tracking-[-0.34px] text-ink"
                    style={{ fontVariant: ["tabular-nums"] }}
                    testID="balance-owed"
                >
                    {formatRM(isOwing ? owed : 0)}
                </Text>
                {isOwing ? (
                    <>
                        <View
                            className="mb-1.5 mt-2.5 h-1.5 flex-row overflow-hidden rounded-full bg-neutral-tint"
                            accessibilityElementsHidden
                            importantForAccessibility="no-hide-descendants"
                        >
                            <View className="h-full bg-sage" style={{ width: `${total > 0 ? (paid / total) * 100 : 0}%` }} />
                            <View className="h-full bg-clay" style={{ width: `${total > 0 ? (owed / total) * 100 : 0}%` }} />
                        </View>
                        <View className="flex-row flex-wrap gap-x-3.5 gap-y-1">
                            <View className="flex-row items-center gap-1.5">
                                <View className="h-2 w-2 rounded-sm bg-sage" />
                                <Text className="text-section-label tracking-normal text-muted" style={{ fontVariant: ["tabular-nums"] }}>
                                    Paid <Text className="font-medium text-ink">{formatRM(paid)}</Text>
                                </Text>
                            </View>
                            <View className="flex-row items-center gap-1.5">
                                <View className="h-2 w-2 rounded-sm bg-clay" />
                                <Text className="text-section-label tracking-normal text-muted" style={{ fontVariant: ["tabular-nums"] }}>
                                    Owed <Text className="font-medium text-ink">{formatRM(owed)}</Text>
                                </Text>
                            </View>
                        </View>
                    </>
                ) : null}
                {historyCaption ? <Text className="mt-1.5 text-caption text-muted">{historyCaption}</Text> : null}
                {openCaption ? (
                    <Text className="mt-1.5 text-caption text-muted" testID="balance-open-caption">{openCaption}</Text>
                ) : null}
            </View>
            {isOwing ? (
                <View className="mt-3 gap-2">
                    <Pressable
                        onPress={onPayAll}
                        accessibilityRole="button"
                        testID="pay-all-button"
                        className="min-h-11 items-center justify-center rounded-lg bg-sage px-3 active:opacity-85"
                    >
                        <Text className="text-center text-body font-medium text-on-sage" style={{ fontVariant: ["tabular-nums"] }}>
                            Pay all · {formatRM(owed)}
                        </Text>
                    </Pressable>
                    <View className={`${stacked ? "flex-col" : "flex-row"} gap-2`}>
                        <SecondaryButton label="Pay individually" onPress={onPayIndividually} testID="pay-individually-button" />
                        <SecondaryButton label="Waive" onPress={onWaive} testID="waive-button" />
                    </View>
                </View>
            ) : null}
        </View>
    )
}
