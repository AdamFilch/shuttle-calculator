import { ListRow } from "@/components/layout/ListRow";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, ButtonText } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { fetchDeletedPlayers, Player, restorePlayer } from "@/services/player";
import { DisplayTimeDDDASHMMDASHYYYY } from "@/services/time-display";
import { useFocusEffect } from "expo-router/react-navigation";
import { useCallback, useState } from "react";
import { ScrollView, View } from "react-native";

export default function DeletedPlayersPage() {
  const [deletedPlayers, setDeletedPlayers] = useState<Player[]>([]);

  useFocusEffect(
    useCallback(() => {
      fetchDeleted();
    }, []),
  );

  const fetchDeleted = () => {
    fetchDeletedPlayers().then((res) => {
      setDeletedPlayers(res);
    });
  };

  const handleRestore = async (playerId: number) => {
    await restorePlayer(playerId);
    fetchDeleted();
  };

  return (
    <View className="flex-1 bg-background-50">
      <PageHeader title="Recently Deleted" />
      <ScrollView className="flex-1 px-4">
        {deletedPlayers.length === 0 ? (
          <Text size="sm" className="text-typography-500 py-4">
            No deleted players.
          </Text>
        ) : (
          <VStack space="sm" className="pb-8 pt-2">
            {deletedPlayers.map((player) => (
              <ListRow
                key={player.player_id}
                title={player.name}
                subtitle={
                  player.deleted_date
                    ? `Deleted ${DisplayTimeDDDASHMMDASHYYYY(player.deleted_date)}`
                    : undefined
                }
                trailing={
                  <Button
                    size="sm"
                    variant="outline"
                    action="secondary"
                    onPress={() => handleRestore(player.player_id)}
                  >
                    <ButtonText>Restore</ButtonText>
                  </Button>
                }
              />
            ))}
          </VStack>
        )}
      </ScrollView>
    </View>
  );
}
