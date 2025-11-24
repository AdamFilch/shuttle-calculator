import { PayByPlayerModal } from "@/components/session/modal";
import { Button, ButtonText } from "@/components/ui/button";
import { fetchSessionById, SessionMatches } from "@/services/session";
import { fetchAllShuttlesBySessionId, ShuttlesBySession } from "@/services/shuttle";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SelectedSessionPage() {
    const router = useRouter()
    const { sessionId } = useLocalSearchParams()
    const [sessionMatches, setSessionMatches] = useState<SessionMatches | null>(null)
    const [openPPPModal, setOpenPPPModal] = useState(false)
    const [shuttlesBySesison, setShuttlesBySession] = useState<ShuttlesBySession | null>(null)

    useFocusEffect(
        useCallback(() => {
            fetchSession()
        }, [sessionId])
    )

    const fetchSession = async () => {
        fetchSessionById(sessionId.toString()).then(res => {
            setSessionMatches(res)
        })
        fetchAllShuttlesBySessionId(sessionId.toString(), false).then(res => {
            setShuttlesBySession(res)
        })
    }


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

                <Button
                    onPress={async () => {
                        // setAddMatchIsOpen(true)
                        router.navigate(`/session/${sessionId.toString()}/create-match`)
                    }}
                    style={buttonStyle}
                >
                    <ButtonText>Add Match</ButtonText>
                </Button>
                <Button
                    onPress={async () => {
                        setOpenPPPModal(true)
                    }}
                    style={buttonStyle}>
                    <ButtonText>Pay by Player</ButtonText>
                </Button>

            </View>
            <View>
                {sessionMatches.matches.map((match, idx) => (
                    <TouchableOpacity key={idx} style={{
                        backgroundColor: 'white',
                        height: 70,
                        marginBottom: 2,
                        borderColor: 'black',
                        borderWidth: 1
                    }} onPress={() => {
                        router.navigate(`/session/${sessionId.toString()}/${match.match_id}`)
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
            <PayByPlayerModal
                open={openPPPModal}
                onClose={() => {
                    setOpenPPPModal(false)
                }} onConfirm={() => {

                }}
                sessionId={sessionId.toString()}
            />
        </ScrollView>
    )
}

const buttonStyle: ViewStyle = {
    backgroundColor: 'lightgray',
    width: 100,
    height: 100,
    justifyContent: 'center'
}