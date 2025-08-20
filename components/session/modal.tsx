import { createNewSession } from '@/services/session'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useState } from 'react'
import { Button, ButtonText } from "../ui/button"
import { Heading } from "../ui/heading"
import { CloseIcon, Icon } from "../ui/icon"
import { Input, InputField } from '../ui/input'
import { Modal, ModalBackdrop, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader } from "../ui/modal"
import { Text } from "../ui/text"
import { VStack } from '../ui/vstack'

export function AddSessionModal({
    open,
    onClose
}: {
    open: boolean,
    onClose: () => void
}) {
    const [title, setTitle] = useState('')
    const [date, setDate] = useState(new Date)


    async function onClickSave() {
        const res = await createNewSession({
            name: title,
            date: date.toISOString()
        })

        if (res) {
            setDate(new Date)
            setTitle('')
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
                    <VStack space='sm'>
                        <Input
                            variant="outline"
                            size="md"
                            isDisabled={false}
                            isInvalid={false}
                            isReadOnly={false}
                        >
                            <InputField defaultValue={title} value={title} onChangeText={(val) => {
                                setTitle(val)
                            }} placeholder="Enter a session title" />
                        </Input>
                        <Text>(Default to session's date)</Text>
                        <DateTimePicker mode="date" value={date} onChange={(e, val) => {
                            setDate(val)
                        }} />
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
                        onPress={() => {
                            onClickSave()
                        }}
                    >
                        <ButtonText>Create New Session</ButtonText>
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
}