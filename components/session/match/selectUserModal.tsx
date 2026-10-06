import { Avatar } from "@/components/shared/Avatar"
import { CloseIcon, Icon } from "@/components/ui/icon"
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@/components/ui/modal"
import { Player } from "@/services/player"
import { Pressable, Text, View } from "react-native"

export function SelectPlayerModal({
    open,
    title,
    onClose,
    onSelect,
    onClear,
    players,
    selectedPlayer,
}: {
    open: boolean,
    title: string,
    onClose: () => void,
    onSelect: (playerId: number) => void,
    onClear?: () => void,
    players: Player[],
    selectedPlayer?: number | null,
}) {
    return (
        <Modal size="md" isOpen={open} onClose={onClose}>
            <ModalBackdrop className="bg-ink" animate={{ opacity: 0.45 }} />
            <ModalContent className="max-h-[80%] rounded-2xl border-0 bg-surface p-5 shadow-hard-2">
                <ModalHeader className="items-start">
                    <Text className="text-modal-title font-semibold text-ink">{title}</Text>
                    <Pressable
                        onPress={onClose}
                        accessibilityRole="button"
                        accessibilityLabel="Close"
                        hitSlop={8}
                        className="p-0.5"
                    >
                        <Icon as={CloseIcon} size="lg" className="text-muted" />
                    </Pressable>
                </ModalHeader>
                <ModalBody className="mb-3 mt-3">
                    {players.length > 0 ? (
                        <View className="gap-2">
                            {players.map((player) => {
                                const isSelected = selectedPlayer != null && player.player_id === selectedPlayer
                                return (
                                    <Pressable
                                        key={player.player_id}
                                        onPress={() => onSelect(player.player_id)}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected: isSelected }}
                                        testID={`player-option-${player.name}`}
                                    >
                                        {({ pressed }) => (
                                            <View
                                                className={`flex-row items-center gap-3 rounded-xl px-4 py-3 ${isSelected ? "border-[1.5px] border-sage" : "border border-border-subtle"} ${pressed ? "bg-primary-tint" : "bg-surface-raised"}`}
                                            >
                                                <Avatar name={player.name} colour={player.avatar_colour} />
                                                <Text className="flex-1 text-card-title font-medium text-ink" numberOfLines={1}>
                                                    {player.name}
                                                </Text>
                                            </View>
                                        )}
                                    </Pressable>
                                )
                            })}
                        </View>
                    ) : (
                        <Text className="text-body text-muted">No players available.</Text>
                    )}
                </ModalBody>
                <ModalFooter className="gap-3">
                    <Pressable
                        onPress={onClose}
                        accessibilityRole="button"
                        className="flex-1 items-center rounded-lg border border-border bg-surface-raised py-[11px] active:opacity-85"
                    >
                        <Text className="text-body font-medium text-ink">Cancel</Text>
                    </Pressable>
                    {onClear && (
                        <Pressable
                            onPress={onClear}
                            accessibilityRole="button"
                            testID="player-clear-slot"
                            className="flex-1 items-center rounded-lg border border-border bg-surface-raised py-[11px] active:opacity-85"
                        >
                            <Text className="text-body font-medium text-ink">Remove player</Text>
                        </Pressable>
                    )}
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
}
