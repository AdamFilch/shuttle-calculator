import { fetchAllPlayerPaymentsBySession, PlayersShuttlePayments } from '@/services/player'
import { createNewSession } from '@/services/session'
import { payShuttleByPlayers } from '@/services/shuttle-payments'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useFocusEffect } from '@react-navigation/native'
import { useCallback, useState } from 'react'
import { FlatList, View } from 'react-native'
import { Button, ButtonText } from "../ui/button"
import { Heading } from "../ui/heading"
import { CheckIcon, CloseIcon, Icon } from "../ui/icon"
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


export function PayByPlayerModal({
    open,
    onClose,
    onConfirm,
    sessionId
}: {
    open: boolean,
    onClose: () => void,
    onConfirm: () => void,
    sessionId: string
}) {

    const [openConfirmation, setOpenConfirmation] = useState(false)
    const [playerPayments, setPlayerPayments] = useState<PlayersShuttlePayments[] | null>(null)
    const [selectedPlayers, setSelectedPlayers] = useState([])

    useFocusEffect(
        useCallback(() => {
            fetchPlayerPayments()
        }, [open])
    )

    const fetchPlayerPayments = async () => {
        fetchAllPlayerPaymentsBySession(sessionId).then((res) => {
            setPlayerPayments(res)
        })
    }

    const handlePayment = async () => {
        if (selectedPlayers.length > 0) {
            payShuttleByPlayers({ players: selectedPlayers }).then(() => {
                fetchPlayerPayments()
            })
        }
    }

    console.log("PlayerPayments", selectedPlayers)

    return (
        <Modal
            isOpen={open}
            size={'lg'}
            onClose={() => {
                onClose()
            }}
        >
            <ModalBackdrop />
            <ModalContent>
                <ModalHeader>
                    <Heading>
                        Shuttle Payment by Player
                    </Heading>
                    <View>
                        <ModalCloseButton>
                            <Icon
                                as={CloseIcon}
                                size="md"
                                className="stroke-background-400 group-[:hover]/modal-close-button:stroke-background-700 group-[:active]/modal-close-button:stroke-background-900 group-[:focus-visible]/modal-close-button:stroke-background-900"
                            />
                        </ModalCloseButton>
                    </View>
                </ModalHeader>
                <View style={{ marginBottom: 10 }}>
                    <Button style={{
                        alignSelf: 'flex-end',
                        marginBottom: 10
                    }} onPress={() => {
                        if (selectedPlayers.length > 0) {
                            setSelectedPlayers([])
                        } else {
                            setSelectedPlayers(playerPayments)
                        }
                    }}>
                        <ButtonText>
                            {selectedPlayers.length > 0 ? "Deselect All" : "Select All"}
                        </ButtonText>
                    </Button>
                    <View>
                        <FlatList
                            data={padToFullRows(playerPayments.filter((v) => v.total_owed_amount != 0), 3)}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{
                                gap: 10,
                            }}
                            columnWrapperStyle={{
                                justifyContent: "center",
                                gap: 10,
                            }}
                            numColumns={3}
                            renderItem={(player) => {
                                if (!player.item.player_id) return <View style={{ width: 100, height: 100 }}></View>

                                return <Button
                                    key={player.item.player_id}
                                    style={{
                                        width: 100,
                                        height: 100,
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }} onPress={() => {
                                        if (!selectedPlayers.some(v => v.player_id == player.item.player_id)) {
                                            setSelectedPlayers([...selectedPlayers, {
                                                ...player.item
                                            }])
                                        } else {
                                            setSelectedPlayers(prev => prev.filter(v => v.player_id != player.item.player_id))
                                        }
                                    }}
                                >
                                    <ButtonText>
                                        {player.item.name}
                                    </ButtonText>
                                    <ButtonText>
                                        {player.item.total_owed_amount}
                                    </ButtonText>
                                    <View style={{
                                        width: 15,
                                        height: 15,
                                        borderWidth: 1,
                                        borderColor: 'black',
                                        alignContent: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {selectedPlayers.some((v) => v.player_id == player.item.player_id) && (
                                            <Icon as={CheckIcon} size={'sm'} color="black" />
                                        )}
                                    </View>
                                </Button>
                            }}
                        />

                    </View>
                </View>
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
                            setOpenConfirmation(true)
                        }}
                    >
                        <ButtonText>Confirm Payment</ButtonText>
                    </Button>
                    <PaymentConfirmationDialog
                        open={openConfirmation}
                        onClose={() => { setOpenConfirmation(false) }}
                        onConfirm={() => {
                            setOpenConfirmation(false)
                            handlePayment()
                        }} />
                </ModalFooter>
            </ModalContent>
        </Modal>
    )
}


function padToFullRows(data, columns) {
    if (data == null) return []
    const remainder = data.length % columns;
    if (remainder === 0) return data;

    const paddingCount = columns - remainder;
    return [
        ...data,
        ...Array.from({ length: paddingCount }).map(() => ({ __empty: true })),
    ];
}


function PaymentConfirmationDialog({
    open,
    onClose,
    onConfirm
}: {
    open: boolean,
    onClose: () => void,
    onConfirm: () => void
}) {
    return (
        <Modal
            isOpen={open}
            onClose={onClose}
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
                    <Text style={{
                        color: 'white'
                    }}>This action is irreversible. Click Confirm to proceed.</Text>

                </ModalBody>
                <ModalFooter>
                    <Button
                        variant="outline"
                        action="secondary"
                        className="mr-3"
                        onPress={() => {
                            onClose();
                        }}
                    >
                        <ButtonText>Cancel</ButtonText>
                    </Button>
                    <Button
                        onPress={() => {
                            onConfirm();
                        }}
                    >
                        <ButtonText>Confirm</ButtonText>
                    </Button>
                </ModalFooter>
            </ModalContent>

        </Modal>
    )
}