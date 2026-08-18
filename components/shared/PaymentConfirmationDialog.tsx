import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { CloseIcon, Icon } from "@/components/ui/icon"
import { Modal, ModalBackdrop, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader } from "@/components/ui/modal"
import { Text } from "@/components/ui/text"
import { useState } from "react"
import { DebtChip } from "./DebtChip"

/**
 * Unified payment confirmation dialog, replacing the three near-identical
 * local implementations previously duplicated in:
 *  - components/session/modal.tsx (PayByPlayerModal)
 *  - app/session/[sessionId]/[matchId]/index.tsx
 *  - app/player/[playerId]/index.tsx
 *
 * Not wired into those call sites yet -- that happens in a later phase.
 */
export function PaymentConfirmationDialog({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirm Payment",
    description = "This action is irreversible. Click Confirm to proceed.",
    amount,
    confirmLabel = "Confirm"
}: {
    isOpen: boolean,
    onClose: () => void,
    onConfirm: () => void | Promise<void>,
    title?: string,
    description?: string,
    amount?: number,
    confirmLabel?: string
}) {
    const [isSubmitting, setIsSubmitting] = useState(false)

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
            <ModalBackdrop />
            <ModalContent>
                <ModalHeader>
                    <Heading>
                        {title}
                    </Heading>
                    <ModalCloseButton>
                        <Icon
                            as={CloseIcon}
                            size="md"
                            className="stroke-background-400 group-[:hover]/modal-close-button:stroke-background-700 group-[:active]/modal-close-button:stroke-background-900 group-[:focus-visible]/modal-close-button:stroke-background-900"
                        />
                    </ModalCloseButton>
                </ModalHeader>
                <ModalBody>
                    <Text className="text-typography-700">
                        {description}
                    </Text>
                    {amount !== undefined && (
                        <DebtChip amount={amount} />
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button
                        variant="outline"
                        action="secondary"
                        className="mr-3"
                        isDisabled={isSubmitting}
                        onPress={() => {
                            onClose()
                        }}
                    >
                        <ButtonText>Cancel</ButtonText>
                    </Button>
                    <Button
                        isDisabled={isSubmitting}
                        onPress={() => {
                            handleConfirm()
                        }}
                    >
                        {isSubmitting && <ButtonSpinner />}
                        <ButtonText>{confirmLabel}</ButtonText>
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
}
