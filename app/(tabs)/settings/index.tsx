import { debugDatabase, dropDatabase } from "@/services/database";
import { ScrollView, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";


export default function SettingsPage() {
    return (
        <SafeAreaView>
            <ScrollView>
                <View style={{
                    backgroundColor: 'white'
                }}>
                    <Text>Sessions Page</Text>
                </View>
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