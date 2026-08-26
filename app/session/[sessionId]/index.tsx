import { ListRow } from "@/components/layout/ListRow";
import { PageHeader } from "@/components/layout/PageHeader";
import { BookCourtModal } from "@/components/session/bookCourtModal";
import { PayByPlayerModal } from "@/components/session/modal";
import { PaymentConfirmationDialog } from "@/components/shared/PaymentConfirmationDialog";
import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import {
  closeSession,
  fetchSessionById,
  SessionMatches,
} from "@/services/session";
import {
  fetchAllShuttlesBySessionId,
  ShuttlesBySession,
} from "@/services/shuttle";
import { DisplayTimeDDDASHMMDASHYYYY } from "@/services/time-display";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SelectedSessionPage() {
  const router = useRouter();
  const { sessionId } = useLocalSearchParams();
  const [sessionMatches, setSessionMatches] = useState<SessionMatches | null>(
    null,
  );
  const [openPPPModal, setOpenPPPModal] = useState(false);
  const [shuttlesBySesison, setShuttlesBySession] =
    useState<ShuttlesBySession | null>(null);
  const [openBookCourtModal, setOpenBookCourtModal] = useState(false);
  const [openCloseConfirm, setOpenCloseConfirm] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchSession();
    }, [sessionId]),
  );

  const fetchSession = async () => {
    fetchSessionById(sessionId.toString()).then((res) => {
      setSessionMatches(res);
    });
    fetchAllShuttlesBySessionId(sessionId.toString(), false).then((res) => {
      setShuttlesBySession(res);
    });
  };

  if (!sessionMatches) {
    return (
      <SafeAreaView className="flex-1 bg-background-50 items-center justify-center">
        <ActivityIndicator size="large" color="#0F9D82" />
      </SafeAreaView>
    );
  }

  const sessionTitle =
    sessionMatches.name === "" || !sessionMatches.name
      ? (DisplayTimeDDDASHMMDASHYYYY(sessionMatches.date) ?? "")
      : sessionMatches.name;

  const isClosed = sessionMatches.status === "closed";

  const handleCloseSession = async () => {
    try {
      await closeSession(sessionId.toString());
      setOpenCloseConfirm(false);
      fetchSession();
    } catch (e: any) {
      setOpenCloseConfirm(false);
      Alert.alert(
        "Cannot Close Session",
        e?.message ?? "Something went wrong.",
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background-50">
      <PageHeader
        title={sessionTitle}
        subtitle={DisplayTimeDDDASHMMDASHYYYY(sessionMatches.date)}
        action={
          isClosed
            ? undefined
            : {
                label: "Add Match",
                onPress: () =>
                  router.navigate(
                    `/session/${sessionId.toString()}/create-match`,
                  ),
              }
        }
      />
      <ScrollView className="flex-1 px-4 pb-8">
        <View
          className={`self-start rounded-full px-3 py-1 mt-2 ${isClosed ? "bg-background-200" : "bg-primary-100"}`}
        >
          <Text
            size="sm"
            bold
            className={isClosed ? "text-typography-500" : "text-primary-700"}
          >
            {isClosed ? "Closed" : "Open"}
          </Text>
        </View>

        {/* <Button
          variant="outline"
          action="secondary"
          className="mt-2"
          onPress={() => setOpenPPPModal(true)}
        >
          <ButtonText>Pay Early</ButtonText>
        </Button> */}

        {!isClosed && (
          <Button
            variant="outline"
            action="secondary"
            className="mt-2"
            onPress={() => setOpenBookCourtModal(true)}
          >
            <ButtonText>Book Courts</ButtonText>
          </Button>
        )}

        {!isClosed && (
          <Button className="mt-2" onPress={() => setOpenCloseConfirm(true)}>
            <ButtonText>Close Session</ButtonText>
          </Button>
        )}

        <Heading size="md" className="text-typography-900 mt-6 mb-2">
          Matches
        </Heading>
        {sessionMatches.matches.length === 0 ? (
          <Text size="sm" className="text-typography-500 py-4">
            No matches yet
          </Text>
        ) : (
          <VStack space="sm">
            {sessionMatches.matches.map((match) => (
              <ListRow
                key={match.match_id}
                title={`Match ${match.match_number + 1}`}
                subtitle={[
                  DisplayTimeDDDASHMMDASHYYYY(match.match_date) ?? "",
                  match.players.map((p) => p.name).join(", "),
                ]
                  .filter(Boolean)
                  .join(" · ")}
                onPress={() => {
                  router.navigate(
                    `/session/${sessionId.toString()}/${match.match_id}`,
                  );
                }}
              />
            ))}
          </VStack>
        )}

        {shuttlesBySesison && shuttlesBySesison.shuttles.length > 0 && (
          <>
            <Heading size="md" className="text-typography-900 mt-6 mb-2">
              Shuttles Used
            </Heading>
            <VStack space="sm">
              {shuttlesBySesison.shuttles.map((shuttle) => (
                <ListRow
                  key={shuttle.shuttle_id}
                  title={shuttle.name}
                  subtitle={`${shuttle.total_quantity_used} used across ${shuttle.matches_used_in.length} match${shuttle.matches_used_in.length === 1 ? "" : "es"}`}
                />
              ))}
            </VStack>
          </>
        )}

        {sessionMatches.courts.length > 0 && (
          <>
            <Heading size="md" className="text-typography-900 mt-6 mb-2">
              Courts Booked
            </Heading>
            <VStack space="sm">
              {sessionMatches.courts.map((court) => (
                <ListRow
                  key={court.court_booking_id}
                  title={
                    court.label || `Court booking ${court.court_booking_id}`
                  }
                  subtitle={`$${court.price.toFixed(2)}`}
                  trailing={
                    court.quantity > 1 ? (
                      <Text size="sm" bold className="text-typography-500">
                        x {court.quantity}
                      </Text>
                    ) : undefined
                  }
                />
              ))}
            </VStack>
          </>
        )}
      </ScrollView>

      <PayByPlayerModal
        open={openPPPModal}
        onClose={() => {
          setOpenPPPModal(false);
        }}
        onConfirm={() => {}}
        sessionId={sessionId.toString()}
      />

      <BookCourtModal
        open={openBookCourtModal}
        onClose={() => {
          setOpenBookCourtModal(false);
          fetchSession();
        }}
        sessionId={sessionId.toString()}
      />

      <PaymentConfirmationDialog
        isOpen={openCloseConfirm}
        onClose={() => setOpenCloseConfirm(false)}
        onConfirm={handleCloseSession}
        title="Close Session"
        description="Closing this session locks in each player's share of the courts booked. This can't be undone."
        confirmLabel="Close Session"
      />
    </SafeAreaView>
  );
}
