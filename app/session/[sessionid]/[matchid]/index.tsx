import { Button, ButtonText } from "@/components/ui/button";
import { fetchMatchById, MatchFull } from "@/services/match";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, Text, TouchableOpacity, View, ViewStyle } from "react-native";


export default function MatchPage() {

    const { sessionId, matchId } = useLocalSearchParams()


    const [match, setMatch] = useState<MatchFull | null>(null)

    useFocusEffect(
        useCallback(() => {
            fetchSession()
        }, [sessionId])
    )

    const fetchSession = async () => {
        fetchMatchById(matchId.toString()).then(res => {
            setMatch(res)
        })
    }

    console.log('MatchPlayers', match)

    if (match == null) {
        return <View>
            <Text>Loading</Text>
        </View>
    }

    return (
        <View>
            <View style={{
                backgroundColor: 'white'
            }}>
                <Text>
                    Match {matchId} of session {sessionId}
                </Text>
            </View>

            <View>
                <Text>Players played within this match</Text>
            </View>

            <View>
                <Text>Shuttles Used within this match</Text>
                <TouchableOpacity
                    onPress={async () => {
                        // setAddMatchIsOpen(true)
                    }}
                    style={buttonStyle}
                >
                    <Text>Add another shuttle</Text>
                </TouchableOpacity>
            </View>
            <View>
                <View>

                </View>
                {match.shuttles.length > 0 && (
                        <FlatList

                            data={match.shuttles}
                            numColumns={3}
                            contentContainerStyle={{
                                gap: 10
                            }}
                            columnWrapperStyle={{
                                columnGap: 10
                            }}

                            renderItem={(shuttle) => (
                                <Button
                                    style={{
                                        width: 150,
                                        height: 100,
                                        display: 'flex',
                                        flexDirection: 'column'
                                    }}
                                    onPress={() => {
                                    }}
                                >
                                    <ButtonText>
                                        {shuttle.item.name}
                                    </ButtonText>
                                    <ButtonText>
                                        ({shuttle.item.quantity_used})
                                    </ButtonText>
                                </Button>
                            )}
                        />
                )}
            </View>
        </View>
    )
}

const buttonStyle: ViewStyle = {
    backgroundColor: 'lightgray',
    width: 100,
    height: 100,
    justifyContent: 'center'
}