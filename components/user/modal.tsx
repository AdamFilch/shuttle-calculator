import { createPlayer } from "@/services/player"
import { useState } from "react"
import { Button, ButtonText } from "../ui/button"
import { Heading } from "../ui/heading"
import { CloseIcon, Icon } from "../ui/icon"
import { Input, InputField } from "../ui/input"
import { Modal, ModalBackdrop, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader } from "../ui/modal"
import { Text } from "../ui/text"


export function AddPlayerModal({
    open,
    onClose
}: {
    open: boolean,
    onClose: () => void
}) {
    const [playername, setPlayername] = useState('')


    async function onClickSave() {
        const res = await createPlayer(playername)

        if (res) {
            setPlayername('')
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
                    <Heading>
                        Add a Session Modal
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
                    <Text>Add a player here</Text>
                    <Input
                        variant="outline"
                        size="md"
                        isDisabled={false}
                        isInvalid={false}
                        isReadOnly={false}
                    >
                        <InputField defaultValue={playername} value={playername} onChangeText={(val) => {
                            setPlayername(val)
                        }} placeholder="Enter a Player Name" />
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
                        <ButtonText>Add Player</ButtonText>
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
}