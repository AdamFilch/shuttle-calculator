import { fetchMatchById, MatchFull } from "@/services/match";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View, ViewStyle } from "react-native";


export default function MatchPage() {

    const { sessionId, matchId } = useLocalSearchParams()


    const [match, setMatch] = useState<MatchFull | null>(null)

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

    console.log("MatchesById", match)

    return (
        <ScrollView>
            <View style={{
                backgroundColor: 'white'
            }}>
                <Text>
                    Match {matchId} of session {sessionId}
                </Text>
            </View>

            <View>
                <Text>Players played within this match</Text>
            </View>

            <View>
                <Text>Shuttles Used within this match</Text>
                <TouchableOpacity
                    onPress={async () => {
                        // setAddMatchIsOpen(true)
                    }}
                    style={buttonStyle}
                >
                    <Text>Add another shuttle</Text>
                </TouchableOpacity>
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