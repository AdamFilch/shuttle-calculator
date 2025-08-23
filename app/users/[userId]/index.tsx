import { useLocalSearchParams } from "expo-router";
import { ScrollView, Text, View } from "react-native";


export default function UsersPage() {
    const { userId } = useLocalSearchParams()
    return (
        <ScrollView>
            <View style={{
                backgroundColor: 'white'
            }}>
                <Text>Users Page</Text>
            </View>
        </ScrollView>
    )
}