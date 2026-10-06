import { designTokens } from "@/components/ui/gluestack-ui-provider/config"
import { Modal, ModalBackdrop, ModalContent } from "@/components/ui/modal"
import { formatRM } from "@/services/money-display"
import { useState } from "react"
import { ActivityIndicator, Pressable, Text, View } from "react-native"

export function deleteSessionDescription(title: string, bookingCount: number, bookingTotal: number) {
    const bookings = bookingCount === 0
        ? ""
        : ` and its ${bookingCount} court ${bookingCount === 1 ? "booking" : "bookings"} (${formatRM(bookingTotal)})`
    return `This removes ${title}${bookings}. This can't be undone.`
}

export function DeleteSessionDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    bookingCount,
    bookingTotal,
}: {
    isOpen: boolean,
    onClose: () => void,
    onConfirm: () => Promise<void>,
    title: string,
    bookingCount: number,
    bookingTotal: number
}) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleClose = () => {
        if (isSubmitting) return
        setError(null)
        onClose()
    }

    const handleConfirm = async () => {
        try {
            setIsSubmitting(true)
            setError(null)
            await onConfirm()
        } catch {
            setError("This session can't be deleted")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={handleClose}>
            <ModalBackdrop className="bg-ink" animate={{ opacity: 0.45 }} />
            <ModalContent className="w-[90%] gap-3.5 rounded-2xl border-0 bg-surface-raised p-5 shadow-modal" testID="delete-session-dialog">
                <Text className="text-modal-title font-semibold text-ink" accessibilityRole="header">Delete session?</Text>
                <Text className="text-body text-muted">{deleteSessionDescription(title, bookingCount, bookingTotal)}</Text>
                {error ? (
                    <Text className="text-caption text-error-600" testID="delete-session-error">{error}</Text>
                ) : null}
                <View className="flex-row gap-2">
                    <Pressable
                        onPress={handleClose}
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
                        testID="delete-session-confirm"
                        className="min-h-11 flex-1 flex-row items-center justify-center gap-2 rounded-lg bg-error-600 active:opacity-85"
                    >
                        {isSubmitting ? <ActivityIndicator size="small" color={designTokens.surface} /> : null}
                        <Text className="text-body font-medium text-surface">Delete session</Text>
                    </Pressable>
                </View>
            </ModalContent>
        </Modal>
    )
}
