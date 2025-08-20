import { createShuttle } from "@/services/shuttle"
import { useState } from "react"
import { Button, ButtonText } from "../ui/button"
import { Heading } from "../ui/heading"
import { CloseIcon, Icon } from "../ui/icon"
import { Input, InputField } from "../ui/input"
import { Modal, ModalBackdrop, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader } from "../ui/modal"
import { Text } from "../ui/text"


export function AddShuttleModal({
    open,
    onClose
}: {
    open: boolean,
    onClose: () => void
}) {
    const [shuttleName, setShuttleName] = useState('')
    const [shuttlePrice, setShuttlePrice] = useState('0')
    const [shuttleAmount, setShuttleAmount] = useState('0')

    async function onClickSave() {
        const res = await createShuttle({
            name: shuttleName,
            total_price: parseFloat(shuttlePrice),
            num_of_shuttles: parseInt(shuttleAmount)
        })

        if (res) {
            setShuttleName('')
            setShuttleAmount('0')
            setShuttlePrice('0')
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
                    <Heading>Add a Shuttle</Heading>
                    <ModalCloseButton>
                        <Icon
                            as={CloseIcon}
                            size="md"
                            className="stroke-background-400 group-[:hover]/modal-close-button:stroke-background-700 group-[:active]/modal-close-button:stroke-background-900 group-[:focus-visible]/modal-close-button:stroke-background-900"
                        />
                    </ModalCloseButton>
                </ModalHeader>
                <ModalBody>
                    <Text>Add a Shuttle here</Text>
                    <Input
                        variant="outline"
                        size="md"
                        isDisabled={false}
                        isInvalid={false}
                        isReadOnly={false}
                    >
                        <InputField defaultValue={shuttleName} value={shuttleName} onChangeText={(val) => {
                            setShuttleName(val)
                        }} placeholder="Enter a Shuttle Name" />
                    </Input>
                    <Input
                        variant="outline"
                        size="md"
                        isDisabled={false}
                        isInvalid={false}
                        isReadOnly={false}
                        
                    >
                        <InputField defaultValue={shuttlePrice} value={shuttlePrice} onChangeText={(val) => {
                            setShuttlePrice(val)
                        }} placeholder="Enter the total price" />
                    </Input>
                    <Input
                        variant="outline"
                        size="md"
                        isDisabled={false}
                        isInvalid={false}
                        isReadOnly={false}
                    >
                        <InputField defaultValue={shuttleAmount} value={shuttleAmount} onChangeText={(val) => {
                            setShuttleAmount(val)
                        }} placeholder="Enter the number of shuttles" />
                    </Input>
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
                        onPress={() => {
                            onClickSave()
                        }}
                    >
                        <ButtonText>Add Shuttle</ButtonText>
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
}