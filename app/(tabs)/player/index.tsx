import { ListRow } from "@/components/layout/ListRow";
import { PageHeader } from "@/components/layout/PageHeader";
import { DebtChip } from "@/components/shared/DebtChip";
import { AddPlayerModal } from "@/components/user/modal";
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";
import { SearchIcon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { fetchAllPlayerPayments, PlayersShuttlePayments } from "@/services/player";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import Fuse from "fuse.js";
import { useCallback, useMemo, useState } from "react";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";


export default function PlayersPage() {

    const [playersList, setPlayersList] = useState<PlayersShuttlePayments[]>([])
    const router = useRouter()
    const [addPlayerIsOpen, setAddPlayerIsOpen] = useState(false)
    const [query, setQuery] = useState("")

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

    const fuse = useMemo(
        () => new Fuse(playersList, { keys: ["name"], threshold: 0.4, ignoreLocation: true }),
        [playersList]
    )

    const filteredPlayers = useMemo(() => {
        const trimmedQuery = query.trim()
        return trimmedQuery ? fuse.search(trimmedQuery).map((result) => result.item) : playersList
    }, [query, fuse, playersList])


    return (
        <SafeAreaView className="flex-1 bg-background-50">
            <PageHeader
                title="Players"
                action={{
                    label: "Add Player",
                    onPress: () => setAddPlayerIsOpen(true)
                }}
            />
            <VStack className="px-4 pb-3 bg-background-0">
                <Input variant="outline" size="md">
                    <InputSlot className="pl-3">
                        <InputIcon as={SearchIcon} />
                    </InputSlot>
                    <InputField
                        value={query}
                        onChangeText={setQuery}
                        placeholder="Search players"
                    />
                </Input>
            </VStack>
            <ScrollView className="flex-1 px-4">
                {playersList.length == 0 ? (
                    <Text size="sm" className="text-typography-500 py-4">
                        No players yet
                    </Text>
                ) : filteredPlayers.length == 0 ? (
                    <Text size="sm" className="text-typography-500 py-4">
                        No players match &quot;{query.trim()}&quot;
                    </Text>
                ) : (
                    <VStack space="sm" className="pb-8 pt-2">
                        {filteredPlayers.map((player) => (
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
                <ListRow
                    title="Recently Deleted"
                    onPress={() => router.navigate('/player/deleted')}
                />
            </ScrollView>

            <AddPlayerModal open={addPlayerIsOpen} onClose={() => {
                setAddPlayerIsOpen(false)
                fetchPlayers()
            }} />
        </SafeAreaView>
    )
}
