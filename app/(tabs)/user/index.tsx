import { SafeAreaView, ScrollView, Text, View } from "react-native";


export default function UsersPage() {
    return (
        <SafeAreaView>
            <ScrollView>
                <View style={{
                    backgroundColor: 'white'
                }}>
                    <Text>Users Page</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}