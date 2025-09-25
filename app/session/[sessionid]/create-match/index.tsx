import { Button, ButtonText } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { createNewMatch } from "@/services/match";
import { fetchAllShuttles, Shuttle } from "@/services/shuttle";
import { fetchAllUsers, User } from "@/services/user";
import { Picker } from '@react-native-picker/picker';
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ScrollView, View } from "react-native";

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
                <Text size={'md'}>Create Match Page</Text>
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
                <VStack space={'md'}>
                    <HStack space="lg">
                        <Button style={{
                            width: 150,
                            height: 100,
                            backgroundColor: 'white'
                        }}>
                            <ButtonText>
                                Player 1
                            </ButtonText>
                        </Button>
                        <Button style={{
                            width: 150,
                            height: 100,
                            backgroundColor: 'white'
                        }}>

                            <ButtonText>
                                Player 3
                            </ButtonText>
                        </Button>
                    </HStack>
                    <Divider />
                    <HStack space={'md'} >
                        <Button style={{
                            width: 150,
                            backgroundColor: 'white'
                        }}>
                            <ButtonText>
                                Player 2
                            </ButtonText>
                        </Button>
                        <Button style={{
                            width: 150,
                            backgroundColor: 'white'
                        }}>

                            <ButtonText>
                                Player 4
                            </ButtonText>
                        </Button>
                    </HStack>
                </VStack>
            </View>
            <Button>
                <ButtonText>
                    Create New Match
                </ButtonText>
            </Button>
        </ScrollView>
    )
}