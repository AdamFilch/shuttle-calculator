import { Text } from "@/components/ui/text";
import { useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";



export default function SelectedSessionPage() {
    const { sessionId } = useLocalSearchParams()

    return (
        <ScrollView>
            <View style={{
                backgroundColor: 'white'
            }}>
                <Text>Sessions Page {sessionId}</Text>
            </View>

        </ScrollView>
    )
}