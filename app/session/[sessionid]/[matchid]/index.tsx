import { Button, ButtonText } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { CloseIcon, Icon } from "@/components/ui/icon";
import { Modal, ModalBackdrop, ModalBody, ModalCloseButton, ModalContent, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { VStack } from "@/components/ui/vstack";
import { fetchMatchById, MatchFull } from "@/services/match";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Text, View, ViewStyle } from "react-native";


export default function MatchPage() {

    const { sessionId, matchId } = useLocalSearchParams()


    const [match, setMatch] = useState<MatchFull | null>(null)
    const [openConfirmation, setOpenConfirmation] = useState(false)

    useFocusEffect(
        useCallback(() => {
            fetchSession()
        }, [sessionId])
    )

    const fetchSession = async () => {
        fetchMatchById(matchId.toString()).then(res => {
            setMatch(res)
        })
    }


    if (match == null) {
        return <View>
            <Text>Loading</Text>
        </View>
    }




    return (
        <View>
            <View style={{
                backgroundColor: 'white'
            }}>
                <Text>
                    Match {matchId} of session {sessionId}
                </Text>
            </View>

            <View>
            </View>

            <View>
                {/* <TouchableOpacity
                    onPress={async () => {
                        // setAddMatchIsOpen(true)
                        }}
                        style={buttonStyle}
                        >
                        <Text>Add another shuttle</Text>
                        </TouchableOpacity> */}
                <Button onPress={() => {
                    setOpenConfirmation(true)
                }}>
                    <ButtonText>
                        Pay for this Match
                    </ButtonText>
                </Button>
                <PaymentConfirmationDialog open={openConfirmation} onClose={() => {
                    setOpenConfirmation(false)
                }} onConfirm={() => {
                    
                }} />
            </View>
            <View>
                <Text style={{
                    backgroundColor: 'white'
                }}>Players played within this match</Text>
                <VStack space={'lg'}>
                    <HStack space={'lg'} style={{
                        display: 'flex',
                        justifyContent: 'center'
                    }}>
                        {match.players[0] && (
                            <PlayerButton name={match.players[0].name} />
                        )}
                        {match.players[2] && (
                            <PlayerButton name={match.players[2].name} />
                        )}
                    </HStack>
                    <Divider />
                    <HStack space={'lg'} style={{
                        display: 'flex',
                        justifyContent: 'center'
                    }}>
                        {match.players[1] && (
                            <PlayerButton name={match.players[1].name} />
                        )}
                        {match.players[3] && (
                            <PlayerButton name={match.players[3].name} />
                        )}
                    </HStack>
                </VStack>
                {match.shuttles.length > 0 && (
                    <View>
                        <Text style={{
                            backgroundColor: 'white'
                        }}>Shuttles Used this match</Text>
                        <FlatList

                            data={match.shuttles}
                            numColumns={3}
                            contentContainerStyle={{
                                gap: 10
                            }}
                            columnWrapperStyle={{
                                columnGap: 10
                            }}

                            renderItem={(shuttle) => (
                                <Button
                                    style={{
                                        width: 150,
                                        height: 100,
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}
                                    onPress={() => {
                                    }}
                                >
                                    <ButtonText>
                                        {shuttle.item.name}
                                    </ButtonText>
                                    <ButtonText>
                                        ({shuttle.item.quantity_used})
                                    </ButtonText>
                                </Button>
                            )}
                        />

                    </View>
                )}
            </View>
        </View>
    )
}

const buttonStyle: ViewStyle = {
    backgroundColor: 'lightgray',
    width: 100,
    height: 100,
    justifyContent: 'center'
}


export function PlayerButton({
    name
}: {
    name: string
}) {
    return <Button
        onPress={() => {
        }}
        style={{
            width: 150,
            height: 100,
            backgroundColor: 'white'
        }}>

        <ButtonText>
            {name}
        </ButtonText>
    </Button>
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