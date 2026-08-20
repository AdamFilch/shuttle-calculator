import { ListRow } from "@/components/layout/ListRow";
import { PageHeader } from "@/components/layout/PageHeader";
import { AddSessionModal } from "@/components/session/modal";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { fetchAllSessions, Session } from "@/services/session";
import { DisplayTimeDDDASHMMDASHYYYY } from "@/services/time-display";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function SessionStatusPill({ status }: { status: "open" | "closed" }) {
  const isClosed = status === "closed";
  return (
    <View
      className={`rounded-full px-3 py-1 ${isClosed ? "bg-background-200" : "bg-primary-100"}`}
    >
      <Text
        size="xs"
        bold
        className={isClosed ? "text-typography-500" : "text-primary-700"}
      >
        {isClosed ? "Closed" : "Open"}
      </Text>
    </View>
  );
}

export default function SessionPage() {
  const router = useRouter();
  const [sessionsList, setSessionsList] = useState<Session[]>([]);
  const [addSessionIsOpen, setAddSessionIsOpen] = useState(false);
  useFocusEffect(
    useCallback(() => {
      fetchSessions();
    }, []),
  );

  const fetchSessions = async () => {
    fetchAllSessions().then((res) => {
      setSessionsList(res);
    });
  };

  const byNewestFirst = (a: Session, b: Session) =>
    new Date(b.date).getTime() - new Date(a.date).getTime();
  const sessionsListSorted = sessionsList.sort(byNewestFirst);

  const renderSessionRow = (session: Session) => (
    <ListRow
      key={session.session_id}
      title={
        session.name == "" || !session.name
          ? (DisplayTimeDDDASHMMDASHYYYY(session.date) ?? "")
          : session.name
      }
      trailing={<SessionStatusPill status={session.status} />}
      onPress={() => {
        router.navigate(`/session/${session.session_id}`);
      }}
    />
  );

  return (
    <SafeAreaView className="flex-1 bg-background-50">
      <PageHeader
        title="Sessions"
        action={{
          label: "Add Session",
          onPress: () => setAddSessionIsOpen(true),
        }}
      />
      <ScrollView className="flex-1 px-4">
        {sessionsListSorted.length == 0 ? (
          <Text size="sm" className="text-typography-500 py-4">
            No sessions yet
          </Text>
        ) : (
          <VStack space="md" className="pb-8 pt-2">
            <VStack space="sm">
              {sessionsListSorted.map(renderSessionRow)}
            </VStack>
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
