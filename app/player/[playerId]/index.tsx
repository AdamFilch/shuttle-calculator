import { fetchPlayerById, fetchShuttlePaymentsByPlayerId, Player } from "@/services/player";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";


export default function SelectPlayerPage() {
    const { playerId } = useLocalSearchParams()
    const [player, setPlayer] = useState<Player | null>(null)

    useEffect(() => {
        const fetchPlayer = async () => {
            fetchPlayerById(playerId.toString()).then((res) => {
                setPlayer(res[0])
            })
        }

        fetchPlayer()
    })

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
        <SafeAreaView>
            <ScrollView>
                <View style={{
                    backgroundColor: 'white'
                }}>
                    <Text>Player Page {playerId}</Text>

                    <Text>{player.name}</Text>
                </View>
 <TouchableOpacity
                        onPress={async () => {
                            const res = await fetchShuttlePaymentsByPlayerId(player.player_id)
                            console.log(`FetchAllShuttlePayments`, res)
                        }}
                        style={buttonStyle}
                    >
                        <Text>Display Sessions</Text>
                    </TouchableOpacity>
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
