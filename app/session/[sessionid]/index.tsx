import { Text } from "@/components/ui/text";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, View, ViewStyle } from "react-native";



export default function SelectedSessionPage() {
    const { sessionId } = useLocalSearchParams()

    return (
        <ScrollView>
            <View style={{
                backgroundColor: 'white'
            }}>
                <Text>Sessions Page {sessionId}</Text>
            </View>
            <View>
            {/* <TouchableOpacity
                onPress={() => {
                }}
                style={buttonStyle}
            >
                <Text>Go to Sessions</Text>
            </TouchableOpacity> */}
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