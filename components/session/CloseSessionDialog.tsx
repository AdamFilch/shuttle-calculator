import { Modal, ModalBackdrop, ModalContent } from "@/components/ui/modal"
import { formatRM } from "@/services/money-display"
import { PlayerChargePreview } from "@/services/session"
import { useState } from "react"
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native"
import { designTokens } from "@/components/ui/gluestack-ui-provider/config"

export function groupShares(players: PlayerChargePreview[]) {
    const groups: Record<string, { amount: number, names: string[] }> = {}
    for (const player of players) {
        const key = player.total.toFixed(2)
        if (!groups[key]) groups[key] = { amount: player.total, names: [] }
        groups[key].names.push(player.name)
    }
    return Object.values(groups)
        .map((group) => ({ ...group, names: [...group.names].sort((a, b) => a.localeCompare(b)) }))
        .sort((a, b) => b.amount - a.amount)
}

export function CloseSessionDialog({
    isOpen,
    onClose,
    onConfirm,
    players,
    shareTotal,
}: {
    isOpen: boolean,
    onClose: () => void,
    onConfirm: () => Promise<void>,
    players: PlayerChargePreview[],
    shareTotal: number
}) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const groups = groupShares(players)

    const handleConfirm = async () => {
        try {
            setIsSubmitting(true)
            await onConfirm()
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => {
                if (isSubmitting) return
                onClose()
            }}
        >
            <ModalBackdrop className="bg-ink" animate={{ opacity: 0.45 }} />
            <ModalContent className="max-h-[85%] w-[90%] gap-3.5 rounded-2xl border-0 bg-surface-raised p-5 shadow-modal" testID="close-session-dialog">
                <Text className="text-modal-title font-semibold text-ink" accessibilityRole="header">Close session?</Text>
                <Text className="text-body text-muted">
                    This locks in each player&apos;s share. You can&apos;t add matches or courts afterwards.
                </Text>
                <ScrollView className="rounded-xl border border-border-subtle" bounces={false}>
                    {groups.map((group, index) => (
                        <View
                            key={group.amount.toFixed(2)}
                            accessible
                            accessibilityLabel={`${group.names.join(", ")}, ${formatRM(group.amount)}${group.names.length > 1 ? " each" : ""}`}
                            className={`flex-row justify-between gap-2 px-3 py-2.5 ${index > 0 ? "border-t border-border-subtle" : ""}`}
                        >
                            <Text className="shrink text-body text-ink">{group.names.join(", ")}</Text>
                            <Text className="text-body font-medium text-ink" style={{ fontVariant: ["tabular-nums"] }}>
                                {formatRM(group.amount)}{group.names.length > 1 ? " each" : ""}
                            </Text>
                        </View>
                    ))}
                    <View
                        accessible
                        accessibilityLabel={`Total ${formatRM(shareTotal)}`}
                        className={`flex-row justify-between gap-2 px-3 py-2.5 ${groups.length > 0 ? "border-t border-border-subtle" : ""}`}
                    >
                        <Text className="text-body text-muted">Total</Text>
                        <Text className="text-body font-medium text-ink" style={{ fontVariant: ["tabular-nums"] }} testID="close-session-total">
                            {formatRM(shareTotal)}
                        </Text>
                    </View>
                </ScrollView>
                <View className="flex-row gap-2">
                    <Pressable
                        onPress={onClose}
                        disabled={isSubmitting}
                        accessibilityRole="button"
                        className="min-h-11 flex-1 items-center justify-center rounded-lg border border-border bg-surface-raised active:opacity-85"
                    >
                        <Text className="text-body font-medium text-ink">Cancel</Text>
                    </Pressable>
                    <Pressable
                        onPress={handleConfirm}
                        disabled={isSubmitting}
                        accessibilityRole="button"
                        testID="close-session-confirm"
                        className="min-h-11 flex-1 flex-row items-center justify-center gap-2 rounded-lg bg-sage active:opacity-85"
                    >
                        {isSubmitting ? <ActivityIndicator size="small" color={designTokens["on-sage"]} /> : null}
                        <Text className="text-body font-medium text-on-sage">Close session</Text>
                    </Pressable>
                </View>
            </ModalContent>
        </Modal>
    )
}
