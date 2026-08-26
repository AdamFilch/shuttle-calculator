import { ListRow } from "@/components/layout/ListRow";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { AddShuttleModal } from "@/components/shuttle/modal";
import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import {
    fetchAllPlayerPayments,
    PlayersShuttlePayments,
} from "@/services/player";
import {
    fetchAllSessions,
    formatSessionTitle,
    Session,
} from "@/services/session";
import {
    fetchShuttleUsageSummary,
    ShuttleUsageSummary,
} from "@/services/shuttle";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  const router = useRouter();
  const [addShuttleIsOpen, setIsShuttleOpen] = useState(false);
  const [players, setPlayers] = useState<PlayersShuttlePayments[]>([]);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [shuttleUsage, setShuttleUsage] = useState<ShuttleUsageSummary>({
    totalUsed: 0,
    totalRemaining: 0,
  });

  useFocusEffect(
    useCallback(() => {
      fetchAllPlayerPayments().then((res) => {
        setPlayers(res);
      });
      fetchAllSessions().then((res) => {
        setRecentSessions(res.slice(-5).reverse());
      });
      fetchShuttleUsageSummary().then((res) => {
        setShuttleUsage(res);
      });
    }, []),
  );

  const totalOutstanding = players.reduce(
    (sum, player) => sum + player.total_owed_amount,
    0,
  );

  return (
    <SafeAreaView className="flex-1 bg-background-50">
      <PageHeader title="Home" />
      <ScrollView className="flex-1 px-4">
        <StatCard
          size="lg"
          className="mt-2"
          label="Total outstanding"
          value={`$${Math.abs(totalOutstanding).toFixed(2)}`}
          valueClassName="text-pink-700"
          highlightClassName="bg-pink-100"
        />
        <HStack space="md" className="mt-2">
          <StatCard
            className="flex-1"
            label="Total Shuttle Used"
            value={String(shuttleUsage.totalUsed)}
            valueClassName="text-warning-800"
            highlightClassName="bg-warning-100"
          />
          <StatCard
            className="flex-1"
            label="Remaining Shuttles"
            value={String(shuttleUsage.totalRemaining)}
            valueClassName="text-success-700"
            highlightClassName="bg-success-100"
          />
        </HStack>

        <HStack className="items-center justify-between mt-6 mb-2">
          <Heading size="md" className="text-typography-900">
            Recent Sessions
          </Heading>
        </HStack>
        {recentSessions.length === 0 ? (
          <Text size="sm" className="text-typography-500 py-4">
            No sessions yet
          </Text>
        ) : (
          <VStack space="sm">
            {recentSessions.map((session) => (
              <ListRow
                key={session.session_id}
                title={formatSessionTitle(session)}
                onPress={() =>
                  router.navigate(`/session/${session.session_id}`)
                }
              />
            ))}
          </VStack>
        )}

        <Button className="mt-6 mb-8" onPress={() => setIsShuttleOpen(true)}>
          <ButtonText>Add Shuttles</ButtonText>
        </Button>
      </ScrollView>
      <AddShuttleModal
        open={addShuttleIsOpen}
        onClose={() => setIsShuttleOpen(false)}
      />
    </SafeAreaView>
  );
}
