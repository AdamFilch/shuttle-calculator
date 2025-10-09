import { AddUserModal } from "@/components/user/modal";
import { fetchAllUsers, User } from "@/services/user";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";


export default function UsersPage() {

    const [usersList, setUsersList] = useState<User[]>([])
    const router = useRouter()
    const [addUserIsOpen, setAddUserIsOpen] = useState(false)

    useEffect(() => {
        const fetchUsers = async () => {
            fetchAllUsers().then((res) => {
                setUsersList(res)
            })
        }

        fetchUsers()
    }, [])


    return (
        <SafeAreaView>
            <ScrollView>
                <View style={{
                    backgroundColor: 'white'
                }}>
                    <Text>Users Page</Text>
                </View>
                <View style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 10,
                    // alignSelf: 'center',
                    width: 'auto',
                }}>

                    <TouchableOpacity style={buttonStyle} onPress={() => {
                        setAddUserIsOpen(true)
                    }}>
                        <Text>Add User</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={buttonStyle} onPress={async () => {
                        const res = await fetchAllUsers()
                        console.log(`FetchAllUsers`, res)
                    }}>
                        <Text>Display User</Text>
                    </TouchableOpacity>
                    <AddUserModal open={addUserIsOpen} onClose={() => setAddUserIsOpen(false)} />

                </View>
                {usersList.length == 0 ? (
                    <View>
                        <Text>
                            Sessions List is Empty
                        </Text>
                    </View>
                ) : (
                    <View>
                        {usersList.map((user) => (
                            <TouchableOpacity
                                key={user.user_id}
                                style={{
                                    backgroundColor: 'white',
                                    height: 50,
                                    borderColor: 'black',
                                    borderWidth: 1
                                }}
                                onPress={() => {
                                    router.navigate(`/user/${user.user_id}`)
                                }}>
                                <View>
                                    <Text>
                                        {user.name}
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