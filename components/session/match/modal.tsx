import { Button, ButtonText } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { CloseIcon, Icon } from "@/components/ui/icon"
import { Input } from "@/components/ui/input"
import { Modal, ModalBackdrop, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader } from "@/components/ui/modal"
import { Text } from "@/components/ui/text"
import { VStack } from "@/components/ui/vstack"
import { createNewMatch } from "@/services/match"
import { useLocalSearchParams } from "expo-router/build/hooks"


export function AddMatchModal({
    open,
    onClose
}: {
    open: boolean,
    onClose: () => void
}) {
    const { sessionId } = useLocalSearchParams()

    async function onClickSave() {
        const res = await createNewMatch({
            sessionId: sessionId.toString(),
            playersId: [''],
            shuttleId: '',
            quantity_used: 0,
        })

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
                        Add a Match
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
                            {/* <InputField defaultValue={title} value={title} onChangeText={(val) => {
                                setTitle(val)
                            }} placeholder="Enter a session title" /> */}
                        </Input>
                        <Text>(Default to session's date)</Text>
                        {/* <DateTimePicker mode="date" value={date} onChange={(e, val) => {
                            setDate(val)
                        }} /> */}
                        
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
                        <ButtonText>Create New Match</ButtonText>
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
}
