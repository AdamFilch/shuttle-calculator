import { ListRow } from "@/components/layout/ListRow";
import { PageHeader } from "@/components/layout/PageHeader";
import { AddSessionModal } from "@/components/session/modal";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { fetchAllSessions, Session } from "@/services/session";
import { DisplayTimeDDDASHMMDASHYYYY } from '@/services/time-display';
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SessionPage() {
    const router = useRouter()
    const [sessionsList, setSessionsList] = useState<Session[]>([])
    const [addSessionIsOpen, setAddSessionIsOpen] = useState(false)
    useFocusEffect(
        useCallback(() => {
            fetchSessions()
        }, [])
    )

    const fetchSessions = async () => {
        fetchAllSessions().then((res) => {
            setSessionsList(res)
        })
    }


    return (
        <SafeAreaView className="flex-1 bg-background-50">
            <PageHeader
                title="Sessions"
                action={{
                    label: "Add Session",
                    onPress: () => setAddSessionIsOpen(true)
                }}
            />
            <ScrollView className="flex-1 px-4">
                {sessionsList.length == 0 ? (
                    <Text size="sm" className="text-typography-500 py-4">
                        No sessions yet
                    </Text>
                ) : (
                    <VStack space="sm" className="pb-8 pt-2">
                        {sessionsList.map((session) => (
                            <ListRow
                                key={session.session_id}
                                title={session.name == '' || !session.name ? DisplayTimeDDDASHMMDASHYYYY(session.date) ?? '' : session.name}
                                onPress={() => {
                                    router.navigate(`/session/${session.session_id}`)
                                }}
                            />
                        ))}
                    </VStack>
                )}
            </ScrollView>

            <AddSessionModal open={addSessionIsOpen} onClose={() => {
                setAddSessionIsOpen(false)
                fetchSessions()
            }} />
        </SafeAreaView>
    )
}
