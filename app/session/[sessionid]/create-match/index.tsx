import { SelectShuttleButton } from "@/components/session/match/selectShuttleModal";
import { SelectPlayerButton } from "@/components/session/match/selectUserModal";
import { Button, ButtonText } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { createNewMatch } from "@/services/match";
import { fetchAllPlayers, Player } from "@/services/player";
import { fetchAllShuttles, Shuttle } from "@/services/shuttle";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ScrollView, Text, View } from "react-native";

export default function CreateNewMatchPage() {
    const { sessionId } = useLocalSearchParams()
    const [selectedShuttle, setSelectedShuttle] = useState(1)
    const [selectedPlayers, setSelectedPlayers] = useState(new Array(4).fill(null))
    const pickerRef = useRef(null)
    const router = useRouter()

    const [shuttleList, setShuttleList] = useState<Shuttle[] | null>([])
    const [playerList, setPlayerList] = useState<Player[] | null>([])

    useFocusEffect(
        useCallback(() => {
            fetchData()
        }, []))

    const fetchData = () => {
        fetchAllShuttles().then((res) => {
            setShuttleList(res)
        })
        fetchAllPlayers().then((res) => {
            setPlayerList(res)
        })
    }
    async function onClickSave() {
        const res = await createNewMatch({
            sessionId: parseInt(sessionId.toString()),
            playersId: selectedPlayers, // [P1, P2, P3, P4] // TL BL TR BR
            shuttleId: selectedShuttle,
            quantityUsed: 1,
        })
        router.back()
    }

    return (
        <ScrollView>
            <View style={{
                backgroundColor: 'white'
            }}>
                <Text>Create Match Page</Text>
            </View>
            {shuttleList.length > 0 ? (
                <View>
                    {/* <View style={{
                        backgroundColor: 'white'
                    }}>
                        <Text>Select Shuttle</Text>
                        <Text>Number of shuttle used</Text>
                    </View>
                    <Picker
                        ref={pickerRef}
                        selectedValue={selectedShuttle}
                        onValueChange={(itemValue, itemIndex) =>
                            setSelectedShuttle(itemValue)
                        }>
                        {shuttleList.map((shuttle) => (
                            <Picker.Item key={shuttle.shuttle_id} label={`${shuttle.name} (${shuttle.total_price} RM)`} value={shuttle.shuttle_id} />
                        ))}
                    </Picker> */}
                    <SelectShuttleButton
                        selectedShuttles={
                            ''
                        }
                        onSelect={() => {

                        }} />
                </View>
            ) : (
                <View>
                    <Text>Add a shuttle first to proceed</Text>
                </View>
            )}
            <View style={{
                gap: 30
            }}>
                <Text style={{
                    backgroundColor: 'white'
                }}>
                    Fill Players
                </Text>
                <VStack space={'lg'}>
                    <HStack
                        space={'lg'}
                        style={{
                            display: 'flex',
                            justifyContent: 'center'
                        }}
                    >
                        <SelectPlayerButton selectedPlayer={selectedPlayers[0]} players={playerList} placeholder="Player 1" onSelect={(player) => {
                            setSelectedPlayers(prev => {
                                const updated = [...prev];
                                updated[0] = player;
                                return updated;
                            });
                        }} />
                        <SelectPlayerButton selectedPlayer={selectedPlayers[2]} players={playerList} placeholder="Player 3" onSelect={(player) => {
                            setSelectedPlayers(prev => {
                                const updated = [...prev];
                                updated[2] = player;
                                return updated;
                            });
                        }} />
                    </HStack>
                    <Divider orientation={'horizontal'} style={{
                        width: 'auto',
                        height: 10
                    }} />
                    <HStack
                        space={'lg'}
                        style={{
                            display: 'flex',
                            justifyContent: 'center'
                        }}
                    >
                        <SelectPlayerButton selectedPlayer={selectedPlayers[1]} players={playerList} placeholder="Player 2" onSelect={(player) => {
                            setSelectedPlayers(prev => {
                                const updated = [...prev];
                                updated[1] = player;
                                return updated;
                            });
                        }} />
                        <SelectPlayerButton selectedPlayer={selectedPlayers[3]} players={playerList} placeholder="Player 4" onSelect={(player) => {
                            setSelectedPlayers(prev => {
                                const updated = [...prev];
                                updated[3] = player;
                                return updated;
                            });
                        }} />

                    </HStack>
                </VStack>
                <Button onPress={() => {
                    onClickSave()
                }}>
                    <ButtonText>
                        Create New Match
                    </ButtonText>
                </Button>
            </View>
        </ScrollView>
    )
}


