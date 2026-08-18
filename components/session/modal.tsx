import { PaymentConfirmationDialog } from '@/components/shared/PaymentConfirmationDialog'
import { DebtChip } from '@/components/shared/DebtChip'
import { Checkbox, CheckboxIcon, CheckboxIndicator } from '@/components/ui/checkbox'
import { fetchAllPlayerPaymentsBySession, PlayersShuttlePayments } from '@/services/player'
import { createNewSession } from '@/services/session'
import { payShuttleByPlayers } from '@/services/shuttle-payments'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useFocusEffect } from '@react-navigation/native'
import { useCallback, useState } from 'react'
import { Pressable, View } from 'react-native'
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
                        Add a Session
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
                        <Text size="sm" className="text-typography-500">(Defaults to today's date)</Text>
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
    const [selectedPlayers, setSelectedPlayers] = useState<PlayersShuttlePayments[]>([])

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

    const toggleSelection = (player: PlayersShuttlePayments) => {
        setSelectedPlayers((prev) =>
            prev.some((v) => v.player_id == player.player_id)
                ? prev.filter((v) => v.player_id != player.player_id)
                : [...prev, player]
        )
    }

    return (
        <Modal
            isOpen={open}
            size={'lg'}
            onClose={() => {
                setSelectedPlayers([])
                onClose()
            }}
        >
            <ModalBackdrop />
            <ModalContent>
                <ModalHeader>
                    <Heading>
                        Shuttle Payment by Player
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
                    <VStack space="sm">
                        <Button
                            variant="outline"
                            action="secondary"
                            size="sm"
                            className="self-end"
                            onPress={() => {
                                if (selectedPlayers.length > 0) {
                                    setSelectedPlayers([])
                                } else {
                                    setSelectedPlayers(playerPayments ?? [])
                                }
                            }}>
                            <ButtonText>
                                {selectedPlayers.length > 0 ? "Deselect All" : "Select All"}
                            </ButtonText>
                        </Button>
                        {playerPayments && (
                            <View className="flex-row flex-wrap gap-3">
                                {playerPayments
                                    .filter((v) => v.total_owed_amount != 0)
                                    .map((player) => {
                                        const isSelected = selectedPlayers.some((v) => v.player_id == player.player_id)
                                        return (
                                            <Pressable
                                                key={player.player_id}
                                                onPress={() => toggleSelection(player)}
                                                className={`w-[104px] items-center gap-1.5 rounded-xl border px-2 py-3 ${isSelected ? "border-primary-500 bg-primary-50" : "border-outline-100 bg-background-0"}`}
                                            >
                                                <Checkbox
                                                    value={String(player.player_id)}
                                                    isChecked={isSelected}
                                                    onChange={() => toggleSelection(player)}
                                                    className="self-end"
                                                >
                                                    <CheckboxIndicator>
                                                        <CheckboxIcon as={CheckIcon} />
                                                    </CheckboxIndicator>
                                                </Checkbox>
                                                <Text bold numberOfLines={1} className="text-typography-900">
                                                    {player.name}
                                                </Text>
                                                <DebtChip amount={player.total_owed_amount} />
                                            </Pressable>
                                        )
                                    })}
                            </View>
                        )}
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
                            setOpenConfirmation(true)
                        }}
                    >
                        <ButtonText>Confirm Payment</ButtonText>
                    </Button>
                    <PaymentConfirmationDialog
                        isOpen={openConfirmation}
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