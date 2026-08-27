import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { CloseIcon, Icon } from "@/components/ui/icon"
import { Modal, ModalBackdrop, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader } from "@/components/ui/modal"
import { Text } from "@/components/ui/text"
import { Player } from "@/services/player"
import { useState } from "react"

export function DeletePlayerDialog({
    player,
    onClose,
    onConfirm
}: {
    player: Player | null,
    onClose: () => void,
    onConfirm: () => void | Promise<void>
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
            isOpen={player !== null}
            onClose={() => {
                if (isSubmitting) return
                onClose()
            }}
        >
            <ModalBackdrop />
            <ModalContent>
                <ModalHeader>
                    <Heading>
                        Delete {player?.name}?
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
                        They&apos;ll move to Recently Deleted and can be restored later. This won&apos;t affect their match history.
                    </Text>
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
                        action="negative"
                        isDisabled={isSubmitting}
                        onPress={() => {
                            handleConfirm()
                        }}
                    >
                        {isSubmitting && <ButtonSpinner />}
                        <ButtonText>Delete</ButtonText>
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
}
