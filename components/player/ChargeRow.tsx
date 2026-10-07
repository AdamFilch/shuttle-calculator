import { storedDateLabel } from "@/components/player/format"
import { CourtGlyph } from "@/components/session/SessionOptionsSheet"
import { ShuttleGlyph } from "@/components/session/match/ShuttleGlyph"
import { SelectBoxVisual } from "@/components/shared/SelectBox"
import { designTokens } from "@/components/ui/gluestack-ui-provider/config"
import { formatRM } from "@/services/money-display"
import { Pressable, Text, View } from "react-native"

export type ChargeRowState = "owed" | "paid" | "waived" | "estimate"
export type ChargeRowMode = "view" | "pay" | "waive"

export function ChargeRow({
    kind,
    title,
    sub,
    amount,
    state,
    date,
    mode,
    checked = false,
    onToggle,
    accessibilityLabel,
    showDivider = false,
    testID,
}: {
    kind: "court" | "shuttle",
    title: string,
    sub: string,
    amount: number,
    state: ChargeRowState,
    date?: string | null,
    mode: ChargeRowMode,
    checked?: boolean,
    onToggle?: () => void,
    accessibilityLabel: string,
    showDivider?: boolean,
    testID?: string
}) {
    const isDone = state === "paid" || state === "waived"
    const selecting = mode !== "view"
    const selectable = selecting && state === "owed"
    const pickedClass = checked ? (mode === "waive" ? "bg-clay-tint" : "bg-settled-tint") : ""
    const dateLabel = storedDateLabel(date ?? null)
    const stateLine = state === "paid"
        ? `Paid${dateLabel ? ` ${dateLabel}` : ""}`
        : state === "waived"
            ? `Waived${dateLabel ? ` ${dateLabel}` : ""}`
            : null
    const amountLabel = state === "estimate" ? `≈ ${formatRM(amount)}` : formatRM(amount)

    const content = (
        <View
            className={`min-h-[52px] flex-row items-center gap-3 py-2.5 pr-3.5 ${selecting ? "pl-1" : "pl-3.5"} ${pickedClass} ${showDivider ? "border-t border-dashed border-border-subtle" : ""}`}
        >
            {selecting ? (
                <View className="-my-2.5 -mr-2">
                    <SelectBoxVisual checked={checked} tone={mode === "waive" ? "clay" : "sage"} disabled={!selectable} />
                </View>
            ) : null}
            <View className={`h-8 w-8 items-center justify-center rounded-lg ${kind === "court" ? "bg-primary-tint" : "bg-clay-tint"}`}>
                {kind === "court" ? <CourtGlyph size={18} /> : <ShuttleGlyph colour={designTokens.clay} size={16} />}
            </View>
            <View className="flex-1 gap-px">
                <Text className={`text-body font-medium ${isDone ? "text-muted" : "text-ink"}`}>{title}</Text>
                {stateLine ? (
                    <Text className={`text-caption ${state === "paid" ? "text-settled" : "text-muted"}`}>{stateLine}</Text>
                ) : (
                    <Text className="text-section-label tracking-normal text-muted" style={{ fontVariant: ["tabular-nums"] }}>{sub}</Text>
                )}
            </View>
            <Text
                numberOfLines={1}
                className={`text-body ${isDone ? "font-normal text-muted line-through" : "font-semibold text-ink"}`}
                style={{ fontVariant: ["tabular-nums"] }}
            >
                {amountLabel}
            </Text>
        </View>
    )

    if (!selecting) {
        return (
            <View accessible accessibilityLabel={accessibilityLabel} testID={testID}>
                {content}
            </View>
        )
    }

    return (
        <Pressable
            onPress={onToggle}
            disabled={!selectable}
            accessibilityRole="checkbox"
            accessibilityLabel={accessibilityLabel}
            accessibilityState={{ checked, disabled: !selectable }}
            accessible={selectable}
            testID={testID}
        >
            {content}
        </Pressable>
    )
}
