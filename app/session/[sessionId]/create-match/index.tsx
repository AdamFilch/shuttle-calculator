import { SelectShuttleButton } from "@/components/session/match/selectShuttleModal";
import { TeamSlot } from "@/components/session/match/teamSlot";
import { Button, ButtonText } from "@/components/ui/button";
import { createNewMatch, ShuttleSelection } from "@/services/match";
import { fetchAllPlayers, Player } from "@/services/player";
import { fetchAllShuttles, Shuttle } from "@/services/shuttle";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";

export default function CreateNewMatchPage() {
  const { sessionId } = useLocalSearchParams();
  const [selectedPlayers, setSelectedPlayers] = useState(
    new Array(4).fill(null),
  );
  const [usedShuttles, setUsedShuttles] = useState<ShuttleSelection[]>([]);
  const router = useRouter();

  const [shuttleList, setShuttleList] = useState<Shuttle[] | null>([]);
  const [playerList, setPlayerList] = useState<Player[] | null>([]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, []),
  );

  const fetchData = () => {
    fetchAllShuttles().then((res) => {
      setShuttleList(res);
    });
    fetchAllPlayers().then((res) => {
      setPlayerList(res);
    });
  };
  const hasAnyPlayer = selectedPlayers.some((playerId) => playerId !== null);

  async function onClickSave() {
    if (!hasAnyPlayer) return;

    await createNewMatch({
      sessionId: parseInt(sessionId.toString()),
      playersId: selectedPlayers, // [P1, P2, P3, P4] // TL BL TR BR
      shuttleSelections: usedShuttles,
    });
    router.back();
  }

  return (
    <ScrollView className=" p-5">
      <View
        style={{
          backgroundColor: "white",
        }}
      >
        <Text>Create Match Page</Text>
      </View>

      {shuttleList.length > 0 ? (
        <View>
          {/* <View style={{
                        backgroundColor: 'white'
                    }}>
                        <Text>Select Shuttle</Text>
                        <Text>Number of shuttle used</Text>
                    </View>
                    <Picker
                        ref={pickerRef}
                        selectedValue={selectedShuttle}
                        onValueChange={(itemValue, itemIndex) =>
                            setSelectedShuttle(itemValue)
                        }>
                        {shuttleList.map((shuttle) => (
                            <Picker.Item key={shuttle.shuttle_id} label={`${shuttle.name} (${shuttle.total_price} RM)`} value={shuttle.shuttle_id} />
                        ))}
                    </Picker> */}
          <SelectShuttleButton
            sessionId={parseInt(sessionId.toString())}
            selectedShuttles={usedShuttles}
            onSelect={(selected: ShuttleSelection) => {
              setUsedShuttles((prev) => {
                if (selected.mode === "new") {
                  const indexOfShuttleUsedBefore = prev.findIndex(
                    (el) =>
                      el.mode === "new" && el.shuttleId === selected.shuttleId,
                  );
                  if (indexOfShuttleUsedBefore !== -1) {
                    const updated = [...prev];
                    const existing = updated[indexOfShuttleUsedBefore];
                    if (existing.mode === "new") {
                      updated[indexOfShuttleUsedBefore] = {
                        ...existing,
                        quantity: existing.quantity + selected.quantity,
                      };
                    }
                    return updated;
                  }
                  return [...prev, selected];
                }

                if (selected.mode === "reused") {
                  const alreadySelected = prev.some(
                    (el) =>
                      el.mode === "reused" &&
                      el.shuttleInstanceId === selected.shuttleInstanceId,
                  );
                  if (alreadySelected) return prev;
                  return [...prev, selected];
                }

                return [...prev, selected];
              });
            }}
          />
        </View>
      ) : (
        <View>
          <Text>Add a shuttle first to proceed</Text>
        </View>
      )}
      <View
        style={{
          gap: 30,
        }}
      >
        <Text className="text-base font-bold text-typography-900">
          Select Players
        </Text>
        <View className="relative">
          <View className="border-2 border-primary-500 p-4">
            <View className="border-2 border-primary-500 p-4 gap-6">
              <TeamSlot
                positions={[0, 2]}
                selectedPlayers={selectedPlayers}
                playerList={playerList}
                onSelectPlayer={(position, playerId) => {
                  setSelectedPlayers((prev) => {
                    const updated = [...prev];
                    updated[position] = playerId;
                    return updated;
                  });
                }}
              />
              <TeamSlot
                positions={[1, 3]}
                selectedPlayers={selectedPlayers}
                playerList={playerList}
                onSelectPlayer={(position, playerId) => {
                  setSelectedPlayers((prev) => {
                    const updated = [...prev];
                    updated[position] = playerId;
                    return updated;
                  });
                }}
              />
            </View>
          </View>
          <View
            pointerEvents="none"
            className="absolute -left-3 -right-3 top-1/2  border-b-[3px] border-dashed border-primary-500"
          />
          <View
            pointerEvents="none"
            className="absolute border-t-2 -left-3 -right-3 top-[16px] border border-primary-500 mx-3"
          />
          <View
            pointerEvents="none"
            className="absolute border-t-2 -left-3 -right-3 bottom-[16px] border border-primary-500 mx-3"
          />
          <View
            pointerEvents="none"
            className="absolute border-t-2 left-[16px] top-0 bottom-0 border border-primary-500"
          />
          <View
            pointerEvents="none"
            className="absolute border-t-2 right-[16px] top-0 bottom-0 border border-primary-500"
          />
        </View>
        {/* {!hasAnyPlayer && (
          <Text style={{ backgroundColor: "white" }}>
            Add at least one player to the court to start a match.
          </Text>
        )} */}
        <Button
          isDisabled={!hasAnyPlayer}
          onPress={() => {
            onClickSave();
          }}
        >
          <ButtonText>Start Match!</ButtonText>
        </Button>
      </View>
    </ScrollView>
  );
}
