import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { CheckIcon, CloseIcon, Icon } from "@/components/ui/icon";
import { Modal, ModalBackdrop, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { VStack } from "@/components/ui/vstack";
import { fetchPlayerById, fetchShuttlePaymentsByPlayerSessions, Player, ShuttlePaymentsByPlayerSessions } from "@/services/player";
import { payShuttleByIds } from "@/services/shuttle-payments";
import { DisplayTimeDDDASHMMDASHYYYY } from "@/services/time-display";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, ScrollView, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";


export default function SelectPlayerPage() {
    const { playerId } = useLocalSearchParams()
    const [player, setPlayer] = useState<Player | null>(null)
    const [shuttlePayments, setShuttlePayments] = useState<ShuttlePaymentsByPlayerSessions | null>(null)
    const [SelectShuttleMode, toggleShuttleMode] = useState(false)
    const [selectedShuttles, setSelectedShuttles] = useState([])
    const [openConfirmation, setOpenConfirmation] = useState(false)


    useFocusEffect(
        useCallback(() => {
            fetchPlayer()
        }, [playerId])

    )
    const fetchPlayer = async () => {
        fetchPlayerById(playerId.toString()).then((res) => {
            setPlayer(res[0])
            fetchShuttlePaymentsByPlayerSessions(res[0].player_id).then((res) => {
                setShuttlePayments(res)
            })
        })
    }

    const handlePayShuttles = async () => {
        payShuttleByIds({
            matches: selectedShuttles,
            player_id: playerId.toString()
        }).then(() => {
            setOpenConfirmation(false)
        })
    }


    if (!player) {
        return (
            <SafeAreaView>
                <View>
                    <Text>Loading</Text>
                </View>
            </SafeAreaView>
        )
    }
    return (
        <ScrollView>
            <View style={{
                backgroundColor: 'white'
            }}>
                <Text>Player Page {playerId}</Text>

                <Text>{player.name}</Text>
            </View>
            <TouchableOpacity
                onPress={async () => {
                    const res = await fetchShuttlePaymentsByPlayerSessions(player.player_id)
                    console.log(`FetchAllShuttlePayments`, res)
                }}
                style={buttonStyle}
            >
                <Text>Display Sessions</Text>
            </TouchableOpacity>
            {shuttlePayments && (
                <VStack style={{
                    display: 'flex',
                    gap: 10
                }}>
                    <VStack>
                        {SelectShuttleMode ? (

                            <HStack>
                                <Button onPress={() => {
                                    setOpenConfirmation(true)
                                }}>
                                    <ButtonText>Pay ({selectedShuttles.length})</ButtonText>
                                </Button>
                                <Button onPress={() => {
                                    setSelectedShuttles([])
                                    toggleShuttleMode(false)
                                }}>
                                    <ButtonText>Cancel</ButtonText>
                                </Button>
                            </HStack>
                        ) : (
                            <HStack>
                                <Button onPress={() => {
                                    toggleShuttleMode(true)
                                }}>
                                    <ButtonText>Pay Shuttles</ButtonText>
                                </Button>
                            </HStack>
                        )}
                    </VStack>
                    {shuttlePayments.sessions.map((session, idx) => {
                        const matchesUnpaid = session.matches_played.some((match) => match.shuttles.some((shu) => shu.owed_amount > 0))
                        if (!matchesUnpaid) return <View></View>
                        return <VStack key={idx} style={{
                            backgroundColor: 'white',
                        }}>
                            <Text>
                                {session.name == '' ? DisplayTimeDDDASHMMDASHYYYY(session.date) : session.name}
                            </Text>
                            <FlatList
                                data={session.matches_played.filter((matches) => matches.shuttles.some((shu) => shu.owed_amount > 0))}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{
                                    gap: 10,
                                    paddingHorizontal: 5
                                }}
                                renderItem={(match) => {
                                    const numOfShuttle = match.item.shuttles.length
                                    const totalCosts = match.item.shuttles.reduce((acc, shuttle) => {
                                        return acc + shuttle.owed_amount
                                    }, 0)
                                    return <Button
                                        style={{
                                            width: 150,
                                            height: 120,
                                            display: 'flex',
                                            flexDirection: 'column'
                                        }}
                                        onLongPress={(e) => {
                                            if (!SelectShuttleMode) {
                                                toggleShuttleMode(true)
                                                setSelectedShuttles([{
                                                    ...match.item,
                                                    numOfShuttle,
                                                    totalCosts
                                                }])
                                            }
                                            
                                        }}
                                        onPress={() => {
                                            if (SelectShuttleMode) {
                                                if (!selectedShuttles.some((v) => v.match_id == match.item.match_id)) {
                                                    setSelectedShuttles([...selectedShuttles, {
                                                        ...match.item,
                                                        numOfShuttle,
                                                        totalCosts
                                                    }])
                                                } else {
                                                    setSelectedShuttles(prev => prev.filter((v) => v.match_id !== match.item.match_id))
                                                }
                                            }
                                        }}
                                    >
                                        <ButtonText>
                                            {match.index}
                                        </ButtonText>
                                        <ButtonText>
                                            {numOfShuttle} Unpaid
                                        </ButtonText>
                                        <ButtonText>
                                            {totalCosts} Total
                                        </ButtonText>
                                        {SelectShuttleMode && (
                                            <View style={{
                                                width: 15,
                                                height: 15,
                                                borderWidth: 1,
                                                borderColor: 'black',
                                                alignContent: 'center',
                                                justifyContent: 'center'
                                            }}>
                                                {selectedShuttles.some((v) => v.match_id == match.item.match_id) && (
                                                    <Icon as={CheckIcon} size={'sm'} color="black" />
                                                )}
                                            </View>
                                        )}
                                    </Button>
                                }}
                            />
                        </VStack>

                    })}
                </VStack>
            )}
            <PaymentConfirmationDialog
                onClose={() => {
                    setOpenConfirmation(false)
                }}
                onConfirm={() => {
                    handlePayShuttles()
                }}
                open={openConfirmation}
            />
        </ScrollView>
    )
}


const buttonStyle: ViewStyle = {
    backgroundColor: 'lightgray',
    width: 100,
    height: 100,
    justifyContent: 'center'
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