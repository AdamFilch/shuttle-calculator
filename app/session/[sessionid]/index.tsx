import { AddMatchModal } from "@/components/session/match/modal";
import { VStack } from "@/components/ui/vstack";
import { fetchSessionById, Session } from "@/services/session";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SelectedSessionPage() {
    const router = useRouter()
    const { sessionId } = useLocalSearchParams()
    const [session, setSession] = useState<Session | null>(null)
    const [addMatchIsOpen, setAddMatchIsOpen] = useState(false)

    useEffect(() => {
        const fetchSession = async () => {
            fetchSessionById(sessionId.toString()).then(res => {
                setSession(res[0])
            })
        }

        fetchSession()
    })

    if (!session) {
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
                <Text>Sessions Page {sessionId}</Text>
                <Text>{session.date}</Text>
            </View>
            <TouchableOpacity
                onPress={async () => {
                    // setAddMatchIsOpen(true)
                    router.navigate(`/session/${sessionId.toString()}/create-match`)
                }}
                style={buttonStyle}
            >
                <Text>Add Match</Text>
            </TouchableOpacity>
            <VStack>
                <View>
                    <TouchableOpacity>
                        <Text>Match Number</Text>
                        <Text>Adam, Bagas Vs Alam, Farhan</Text>
                    </TouchableOpacity>
                </View>
            </VStack>

            <AddMatchModal open={addMatchIsOpen} onClose={() => setAddMatchIsOpen(false)} />
        </ScrollView>
    )
}

const buttonStyle: ViewStyle = {
    backgroundColor: 'lightgray',
    width: 100,
    height: 100,
    justifyContent: 'center'
}