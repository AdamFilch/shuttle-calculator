import { PageHeader } from "@/components/layout/PageHeader";
import { PlayerRow } from "@/components/shared/PlayerRow";
import { SearchInput } from "@/components/shared/SearchInput";
import { AddPlayerModal } from "@/components/user/modal";
import { VStack } from "@/components/ui/vstack";
import { fetchAllPlayerPayments, PlayerSummary } from "@/services/player";
import { useFocusEffect } from "expo-router/react-navigation";
import { useRouter } from "expo-router";
import Fuse from "fuse.js";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";


export default function PlayersPage() {

    const [playersList, setPlayersList] = useState<PlayerSummary[]>([])
    const router = useRouter()
    const [addPlayerIsOpen, setAddPlayerIsOpen] = useState(false)
    const [query, setQuery] = useState("")

    const fetchPlayers = async () => {
        fetchAllPlayerPayments().then((res) => {
            setPlayersList(res)
        })
    }

    useFocusEffect(
        useCallback(() => {
            fetchPlayers()
        }, [])
    )

    const fuse = useMemo(
        () => new Fuse(playersList, { keys: ["name"], threshold: 0.4, ignoreLocation: true }),
        [playersList]
    )

    const filteredPlayers = useMemo(() => {
        const trimmedQuery = query.trim()
        return trimmedQuery ? fuse.search(trimmedQuery).map((result) => result.item) : playersList
    }, [query, fuse, playersList])


    return (
        <SafeAreaView className="flex-1 bg-surface">
            <PageHeader
                title="Players"
                action={{
                    label: "Add player",
                    onPress: () => setAddPlayerIsOpen(true)
                }}
            />
            <VStack className="px-4 pb-3 bg-surface">
                <SearchInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search players"
                />
            </VStack>
            <ScrollView className="flex-1 px-4">
                {playersList.length == 0 ? (
                    <Text className="text-body text-muted py-4">
                        No players yet
                    </Text>
                ) : filteredPlayers.length == 0 ? (
                    <Text className="text-body text-muted py-4">
                        No players match &quot;{query.trim()}&quot;
                    </Text>
                ) : (
                    <VStack space="sm" className="pt-2">
                        {filteredPlayers.map((player) => (
                            <PlayerRow
                                key={player.player_id}
                                name={player.name}
                                avatarColour={player.avatar_colour}
                                sessionCount={player.session_count}
                                owedAmount={player.total_owed_amount}
                                onPress={() => {
                                    router.navigate(`/player/${player.player_id}`)
                                }}
                            />
                        ))}
                    </VStack>
                )}
                <Pressable
                    className="self-start py-4 mb-24"
                    onPress={() => router.navigate('/player/deleted')}
                >
                    {({ pressed }) => (
                        <Text className={`text-body font-medium text-primary ${pressed ? "opacity-60" : ""}`}>
                            Recently deleted
                        </Text>
                    )}
                </Pressable>
            </ScrollView>

            <AddPlayerModal open={addPlayerIsOpen} onClose={() => {
                setAddPlayerIsOpen(false)
                fetchPlayers()
            }} />
        </SafeAreaView>
    )
}
