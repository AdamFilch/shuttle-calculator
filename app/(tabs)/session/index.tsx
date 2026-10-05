import { PageHeader } from "@/components/layout/PageHeader";
import { SessionCard } from "@/components/shared/SessionCard";
import { AddSessionModal } from "@/components/session/modal";
import { VStack } from "@/components/ui/vstack";
import { fetchAllSessions, SessionSummary } from "@/services/session";
import { useFocusEffect } from "expo-router/react-navigation";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SessionPage() {
  const router = useRouter();
  const [sessionsList, setSessionsList] = useState<SessionSummary[]>([]);
  const [addSessionIsOpen, setAddSessionIsOpen] = useState(false);
  const fetchSessions = async () => {
    fetchAllSessions().then((res) => {
      setSessionsList(res);
    });
  };

  useFocusEffect(
    useCallback(() => {
      fetchSessions();
    }, []),
  );

  const byNewestFirst = (a: SessionSummary, b: SessionSummary) =>
    new Date(b.date).getTime() - new Date(a.date).getTime();
  const sessionsListSorted = sessionsList.sort(byNewestFirst);

  const renderSessionCard = (session: SessionSummary) => (
    <SessionCard
      key={session.session_id}
      name={session.name}
      date={session.date}
      status={session.status}
      playerCount={session.player_count}
      shuttleCount={session.shuttle_count}
      outstandingAmount={session.outstanding_amount}
      onPress={() => {
        router.navigate(`/session/${session.session_id}`);
      }}
    />
  );

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <PageHeader
        title="Sessions"
        action={{
          label: "Add session",
          onPress: () => setAddSessionIsOpen(true),
        }}
      />
      <ScrollView className="flex-1 px-4">
        {sessionsListSorted.length == 0 ? (
          <Text className="text-body text-muted py-4">
            No sessions yet
          </Text>
        ) : (
          <VStack space="sm" className="pb-24 pt-2">
            {sessionsListSorted.map(renderSessionCard)}
          </VStack>
        )}
      </ScrollView>

      <AddSessionModal
        open={addSessionIsOpen}
        onClose={() => {
          setAddSessionIsOpen(false);
          fetchSessions();
        }}
      />
    </SafeAreaView>
  );
}
