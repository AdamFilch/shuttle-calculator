import { fetchUserById, User } from "@/services/user";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { SafeAreaView, ScrollView, Text, View } from "react-native";


export default function SelectUsersPage() {
    const { userId } = useLocalSearchParams()
    const [user, setUser] = useState<User | null>(null)

    useEffect(() => {
        const fetchUser = async () => {
            fetchUserById(userId.toString()).then((res) => {
                console.log(res)
                setUser(res[0])
            })
        }

        fetchUser()
    })

    if (!user) {
        return (
            <SafeAreaView>
                <View>
                    <Text>Loading</Text>
                </View>
            </SafeAreaView>
        )
    }

    return (
        <ScrollView>
            <View style={{
                backgroundColor: 'white'
            }}>
                <Text>Users Page {userId}</Text>

                <Text>{user.name}</Text>
            </View>
        </ScrollView>
    )
}