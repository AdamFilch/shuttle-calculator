import { fetchPlayerById, Player } from "@/services/player";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, View } from "react-native";
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
        <ScrollView>
            <View style={{
                backgroundColor: 'white'
            }}>
                <Text>Player Page {playerId}</Text>

                <Text>{player.name}</Text>
            </View>
        </ScrollView>
    )
}