import { AddSessionModal } from "@/components/session/modal";
import { fetchAllMatches } from "@/services/match";
import { fetchAllMatchShuttles } from "@/services/match-shuttles";
import { fetchAllMatchUsers } from "@/services/match-users";
import { fetchAllSessions, Session } from "@/services/session";
import { DisplayTimeDDDASHMMDASHYYYY } from '@/services/time-display';
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SessionPage() {
    const router = useRouter()
    const [sessionsList, setSessionsList] = useState<Session[]>([])
    const [addSessionIsOpen, setAddSessionIsOpen] = useState(false)
    useEffect(() => {
        const fetchSessions = async () => {
            fetchAllSessions().then((res) => {
                setSessionsList(res)
            })
        }

        fetchSessions()
    }, [])
    return (
        <SafeAreaView>
            <ScrollView>
                <View style={{
                    backgroundColor: 'white'
                }}>
                    <Text>Sessions Page</Text>
                </View>
                <View
                    style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: 10,
                        // alignSelf: 'center',
                        width: 'auto',
                    }}
                >
                    <TouchableOpacity style={buttonStyle} onPress={() => {
                        setAddSessionIsOpen(true)
                    }}>
                        <Text>Add Sessions</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={async () => {
                            const res = await fetchAllSessions()
                            console.log(`FetchAllSession`, res)
                        }}
                        style={buttonStyle}
                    >
                        <Text>Display Sessions</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={buttonStyle} onPress={async () => {
                        const res = await fetchAllMatches()
                        console.log(`FetchAllMatches`, res)
                    }}>
                        <Text>Display all matches</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={buttonStyle} onPress={async () => {
                        const res = await fetchAllMatchShuttles()
                        console.log(`FetchAllMatchShuttles`, res)
                    }}>
                        <Text>Display all Match Shuttles</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={buttonStyle} onPress={async () => {
                        const res = await fetchAllMatchUsers()
                        console.log(`FetchAllMatchUsers`, res)
                    }}>
                        <Text>Display all Match Users</Text>
                    </TouchableOpacity>

                    <AddSessionModal open={addSessionIsOpen} onClose={() => setAddSessionIsOpen(false)} />

                </View>
                {sessionsList.length == 0 ? (
                    <View>
                        <Text>
                            Sessions List is Empty
                        </Text>
                    </View>
                ) : (
                    <View>
                        {sessionsList.map((session) => (
                            <TouchableOpacity
                                key={session.session_id}
                                style={{
                                    backgroundColor: 'white',
                                    height: 50,
                                    borderColor: 'black',
                                    borderWidth: 1
                                }}
                                onPress={() => {
                                    router.navigate(`/session/${session.session_id}`)
                                }}>
                                <View>
                                    <Text>
                                        {session.name == '' ? DisplayTimeDDDASHMMDASHYYYY(session.date) : session.name}
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