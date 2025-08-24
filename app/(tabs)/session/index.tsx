import { VStack } from "@/components/ui/vstack";
import { debugDatabase, dropDatabase } from "@/services/database";
import { fetchAllSessions, Session } from "@/services/session";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, Text, TouchableOpacity, View, ViewStyle } from "react-native";

export default function SessionPage() {
    const router = useRouter()
    const [sessionsList, setSessionsList] = useState<Session[]>([])

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
                    <TouchableOpacity
                        onPress={() => {
                            router.navigate('/session')
                        }}
                        style={buttonStyle}
                    >
                        <Text>Go to Sessions</Text>
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
                    <TouchableOpacity
                        onPress={async () => {
                            await debugDatabase()
                        }}
                        style={buttonStyle}
                    >
                        <Text>Check Tables</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={async () => {
                            // const res = await fetchAllSessions()
                            // console.log(res)
                            await dropDatabase()
                        }}
                        style={buttonStyle}
                    >
                        <Text>Drop Tables</Text>
                    </TouchableOpacity>

                </View>
                {sessionsList.length == 0 ? (
                <View>
                    <Text>
                        Sessions List is Empty
                    </Text>
                </View>
            ) : (
                <VStack>
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
                                    {session.name == '' ? session.date : session.name}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </VStack>
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