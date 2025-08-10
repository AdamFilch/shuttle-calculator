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
                {/* <TouchableOpacity style={buttonStyle}>
                      <Text>Add User</Text>
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