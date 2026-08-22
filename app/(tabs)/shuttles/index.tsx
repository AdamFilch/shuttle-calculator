import { ListRow } from "@/components/layout/ListRow";
import { PageHeader } from "@/components/layout/PageHeader";
import { BuyAgainModal } from '@/components/shuttle/buyAgainModal';
import { AddShuttleModal } from '@/components/shuttle/modal';
import { Button, ButtonText } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { fetchAllShuttlesWithInventory, ShuttleWithInventory } from '@/services/shuttle';
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from 'react';
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function stockStatus(remaining: number): 'error' | 'warning' | undefined {
    if (remaining <= 1) return 'error'
    if (remaining === 2) return 'warning'
    return undefined
}

export default function ShuttlesScreen() {
    const [addShuttleIsOpen, setIsShuttleOpen] = useState(false)
    const [buyAgainShuttle, setBuyAgainShuttle] = useState<ShuttleWithInventory | null>(null)
    const [shuttlesList, setShuttlesList] = useState<ShuttleWithInventory[]>([])

    useFocusEffect(
        useCallback(() => {
            fetchShuttles()
        }, [])
    )

    const fetchShuttles = async () => {
        fetchAllShuttlesWithInventory().then((res) => {
            setShuttlesList(res)
        })
    }

    return (
        <SafeAreaView className="flex-1 bg-background-50">
            <PageHeader
                title="Shuttles"
                action={{
                    label: "Add Shuttle",
                    onPress: () => setIsShuttleOpen(true)
                }}
            />
            <ScrollView className="flex-1 px-4">
                {shuttlesList.length == 0 ? (
                    <Text size="sm" className="text-typography-500 py-4">
                        No shuttles yet
                    </Text>
                ) : (
                    <VStack space="sm" className="pb-8 pt-2">
                        {shuttlesList.map((shuttle) => (
                            <ListRow
                                key={shuttle.shuttle_id}
                                title={`${shuttle.name} ×${shuttle.times_purchased}`}
                                subtitle={`$${(Number(shuttle.total_price) / Number(shuttle.num_of_shuttles)).toFixed(2)}/shuttle · ${shuttle.remaining} remaining`}
                                status={stockStatus(shuttle.remaining)}
                                trailing={
                                    <Button
                                        size="xs"
                                        variant="outline"
                                        onPress={() => setBuyAgainShuttle(shuttle)}
                                    >
                                        <ButtonText>Buy Again</ButtonText>
                                    </Button>
                                }
                            />
                        ))}
                    </VStack>
                )}
            </ScrollView>

            <AddShuttleModal open={addShuttleIsOpen} onClose={() => {
                setIsShuttleOpen(false)
                fetchShuttles()
            }} />

            <BuyAgainModal
                open={buyAgainShuttle !== null}
                shuttleId={buyAgainShuttle?.shuttle_id ?? null}
                shuttleName={buyAgainShuttle?.name ?? ''}
                onClose={() => {
                    setBuyAgainShuttle(null)
                    fetchShuttles()
                }}
            />
        </SafeAreaView>
    )
}
