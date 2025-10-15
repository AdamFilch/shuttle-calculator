import { fetchPlayerById, fetchShuttlePaymentsByPlayerSessions, Player, ShuttlePaymentsByPlayerSessions } from "@/services/player";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";


export default function SelectPlayerPage() {
    const { playerId } = useLocalSearchParams()
    const [player, setPlayer] = useState<Player | null>(null)
    const [shuttlePayments, setShuttlePayments] = useState<ShuttlePaymentsByPlayerSessions | null>(null)

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
        </ScrollView>
    )
}


const buttonStyle: ViewStyle = {
    backgroundColor: 'lightgray',
    width: 100,
    height: 100,
    justifyContent: 'center'
}
