import { ListRow } from "@/components/layout/ListRow";
import { PageHeader } from "@/components/layout/PageHeader";
import { AddShuttleModal } from '@/components/shuttle/modal';
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { fetchAllShuttles, Shuttle } from '@/services/shuttle';
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from 'react';
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ShuttlesScreen() {
    const [addShuttleIsOpen, setIsShuttleOpen] = useState(false)
    const [shuttlesList, setShuttlesList] = useState<Shuttle[]>([])

    useFocusEffect(
        useCallback(() => {
            fetchShuttles()
        }, [])
    )

    const fetchShuttles = async () => {
        fetchAllShuttles().then((res) => {
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
                                title={shuttle.name}
                                subtitle={`$${Number(shuttle.total_price).toFixed(2)} total · ${shuttle.num_of_shuttles} shuttles`}
                            />
                        ))}
                    </VStack>
                )}
            </ScrollView>

            <AddShuttleModal open={addShuttleIsOpen} onClose={() => {
                setIsShuttleOpen(false)
                fetchShuttles()
            }} />
        </SafeAreaView>
    )
}
