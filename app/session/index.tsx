import { debugDatabase, dropDatabase } from "@/services/database";
import { fetchAllSessions } from "@/services/session";
import { useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View, ViewStyle } from "react-native";

export default function SessionPage() {
    const router = useRouter() 
    return (
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
                        console.log(res)
                    }}
                    style={buttonStyle}
                >
                    <Text>Display Sessions</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    onPress={async () => {
                        // const res = await fetchAllSessions()
                        // console.log(res)
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
        </ScrollView>
    )
}

const buttonStyle: ViewStyle = {
  backgroundColor: 'lightgray',
  width: 100,
  height: 100,
  justifyContent: 'center'
}