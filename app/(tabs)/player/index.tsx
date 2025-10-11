import { AddPlayerModal } from "@/components/user/modal";
import { fetchAllPlayers, Player } from "@/services/player";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";


export default function PlayersPage() {

    const [playersList, setPlayersList] = useState<Player[]>([])
    const router = useRouter()
    const [addPlayerIsOpen, setAddPlayerIsOpen] = useState(false)

    useEffect(() => {
        const fetchUsers = async () => {
            fetchAllPlayers().then((res) => {
                setPlayersList(res)
            })
        }

        fetchUsers()
    }, [])


    return (
        <SafeAreaView>
            <ScrollView>
                <View style={{
                    backgroundColor: 'white'
                }}>
                    <Text>Players Page</Text>
                </View>
                <View style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 10,
                    // alignSelf: 'center',
                    width: 'auto',
                }}>

                    <TouchableOpacity style={buttonStyle} onPress={() => {
                        setAddPlayerIsOpen(true)
                    }}>
                        <Text>Add User</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={buttonStyle} onPress={async () => {
                        const res = await fetchAllPlayers()
                        console.log(`FetchAllPlayers`, res)
                    }}>
                        <Text>Display User</Text>
                    </TouchableOpacity>
                    <AddPlayerModal open={addPlayerIsOpen} onClose={() => setAddPlayerIsOpen(false)} />

                </View>
                {playersList.length == 0 ? (
                    <View>
                        <Text>
                            Sessions List is Empty
                        </Text>
                    </View>
                ) : (
                    <View>
                        {playersList.map((player) => (
                            <TouchableOpacity
                                key={player.player_id}
                                style={{
                                    backgroundColor: 'white',
                                    height: 50,
                                    borderColor: 'black',
                                    borderWidth: 1
                                }}
                                onPress={() => {
                                    router.navigate(`/player/${player.player_id}`)
                                }}>
                                <View>
                                    <Text>
                                        {player.name}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    )
}


const buttonStyle: ViewStyle = {
    backgroundColor: 'lightgray',
    width: 100,
    height: 100,
    justifyContent: 'center'
}