import { PageHeader } from "@/components/layout/PageHeader";
import { Button, ButtonText } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { fetchMatchById, MatchFull } from "@/services/match";
import { DisplayTimeDDDASHMMDASHYYYY } from "@/services/time-display";
import { useFocusEffect } from "expo-router/react-navigation";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";


export default function MatchPage() {

    const { sessionId, matchId } = useLocalSearchParams()


    const [match, setMatch] = useState<MatchFull | null>(null)

    const fetchSession = async () => {
        fetchMatchById(matchId.toString()).then(res => {
            setMatch(res)
        })
    }

    useFocusEffect(
        useCallback(() => {
            fetchSession()
        }, [sessionId])
    )


    if (match == null) {
        return (
            <SafeAreaView className="flex-1 bg-background-50 items-center justify-center">
                <ActivityIndicator size="large" color="#0F9D82" />
            </SafeAreaView>
        )
    }


    const playerAt = Object.fromEntries(match.players.map((player) => [player.position, player]))

    return (
        <SafeAreaView className="flex-1 bg-background-50">
            <PageHeader
                title={`Match ${match.match_number}`}
                subtitle={DisplayTimeDDDASHMMDASHYYYY(match.date)}
            />

            <View className="flex-1 px-4">
                <Heading size="md" className="text-typography-900 mt-6 mb-2">
                    Players in this match
                </Heading>
                <VStack space="sm">
                    <HStack space="sm">
                        {playerAt[0] && (
                            <PlayerButton name={playerAt[0].name} />
                        )}
                        {playerAt[2] && (
                            <PlayerButton name={playerAt[2].name} />
                        )}
                    </HStack>
                    <Divider />
                    <HStack space="sm">
                        {playerAt[1] && (
                            <PlayerButton name={playerAt[1].name} />
                        )}
                        {playerAt[3] && (
                            <PlayerButton name={playerAt[3].name} />
                        )}
                    </HStack>
                </VStack>

                {match.shuttles.length > 0 && (
                    <View>
                        <Heading size="md" className="text-typography-900 mt-6 mb-2">
                            Shuttles used this match
                        </Heading>
                        <FlatList
                            data={match.shuttles}
                            numColumns={3}
                            contentContainerStyle={{
                                gap: 10,
                                paddingBottom: 32
                            }}
                            columnWrapperStyle={{
                                gap: 10
                            }}
                            renderItem={(shuttle) => (
                                <Button
                                    variant="outline"
                                    action="secondary"
                                    className="flex-1 h-20 flex-col items-center justify-center rounded-xl border-outline-100 bg-background-0 shadow-soft-1"
                                    onPress={() => {
                                    }}
                                >
                                    <ButtonText className="text-typography-900" size="sm">
                                        {shuttle.item.name ?? 'Free'}
                                    </ButtonText>
                                    <ButtonText className="text-typography-500" size="xs">
                                        ({shuttle.item.quantity})
                                    </ButtonText>
                                </Button>
                            )}
                        />
                    </View>
                )}
            </View>
        </SafeAreaView>
    )
}


export function PlayerButton({
    name
}: {
    name: string
}) {
    return (
        <Button
            variant="outline"
            action="secondary"
            className="flex-1 h-20 items-center justify-center rounded-xl border-outline-100 bg-background-0 shadow-soft-1"
            onPress={() => {
            }}
        >
            <ButtonText className="text-typography-900">
                {name}
            </ButtonText>
        </Button>
    )
}
