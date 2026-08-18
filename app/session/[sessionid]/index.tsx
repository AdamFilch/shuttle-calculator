import { ListRow } from "@/components/layout/ListRow";
import { PageHeader } from "@/components/layout/PageHeader";
import { PayByPlayerModal } from "@/components/session/modal";
import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { fetchSessionById, SessionMatches } from "@/services/session";
import { fetchAllShuttlesBySessionId, ShuttlesBySession } from "@/services/shuttle";
import { DisplayTimeDDDASHMMDASHYYYY } from "@/services/time-display";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SelectedSessionPage() {
    const router = useRouter()
    const { sessionId } = useLocalSearchParams()
    const [sessionMatches, setSessionMatches] = useState<SessionMatches | null>(null)
    const [openPPPModal, setOpenPPPModal] = useState(false)
    const [shuttlesBySesison, setShuttlesBySession] = useState<ShuttlesBySession | null>(null)

    useFocusEffect(
        useCallback(() => {
            fetchSession()
        }, [sessionId])
    )

    const fetchSession = async () => {
        fetchSessionById(sessionId.toString()).then(res => {
            setSessionMatches(res)
        })
        fetchAllShuttlesBySessionId(sessionId.toString(), false).then(res => {
            setShuttlesBySession(res)
        })
    }


    if (!sessionMatches) {
        return (
            <SafeAreaView className="flex-1 bg-background-50 items-center justify-center">
                <ActivityIndicator size="large" color="#0F9D82" />
            </SafeAreaView>
        )
    }

    const sessionTitle = sessionMatches.name === '' || !sessionMatches.name
        ? DisplayTimeDDDASHMMDASHYYYY(sessionMatches.date) ?? ''
        : sessionMatches.name

    return (
        <SafeAreaView className="flex-1 bg-background-50">
            <PageHeader
                title={sessionTitle}
                subtitle={DisplayTimeDDDASHMMDASHYYYY(sessionMatches.date)}
                action={{
                    label: "Add Match",
                    onPress: () => router.navigate(`/session/${sessionId.toString()}/create-match`)
                }}
            />
            <ScrollView className="flex-1 px-4">
                <Button
                    variant="outline"
                    action="secondary"
                    className="mt-2"
                    onPress={() => setOpenPPPModal(true)}
                >
                    <ButtonText>Pay by Player</ButtonText>
                </Button>

                <Heading size="md" className="text-typography-900 mt-6 mb-2">
                    Matches
                </Heading>
                {sessionMatches.matches.length === 0 ? (
                    <Text size="sm" className="text-typography-500 py-4">
                        No matches yet
                    </Text>
                ) : (
                    <VStack space="sm">
                        {sessionMatches.matches.map((match) => (
                            <ListRow
                                key={match.match_id}
                                title={`Match ${match.match_id}`}
                                subtitle={
                                    [
                                        DisplayTimeDDDASHMMDASHYYYY(match.match_date) ?? '',
                                        match.players.map((p) => p.name).join(", ")
                                    ].filter(Boolean).join(" · ")
                                }
                                onPress={() => {
                                    router.navigate(`/session/${sessionId.toString()}/${match.match_id}`)
                                }}
                            />
                        ))}
                    </VStack>
                )}

                {shuttlesBySesison && shuttlesBySesison.shuttles.length > 0 && (
                    <>
                        <Heading size="md" className="text-typography-900 mt-6 mb-2">
                            Shuttles Used
                        </Heading>
                        <VStack space="sm" className="pb-8">
                            {shuttlesBySesison.shuttles.map((shuttle) => (
                                <ListRow
                                    key={shuttle.shuttle_id}
                                    title={shuttle.name}
                                    subtitle={`${shuttle.total_quantity_used} used across ${shuttle.matches_used_in.length} match${shuttle.matches_used_in.length === 1 ? '' : 'es'}`}
                                />
                            ))}
                        </VStack>
                    </>
                )}
            </ScrollView>

            <PayByPlayerModal
                open={openPPPModal}
                onClose={() => {
                    setOpenPPPModal(false)
                }} onConfirm={() => {

                }}
                sessionId={sessionId.toString()}
            />
        </SafeAreaView>
    )
}
