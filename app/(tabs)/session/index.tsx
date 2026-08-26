import { ListRow } from "@/components/layout/ListRow";
import { PageHeader } from "@/components/layout/PageHeader";
import { AddSessionModal } from "@/components/session/modal";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { fetchAllSessions, formatSessionTitle, Session } from "@/services/session";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Image, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function SessionStatusIndicator({ status }: { status: "open" | "closed" }) {
  if (status === "open") {
    return (
      <Image
        source={require("@/assets/images/shuttlecock.png")}
        className="h-8 w-8 mr-4"
        style={{ transform: [{ rotate: "-90deg" }] }}
        resizeMode="contain"
      />
    );
  }

  return (
    <View className="rounded-full px-3 py-1 bg-background-200">
      <Text size="xs" bold className="text-typography-500">
        Closed
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
      title={formatSessionTitle(session)}
      subtitle={`${session.player_count} Player${session.player_count === 1 ? "" : "s"}`}
      trailing={<SessionStatusIndicator status={session.status} />}
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
