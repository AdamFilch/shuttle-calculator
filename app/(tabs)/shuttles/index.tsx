import { ScrollView, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";


import { AddShuttleModal } from '@/components/shuttle/modal';
import { Divider } from '@/components/ui/divider';
import { fetchAllShuttles } from '@/services/shuttle';
import { fetchAllShuttlePayments } from '@/services/shuttle-payments';
import { fetchAllShuttleInstances } from '@/services/shuttle_instances';
import { useRouter } from 'expo-router';
import { useState } from 'react';

export default function SettingsPage() {
    const router = useRouter()
    const [addShuttleIsOpen, setIsShuttleOpen] = useState(false)

    return (
        <SafeAreaView>
            <ScrollView>
                <View
                    style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        gap: 10,
                    }}
                >
                    {/* <TouchableOpacity style={buttonStyle}>
          <Text>Add Match</Text>
        </TouchableOpacity> */}
                    <TouchableOpacity style={buttonStyle} onPress={() => {
                        setIsShuttleOpen(true)
                    }}>
                        <Text>Add Shuttles</Text>
                    </TouchableOpacity>
                </View>
                <Divider orientation={'horizontal'} />
                <View style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    gap: 10,
                }}>
                    <TouchableOpacity style={buttonStyle} onPress={async () => {
                        const res = await fetchAllShuttles()
                        console.log(`FetchAllShuttles`, res)
                    }}>
                        <Text>Display all Shuttles</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={buttonStyle} onPress={async () => {
                        const res = await fetchAllShuttlePayments()
                        console.log(`FetchAllShuttlePayments`, res)
                    }}>
                        <Text>Display all Shuttle Payments</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={buttonStyle} onPress={async () => {
                        const res = await fetchAllShuttleInstances()
                        console.log(`FetchAllShuttleInstances`, res)
                    }}>
                        <Text>Display all Shuttle Instances</Text>
                    </TouchableOpacity>
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
                </View>
                <AddShuttleModal open={addShuttleIsOpen} onClose={() => setIsShuttleOpen(false)} />
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

const styles = StyleSheet.create({
    headerImage: {
        color: '#808080',
        bottom: -90,
        left: -35,
        position: 'absolute',
    },
    titleContainer: {
        flexDirection: 'row',
        gap: 8,
    },
});
