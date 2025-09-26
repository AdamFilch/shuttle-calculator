import { SelectPlayerButton } from "@/components/session/match/selectUserModal";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { createNewMatch } from "@/services/match";
import { fetchAllShuttles, Shuttle } from "@/services/shuttle";
import { fetchAllUsers, User } from "@/services/user";
import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";

export default function CreateNewMatchPage() {
    const { sessionId } = useLocalSearchParams()
    const [selectedShuttle, setSelectedShuttle] = useState()
    const pickerRef = useRef(null)

    const [shuttleList, setShuttleList] = useState<Shuttle[] | null>([])
    const [playerList, setPlayerList] = useState<User[] | null>([])

    useEffect(() => {
        const fetchData = async () => {
            await fetchAllShuttles().then((res) => {
                setShuttleList(res)
            })
            await fetchAllUsers().then((res) => {
                setPlayerList(res)
            })
        }
        fetchData()
    }, [])

    async function onClickSave() {
        const res = await createNewMatch({
            sessionId: sessionId.toString(),
            playersId: [''], // [P1, P2, P3, P4] // TL BL TR BR
            shuttleId: '',
            quantity_used: 0,
        })

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
                    <View style={{
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
                    </Picker>
                </View>
            ) : (
                <View>
                    <Text>Add a shuttle first to proceed</Text>
                </View>
            )}
            <View >
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
                        <SelectPlayerButton players={playerList} placeholder="Player 1" />
                        <SelectPlayerButton players={playerList} placeholder="Player 3" />
                    </HStack>
                    <HStack
                        space={'lg'}
                        style={{
                            display: 'flex',
                            justifyContent: 'center'
                        }}
                    >
                        <SelectPlayerButton players={playerList} placeholder="Player 2" />
                        <SelectPlayerButton players={playerList} placeholder="Player 4" />
                        
                    </HStack>
                </VStack>
            </View>
            <TouchableOpacity>
                <Text>
                    Create New Match
                </Text>
            </TouchableOpacity>
        </ScrollView>
    )
}


