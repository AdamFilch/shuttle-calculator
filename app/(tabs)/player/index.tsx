import { ListRow } from "@/components/layout/ListRow";
import { PageHeader } from "@/components/layout/PageHeader";
import { DebtChip } from "@/components/shared/DebtChip";
import { AddPlayerModal } from "@/components/user/modal";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { fetchAllPlayerPayments, PlayersShuttlePayments } from "@/services/player";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";


export default function PlayersPage() {

    const [playersList, setPlayersList] = useState<PlayersShuttlePayments[]>([])
    const router = useRouter()
    const [addPlayerIsOpen, setAddPlayerIsOpen] = useState(false)

    useFocusEffect(
        useCallback(() => {
            fetchPlayers()
        }, [])
    )

    const fetchPlayers = async () => {
        fetchAllPlayerPayments().then((res) => {
            setPlayersList(res)
        })
    }


    return (
        <SafeAreaView className="flex-1 bg-background-50">
            <PageHeader
                title="Players"
                action={{
                    label: "Add Player",
                    onPress: () => setAddPlayerIsOpen(true)
                }}
            />
            <ScrollView className="flex-1 px-4">
                {playersList.length == 0 ? (
                    <Text size="sm" className="text-typography-500 py-4">
                        No players yet
                    </Text>
                ) : (
                    <VStack space="sm" className="pb-8 pt-2">
                        {playersList.map((player) => (
                            <ListRow
                                key={player.player_id}
                                title={player.name}
                                trailing={<DebtChip amount={player.total_owed_amount} />}
                                onPress={() => {
                                    router.navigate(`/player/${player.player_id}`)
                                }}
                            />
                        ))}
                    </VStack>
                )}
            </ScrollView>

            <AddPlayerModal open={addPlayerIsOpen} onClose={() => {
                setAddPlayerIsOpen(false)
                fetchPlayers()
            }} />
        </SafeAreaView>
    )
}
