import { PageHeader } from "@/components/layout/PageHeader";
import { EditShuttleModal } from '@/components/shuttle/editShuttleModal';
import { AddShuttleModal } from '@/components/shuttle/modal';
import { ShuttleCard } from '@/components/shuttle/ShuttleCard';
import { Text } from "@/components/ui/text";
import { fetchAllShuttlesWithInventory, ShuttleWithInventory } from '@/services/shuttle';
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from 'react';
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ShuttlesScreen() {
    const [addShuttleIsOpen, setIsShuttleOpen] = useState(false)
    const [editingShuttle, setEditingShuttle] = useState<ShuttleWithInventory | null>(null)
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
                    <View className="flex-row flex-wrap justify-between gap-y-3 pb-8 pt-2">
                        {shuttlesList.map((shuttle) => (
                            <ShuttleCard
                                key={shuttle.shuttle_id}
                                shuttle={shuttle}
                                onLongPress={() => setEditingShuttle(shuttle)}
                            />
                        ))}
                    </View>
                )}
            </ScrollView>

            <AddShuttleModal open={addShuttleIsOpen} onClose={() => {
                setIsShuttleOpen(false)
                fetchShuttles()
            }} />

            <EditShuttleModal
                open={editingShuttle !== null}
                shuttle={editingShuttle}
                onClose={() => {
                    setEditingShuttle(null)
                    fetchShuttles()
                }}
            />
        </SafeAreaView>
    )
}
