import { Text } from "@/components/ui/text";
import { fetchSessionById, Session } from "@/services/session";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, View, ViewStyle } from "react-native";



export default function SelectedSessionPage() {
    const { sessionId } = useLocalSearchParams()
    const [session, setSession] = useState<Session | null>(null)

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
        <SafeAreaView>
            <ScrollView>
                <View style={{
                    backgroundColor: 'white'
                }}>
                    <Text>Sessions Page {sessionId}</Text>
                    <Text>{session.date}</Text>
                </View>
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