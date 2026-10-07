import { ActionSheet } from "@/components/shared/ActionSheet"
import { ChevronRightIcon, Icon, TrashIcon } from "@/components/ui/icon"
import { formatRM } from "@/services/money-display"
import { PlayerDeleteBlockers } from "@/services/player"
import { Pressable, Text, View } from "react-native"

export function deleteBlockedReason(blockers: PlayerDeleteBlockers | null): string | null {
    if (!blockers) return "Checking…"
    if (blockers.owed > 0) return `Settle ${formatRM(blockers.owed)} first`
    if (blockers.inOpenSession) return "In an open session — close it first"
    return null
}

export function PlayerOptionsSheet({
    isOpen,
    onClose,
    playerName,
    blockers,
    onDelete,
}: {
    isOpen: boolean,
    onClose: () => void,
    playerName: string,
    blockers: PlayerDeleteBlockers | null,
    onDelete: () => void
}) {
    const blockedReason = deleteBlockedReason(blockers)
    const disabled = blockedReason !== null
    const subLine = blockedReason ?? `Moves ${playerName} to Recently deleted`

    return (
        <ActionSheet isOpen={isOpen} onClose={onClose} title="Player options" testID="player-options-sheet">
            <Pressable
                onPress={onDelete}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={`Delete player, ${subLine}`}
                accessibilityState={{ disabled }}
                testID="player-options-delete"
            >
                {({ pressed }) => (
                    <View
                        className={`min-h-14 flex-row items-center gap-3 rounded-xl border border-border-subtle px-3.5 py-3 ${pressed && !disabled ? "bg-primary-tint" : "bg-surface-raised"}`}
                    >
                        <View className={`h-9 w-9 items-center justify-center rounded-lg ${disabled ? "bg-disabled" : "bg-error-50"}`}>
                            <Icon as={TrashIcon} size="md" className={disabled ? "text-muted" : "text-error-600"} />
                        </View>
                        <View className="flex-1 gap-0.5">
                            <Text className={`text-card-title font-medium ${disabled ? "text-muted" : "text-error-600"}`}>
                                Delete player
                            </Text>
                            <Text className="text-body text-muted" testID="player-options-delete-sub">{subLine}</Text>
                        </View>
                        {disabled ? null : <Icon as={ChevronRightIcon} size="md" className="text-muted" />}
                    </View>
                )}
            </Pressable>
            <Pressable
                onPress={onClose}
                accessibilityRole="button"
                className="min-h-11 items-center justify-center rounded-lg border border-border bg-surface-raised active:opacity-85"
            >
                <Text className="text-body font-medium text-ink">Cancel</Text>
            </Pressable>
        </ActionSheet>
    )
}
