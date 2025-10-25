import { Button, ButtonText } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
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
                <VStack>
                    <HStack>
                        {match.players[0]  && (
                            <PlayerButton name={match.players[0].name} />
                        )}
                        {match.players[2] && (
                            <PlayerButton name={match.players[2].name} />
                        )}
                    </HStack>
                    <Divider />
                    <HStack>
                        {match.players[1] && (
                            <PlayerButton name={match.players[1].name} />
                        )}
                        {match.players[3] && (
                            <PlayerButton name={match.players[3].name} />
                        )}
                    </HStack>
                </VStack>
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


export function PlayerButton({
    name
}: {
    name: string
}) {
    return <Button
        onPress={() => {
        }}
        style={{
            width: 150,
            height: 100,
            backgroundColor: 'white'
        }}>

        <ButtonText>
            {name}
        </ButtonText>
    </Button>
}