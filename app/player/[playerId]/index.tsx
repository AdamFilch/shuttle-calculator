import { ListRow } from "@/components/layout/ListRow";
import { PageHeader } from "@/components/layout/PageHeader";
import { PaymentConfirmationDialog } from "@/components/shared/PaymentConfirmationDialog";
import { Button, ButtonText } from "@/components/ui/button";
import {
  Checkbox,
  CheckboxIcon,
  CheckboxIndicator,
} from "@/components/ui/checkbox";
import { HStack } from "@/components/ui/hstack";
import {
  CheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Icon,
} from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { DeletePlayerDialog } from "@/components/user/deletePlayerDialog";
import {
  deletePlayer,
  fetchPlayerById,
  fetchShuttlePaymentsByPlayerSessions,
  Player,
  ShuttleInstanceCharge,
  ShuttlePaymentsByPlayerSessions,
} from "@/services/player";
import {
  payCourtBySessionId,
  paySessionInFull,
  payShuttleInstancesByIds,
} from "@/services/shuttle-payments";
import { DisplayTimeDDDASHMMDASHYYYY } from "@/services/time-display";
import { useFocusEffect } from "expo-router/react-navigation";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type PendingAction =
  | { type: "all"; sessionId: number; amount: number }
  | { type: "court"; sessionId: number; amount: number }
  | { type: "shuttles" };

export default function SelectPlayerPage() {
  const { playerId } = useLocalSearchParams();
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [shuttlePayments, setShuttlePayments] =
    useState<ShuttlePaymentsByPlayerSessions | null>(null);
  const [selectShuttleMode, toggleShuttleMode] = useState(false);
  const [selectedCharges, setSelectedCharges] = useState<
    ShuttleInstanceCharge[]
  >([]);
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(
    new Set(),
  );
  const [expandedMatches, setExpandedMatches] = useState<Set<number>>(
    new Set(),
  );
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchPlayerAndShuttles();
    }, [playerId]),
  );

  const fetchPlayerAndShuttles = async () => {
    fetchPlayerById(playerId.toString()).then((res) => {
      setPlayer(res[0]);
      fetchShuttlePaymentsByPlayerSessions(res[0].player_id).then((res) => {
        setShuttlePayments(res);
      });
    });
  };

  const toggleSession = (sessionId: number) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  };

  const toggleMatch = (matchId: number) => {
    setExpandedMatches((prev) => {
      const next = new Set(prev);
      if (next.has(matchId)) next.delete(matchId);
      else next.add(matchId);
      return next;
    });
  };

  const toggleCharge = (charge: ShuttleInstanceCharge) => {
    setSelectedCharges((prev) =>
      prev.some((v) => v.shuttle_instance_id === charge.shuttle_instance_id)
        ? prev.filter(
            (v) => v.shuttle_instance_id !== charge.shuttle_instance_id,
          )
        : [...prev, charge],
    );
  };

  const handleConfirm = async () => {
    if (!pendingAction) return;

    if (pendingAction.type === "all") {
      await paySessionInFull({
        sessionId: pendingAction.sessionId,
        player_id: playerId.toString(),
      });
    } else if (pendingAction.type === "court") {
      await payCourtBySessionId({
        sessionId: pendingAction.sessionId,
        player_id: playerId.toString(),
      });
    } else {
      await payShuttleInstancesByIds({
        shuttleCharges: selectedCharges,
        player_id: playerId.toString(),
      });
      setSelectedCharges([]);
      toggleShuttleMode(false);
    }

    setPendingAction(null);
    fetchPlayerAndShuttles();
  };

  if (!player) {
    return (
      <SafeAreaView className="flex-1 bg-background-50 items-center justify-center">
        <ActivityIndicator size="large" color="#0F9D82" />
      </SafeAreaView>
    );
  }

  const sessionsOwed = (shuttlePayments?.sessions ?? []).filter(
    (session) => session.shuttle_total_owed > 0 || session.court_total_owed > 0,
  );

  const totalOwed = (shuttlePayments?.sessions ?? []).reduce(
    (acc, session) =>
      acc + session.shuttle_total_owed + session.court_total_owed,
    0,
  );

  const handleDeleteConfirm = async () => {
    try {
      await deletePlayer(player.player_id);
      setShowDeleteConfirm(false);
      router.back();
    } catch (e: any) {
      setShowDeleteConfirm(false);
      Alert.alert(
        "Cannot Delete Player",
        e?.message ?? "Something went wrong.",
      );
    }
  };

  return (
    <View className="flex-1 bg-background-50">
      <PageHeader
        title={player.name}
        action={{
          label: "Delete",
          variant: "negative",
          isDisabled: totalOwed > 0,
          onPress: () => setShowDeleteConfirm(true),
        }}
      />
      <ScrollView className="flex-1 px-4">
        <VStack space="md" className="pb-8 pt-2">
          {sessionsOwed.length > 0 && (
            <HStack space="sm">
              {selectShuttleMode ? (
                <>
                  <Button
                    isDisabled={selectedCharges.length === 0}
                    onPress={() => {
                      setPendingAction({ type: "shuttles" });
                    }}
                  >
                    <ButtonText>
                      Pay Selected ({selectedCharges.length})
                    </ButtonText>
                  </Button>
                  <Button
                    variant="outline"
                    action="secondary"
                    onPress={() => {
                      setSelectedCharges([]);
                      toggleShuttleMode(false);
                    }}
                  >
                    <ButtonText>Cancel</ButtonText>
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  action="secondary"
                  onPress={() => {
                    toggleShuttleMode(true);
                  }}
                >
                  <ButtonText>Pay Shuttles Individually</ButtonText>
                </Button>
              )}
            </HStack>
          )}

          {sessionsOwed.length === 0 ? (
            <Text size="sm" className="text-typography-500 py-4">
              Nothing owed.
            </Text>
          ) : (
            sessionsOwed.map((session) => {
              const sessionTotal =
                session.shuttle_total_owed + session.court_total_owed;
              const isExpanded = expandedSessions.has(session.session_id);

              return (
                <VStack key={session.session_id} space="sm">
                  <ListRow
                    title={
                      session.name === ""
                        ? (DisplayTimeDDDASHMMDASHYYYY(session.date) ?? "")
                        : session.name
                    }
                    subtitle={`Total owed: $${sessionTotal.toFixed(2)}`}
                    trailing={
                      <Icon
                        as={isExpanded ? ChevronDownIcon : ChevronRightIcon}
                        className="text-typography-500"
                      />
                    }
                    onPress={() => toggleSession(session.session_id)}
                  />

                  {isExpanded && (
                    <VStack space="sm" className="pl-3">
                      <HStack space="sm">
                        <Button
                          size="sm"
                          onPress={() => {
                            setPendingAction({
                              type: "all",
                              sessionId: session.session_id,
                              amount: sessionTotal,
                            });
                          }}
                        >
                          <ButtonText>
                            Pay All (${sessionTotal.toFixed(2)})
                          </ButtonText>
                        </Button>
                        {session.court_total_owed > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            action="secondary"
                            onPress={() => {
                              setPendingAction({
                                type: "court",
                                sessionId: session.session_id,
                                amount: session.court_total_owed,
                              });
                            }}
                          >
                            <ButtonText>
                              Pay Court Only ($
                              {session.court_total_owed.toFixed(2)})
                            </ButtonText>
                          </Button>
                        )}
                      </HStack>

                      {session.matches.length === 0 ? (
                        <Text size="sm" className="text-typography-500">
                          No shuttle charges this session.
                        </Text>
                      ) : (
                        session.matches.map((match) => {
                          const matchOwed = match.charges.reduce(
                            (acc, c) => acc + c.owed_amount,
                            0,
                          );
                          const isMatchExpanded = expandedMatches.has(
                            match.match_id,
                          );

                          return (
                            <VStack key={match.match_id} space="xs">
                              <ListRow
                                title={`Match ${match.match_number + 1}`}
                                subtitle={`${DisplayTimeDDDASHMMDASHYYYY(match.date) ?? ""} · ${match.charges.length} shuttle${match.charges.length === 1 ? "" : "s"} · $${matchOwed.toFixed(2)}`}
                                trailing={
                                  <Icon
                                    as={
                                      isMatchExpanded
                                        ? ChevronDownIcon
                                        : ChevronRightIcon
                                    }
                                    className="text-typography-400"
                                  />
                                }
                                onPress={() => toggleMatch(match.match_id)}
                              />

                              {isMatchExpanded && (
                                <VStack space="xs" className="pl-3">
                                  <Text
                                    size="xs"
                                    className="text-typography-500"
                                  >
                                    Players:{" "}
                                    {match.players.length > 0
                                      ? match.players
                                          .map((p) => p.name)
                                          .join(", ")
                                      : "None recorded"}
                                  </Text>
                                  {match.charges.map((charge) => {
                                    const isSelected = selectedCharges.some(
                                      (v) =>
                                        v.shuttle_instance_id ===
                                        charge.shuttle_instance_id,
                                    );
                                    const isPaid = charge.date_paid !== null;

                                    return (
                                      <ListRow
                                        key={charge.shuttle_instance_id}
                                        title={charge.name}
                                        subtitle={
                                          isPaid
                                            ? "Paid"
                                            : `$${charge.owed_amount.toFixed(2)}`
                                        }
                                        selected={
                                          selectShuttleMode && isSelected
                                        }
                                        trailing={
                                          selectShuttleMode && !isPaid ? (
                                            <Checkbox
                                              value={String(
                                                charge.shuttle_instance_id,
                                              )}
                                              isChecked={isSelected}
                                              onChange={() =>
                                                toggleCharge(charge)
                                              }
                                            >
                                              <CheckboxIndicator>
                                                <CheckboxIcon as={CheckIcon} />
                                              </CheckboxIndicator>
                                            </Checkbox>
                                          ) : undefined
                                        }
                                        onPress={
                                          selectShuttleMode && !isPaid
                                            ? () => toggleCharge(charge)
                                            : undefined
                                        }
                                      />
                                    );
                                  })}
                                </VStack>
                              )}
                            </VStack>
                          );
                        })
                      )}
                    </VStack>
                  )}
                </VStack>
              );
            })
          )}
        </VStack>

        <PaymentConfirmationDialog
          isOpen={pendingAction !== null}
          onClose={() => setPendingAction(null)}
          onConfirm={handleConfirm}
          title={
            pendingAction?.type === "all"
              ? "Pay Session in Full"
              : pendingAction?.type === "court"
                ? "Pay Court Only"
                : "Pay Selected Shuttles"
          }
          description={
            pendingAction?.type === "all"
              ? "This pays off every remaining shuttle and court charge for this session. This action is irreversible."
              : pendingAction?.type === "court"
                ? "This pays only the court cost for this session -- shuttle charges are left unpaid. This action is irreversible."
                : "This pays the selected shuttle charges only. This action is irreversible."
          }
          amount={
            pendingAction?.type === "all" || pendingAction?.type === "court"
              ? pendingAction.amount
              : selectedCharges.reduce((acc, c) => acc + c.owed_amount, 0)
          }
          confirmLabel="Confirm Payment"
        />

        <DeletePlayerDialog
          player={showDeleteConfirm ? player : null}
          onClose={() => setShowDeleteConfirm(false)}
          onConfirm={handleDeleteConfirm}
        />
      </ScrollView>
    </View>
  );
}
