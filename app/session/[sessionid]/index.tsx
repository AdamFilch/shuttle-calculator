import { fetchSessionById, SessionMatches } from "@/services/session";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SelectedSessionPage() {
    const router = useRouter()
    const { sessionId } = useLocalSearchParams()
    const [sessionMatches, setSessionMatches] = useState<SessionMatches | null>(null)

    useEffect(() => {
        const fetchSession = async () => {
            fetchSessionById(sessionId.toString()).then(res => {
                setSessionMatches(res)
            })
        }

        fetchSession()
    }, [])
    if (!sessionMatches) {
        return (
            <SafeAreaView>
                <View>
                    <Text>
                        Loading
                    </Text>
                </View>
            </SafeAreaView>
        )
    }
    console.log(sessionMatches)
    return (

        <ScrollView>
            <View style={{
                backgroundColor: 'white'
            }}>
                <Text>Sessions Page {sessionMatches.name}</Text>
                <Text>{sessionMatches.date}</Text>
            </View>
            <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                gap: 10,
                // alignSelf: 'center',
                width: 'auto',
            }} >

                <TouchableOpacity
                    onPress={async () => {
                        // setAddMatchIsOpen(true)
                        router.navigate(`/session/${sessionId.toString()}/create-match`)
                    }}
                    style={buttonStyle}
                >
                    <Text>Add Match</Text>
                </TouchableOpacity>

            </View>
            <View>
                {sessionMatches.matches.map((match, idx) => (
                    <TouchableOpacity key={idx} style={{
                        backgroundColor: 'white',
                        height: 70,
                        marginBottom: 2,
                        borderColor: 'black',
                        borderWidth: 1
                    }}>
                        <Text>Match Number {match.match_id}</Text>
                        <Text>Match date {match.match_date}</Text>
                        <View style={{
                            display: 'flex',
                            flexDirection: 'row'
                        }}>
                            {match.players.map((player, idx) =>
                                <Text key={idx}>
                                    {player.name + (idx != match.players.length - 1 ? ", " : "")}
                                </Text>
                            )}
                        </View>
                    </TouchableOpacity>
                ))}
            </View>

        </ScrollView>
    )
}

const buttonStyle: ViewStyle = {
    backgroundColor: 'lightgray',
    width: 100,
    height: 100,
    justifyContent: 'center'
}