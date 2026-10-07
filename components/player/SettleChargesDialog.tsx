import { designTokens } from "@/components/ui/gluestack-ui-provider/config"
import { Modal, ModalBackdrop, ModalContent } from "@/components/ui/modal"
import { formatRM } from "@/services/money-display"
import { Fragment, useState } from "react"
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native"

export type SettleLine = { label: string, amount: number }
export type SettleGroup = { heading?: string, lines: SettleLine[] }

export function SettleChargesDialog({
    isOpen,
    mode,
    playerName,
    groups,
    total,
    remaining,
    onConfirm,
    onClose,
}: {
    isOpen: boolean,
    mode: "pay" | "waive",
    playerName: string,
    groups: SettleGroup[],
    total: number,
    remaining: number,
    onConfirm: () => Promise<void>,
    onClose: () => void
}) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const isPay = mode === "pay"

    const close = () => {
        if (isSubmitting) return
        setError(null)
        onClose()
    }

    const handleConfirm = async () => {
        try {
            setError(null)
            setIsSubmitting(true)
            await onConfirm()
        } catch {
            setError(isPay ? "Couldn't save the payment. Try again." : "Couldn't save the waiver. Try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    let rowIndex = 0

    return (
        <Modal
            isOpen={isOpen}
            onClose={close}
        >
            <ModalBackdrop className="bg-ink" animate={{ opacity: 0.45 }} />
            <ModalContent className="max-h-[85%] w-[90%] gap-3.5 rounded-2xl border-0 bg-surface-raised p-5 shadow-modal" testID="settle-charges-dialog">
                <Text className="text-modal-title font-semibold text-ink" accessibilityRole="header" style={{ fontVariant: ["tabular-nums"] }}>
                    {isPay ? `Mark ${formatRM(total)} paid?` : `Waive ${formatRM(total)}?`}
                </Text>
                <Text className="text-body text-muted">
                    {isPay
                        ? `${playerName} has paid these charges. You can't undo this.`
                        : `${playerName} won't be asked to pay these. You can't undo this.`}
                </Text>
                <ScrollView className="rounded-xl border border-border-subtle" bounces={false}>
                    {groups.map((group, groupIndex) => (
                        <Fragment key={`${group.heading ?? "group"}-${groupIndex}`}>
                            {group.heading ? (
                                <View className={`bg-surface px-3 py-1.5 ${rowIndex++ > 0 ? "border-t border-border-subtle" : ""}`}>
                                    <Text className="text-caption font-medium uppercase tracking-[0.48px] text-muted">{group.heading}</Text>
                                </View>
                            ) : null}
                            {group.lines.map((line, lineIndex) => (
                                <View
                                    key={`${line.label}-${lineIndex}`}
                                    accessible
                                    accessibilityLabel={`${line.label}, ${formatRM(line.amount)}`}
                                    className={`flex-row justify-between gap-2 px-3 py-2.5 ${rowIndex++ > 0 ? "border-t border-border-subtle" : ""}`}
                                >
                                    <Text className="shrink text-body text-ink">{line.label}</Text>
                                    <Text className="text-body font-medium text-ink" style={{ fontVariant: ["tabular-nums"] }}>
                                        {formatRM(line.amount)}
                                    </Text>
                                </View>
                            ))}
                        </Fragment>
                    ))}
                    <View
                        accessible
                        accessibilityLabel={`Total ${formatRM(total)}`}
                        className="flex-row justify-between gap-2 border-t border-border-subtle px-3 py-2.5"
                    >
                        <Text className="text-body text-muted">Total</Text>
                        <Text className="text-body font-semibold text-ink" style={{ fontVariant: ["tabular-nums"] }} testID="settle-total">
                            {formatRM(total)}
                        </Text>
                    </View>
                </ScrollView>
                <Text className="text-caption text-muted" style={{ fontVariant: ["tabular-nums"] }} testID="settle-remaining">
                    {remaining > 0 ? `Still owed afterwards: ${formatRM(remaining)}` : "Nothing left to pay"}
                </Text>
                {error ? (
                    <Text className="text-body text-error-600" accessibilityLiveRegion="polite" testID="settle-error">{error}</Text>
                ) : null}
                <View className="flex-row gap-2">
                    <Pressable
                        onPress={close}
                        disabled={isSubmitting}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: isSubmitting }}
                        className="min-h-11 flex-1 items-center justify-center rounded-lg border border-border bg-surface-raised active:opacity-85"
                    >
                        <Text className="text-body font-medium text-ink">Cancel</Text>
                    </Pressable>
                    <Pressable
                        onPress={handleConfirm}
                        disabled={isSubmitting}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: isSubmitting }}
                        testID="settle-confirm"
                        className={`min-h-11 flex-1 flex-row items-center justify-center gap-2 rounded-lg active:opacity-85 ${isPay ? "bg-sage" : "bg-clay"}`}
                    >
                        {isSubmitting ? <ActivityIndicator size="small" color={isPay ? designTokens["on-sage"] : designTokens.surface} /> : null}
                        <Text className={`text-body font-medium ${isPay ? "text-on-sage" : "text-surface"}`}>{isPay ? "Mark paid" : "Waive"}</Text>
                    </Pressable>
                </View>
            </ModalContent>
        </Modal>
    )
}
