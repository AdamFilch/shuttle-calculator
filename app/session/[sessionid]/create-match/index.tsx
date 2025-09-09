import { Button, ButtonText } from "@/components/ui/button";
import { createNewMatch } from "@/services/match";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView, ScrollView, Text, View } from "react-native";

export default function CreateNewMatchPage() {
    const { sessionId } = useLocalSearchParams()

    async function onClickSave() {
        const res = await createNewMatch({
            sessionId: sessionId.toString(),
            playersId: [''], // [P1, P2, P3, P4] // TL BL TR BR
            shuttleId: '',
            quantity_used: 0,
        })

    }

    return (
        <SafeAreaView>
            <ScrollView>
                <View style={{
                    backgroundColor: 'white'
                }}>
                    <Text>Create Match Page</Text>
                    <View>
                        <Text>Select Shuttle</Text>

                        <Text>Number of shuttle used</Text>
                    </View>
                    <View>
                        <Text>
                            Fill Players
                        </Text>
                        
                    </View>
                </View>
                <Button>
                    <ButtonText>
                        Create New Match
                    </ButtonText>
                </Button>
            </ScrollView>
        </SafeAreaView>
    )
}