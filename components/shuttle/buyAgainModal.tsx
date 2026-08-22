import { addShuttlePurchase } from "@/services/shuttle"
import { useState } from "react"
import { Button, ButtonText } from "../ui/button"
import { Heading } from "../ui/heading"
import { CloseIcon, Icon } from "../ui/icon"
import { Input, InputField } from "../ui/input"
import { Modal, ModalBackdrop, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader } from "../ui/modal"
import { Text } from "../ui/text"
import { VStack } from "../ui/vstack"


export function BuyAgainModal({
    open,
    shuttleId,
    shuttleName,
    onClose
}: {
    open: boolean,
    shuttleId: number | null,
    shuttleName: string,
    onClose: () => void
}) {
    const [numOfShuttles, setNumOfShuttles] = useState('')

    async function onClickSave() {
        if (shuttleId === null) return

        const res = await addShuttlePurchase({
            shuttle_id: shuttleId,
            num_of_shuttles: parseInt(numOfShuttles)
        })

        if (res) {
            setNumOfShuttles('')
            onClose()
        }
    }

    return (
        <Modal
            isOpen={open}
            onClose={() => {
                onClose()
            }}
        >
            <ModalBackdrop />
            <ModalContent>
                <ModalHeader>
                    <Heading>Buy {shuttleName} Again</Heading>
                    <ModalCloseButton>
                        <Icon
                            as={CloseIcon}
                            size="md"
                            className="stroke-background-400 group-[:hover]/modal-close-button:stroke-background-700 group-[:active]/modal-close-button:stroke-background-900 group-[:focus-visible]/modal-close-button:stroke-background-900"
                        />
                    </ModalCloseButton>
                </ModalHeader>
                <ModalBody>
                    <VStack space="sm">
                        <Text size="sm" className="text-typography-500">
                            How many shuttles are in this new container?
                        </Text>
                        <Input
                            variant="outline"
                            size="md"
                            isDisabled={false}
                            isInvalid={false}
                            isReadOnly={false}
                        >
                            <InputField
                                keyboardType="number-pad"
                                defaultValue={numOfShuttles}
                                value={numOfShuttles}
                                onChangeText={(val) => {
                                    setNumOfShuttles(val)
                                }}
                                placeholder="Enter the number of shuttles"
                            />
                        </Input>
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button
                        variant="outline"
                        action="secondary"
                        onPress={() => {
                            onClose()
                        }}
                    >
                        <ButtonText>Cancel</ButtonText>
                    </Button>
                    <Button
                        isDisabled={!(parseInt(numOfShuttles) > 0)}
                        onPress={() => {
                            onClickSave()
                        }}
                    >
                        <ButtonText>Add to Inventory</ButtonText>
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
}
