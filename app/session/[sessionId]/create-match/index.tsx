import { Court, SlotPosition } from "@/components/session/match/Court";
import { countSelectedShuttles, ShuttlesModal } from "@/components/session/match/selectShuttleModal";
import { SelectPlayerModal } from "@/components/session/match/selectUserModal";
import { ShuttleChip } from "@/components/session/match/ShuttleChip";
import { designTokens } from "@/components/ui/gluestack-ui-provider/config";
import { createNewMatch, ShuttleSelection } from "@/services/match";
import { fetchAllPlayers, Player } from "@/services/player";
import { fetchAllShuttles, Shuttle } from "@/services/shuttle";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "expo-router/react-navigation";
import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

const SLOT_TITLES: Record<SlotPosition, string> = {
  0: "Top left player",
  1: "Bottom left player",
  2: "Top right player",
  3: "Bottom right player",
};

export default function CreateNewMatchPage() {
  const { sessionId } = useLocalSearchParams();
  const sessionIdNumber = parseInt(sessionId.toString());
  const router = useRouter();

  const [selectedPlayers, setSelectedPlayers] = useState<(number | null)[]>(
    new Array(4).fill(null),
  );
  const [usedShuttles, setUsedShuttles] = useState<ShuttleSelection[]>([]);
  const [addedTypeIds, setAddedTypeIds] = useState<number[]>([]);
  const [shuttleList, setShuttleList] = useState<Shuttle[]>([]);
  const [playerList, setPlayerList] = useState<Player[]>([]);
  const [pickerPosition, setPickerPosition] = useState<SlotPosition | null>(null);
  const [shuttlesOpen, setShuttlesOpen] = useState(false);
  const [shuttlesModalKey, setShuttlesModalKey] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const fetchData = () => {
    fetchAllShuttles().then(setShuttleList);
    fetchAllPlayers().then(setPlayerList);
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, []),
  );

  const hasTop = selectedPlayers[0] !== null || selectedPlayers[2] !== null;
  const hasBottom = selectedPlayers[1] !== null || selectedPlayers[3] !== null;
  const canStart = hasTop && hasBottom && !isSaving;
  const startHint = !hasTop && !hasBottom
    ? "Add a player to each side to start"
    : "Add an opponent to start";

  const takenByOtherSlots = selectedPlayers.filter(
    (playerId, index) => index !== pickerPosition && playerId !== null,
  );
  const availablePlayers = playerList.filter(
    (p) => !takenByOtherSlots.includes(p.player_id),
  );

  const setSlot = (position: SlotPosition, playerId: number | null) => {
    setSelectedPlayers((prev) => {
      const updated = [...prev];
      updated[position] = playerId;
      return updated;
    });
    setPickerPosition(null);
  };

  const openShuttles = () => {
    setShuttlesModalKey((key) => key + 1);
    setShuttlesOpen(true);
  };

  async function onClickSave() {
    if (!canStart) return;
    setIsSaving(true);
    await createNewMatch({
      sessionId: sessionIdNumber,
      playersId: selectedPlayers as number[],
      shuttleSelections: usedShuttles,
    });
    router.back();
  }

  return (
    <View className="flex-1 bg-surface">
      <Stack.Screen
        options={{
          title: "",
          headerBackButtonDisplayMode: "minimal",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: designTokens.surface },
          headerTintColor: designTokens.primary,
        }}
      />
      <ScrollView className="flex-1" contentContainerClassName="px-4 pb-10">
        <View className="mb-4 flex-row items-center justify-between gap-3">
          <Text className="text-screen-title font-semibold text-ink">New match</Text>
          {shuttleList.length > 0 && (
            <ShuttleChip count={countSelectedShuttles(usedShuttles)} onPress={openShuttles} />
          )}
        </View>

        {shuttleList.length === 0 && (
          <Text className="mb-4 text-body text-muted">Add a shuttle first to proceed</Text>
        )}

        <Court
          selectedPlayers={selectedPlayers}
          players={playerList}
          onSelectSlot={setPickerPosition}
        />

        <Pressable
          onPress={onClickSave}
          disabled={!canStart}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canStart }}
          testID="start-match"
          className={`mt-4 items-center rounded-lg py-[11px] ${canStart ? "bg-primary active:opacity-85" : "bg-disabled"}`}
        >
          <Text className={`text-body font-medium ${canStart ? "text-surface" : "text-muted"}`}>
            Start match
          </Text>
        </Pressable>
        {!hasTop || !hasBottom ? (
          <Text className="mt-2 text-center text-caption text-muted" testID="start-match-hint">
            {startHint}
          </Text>
        ) : null}
      </ScrollView>

      <SelectPlayerModal
        open={pickerPosition !== null}
        title={pickerPosition !== null ? SLOT_TITLES[pickerPosition] : ""}
        players={availablePlayers}
        selectedPlayer={pickerPosition !== null ? selectedPlayers[pickerPosition] : null}
        onClose={() => setPickerPosition(null)}
        onSelect={(playerId) => {
          if (pickerPosition !== null) setSlot(pickerPosition, playerId);
        }}
        onClear={
          pickerPosition !== null && selectedPlayers[pickerPosition] !== null
            ? () => setSlot(pickerPosition, null)
            : undefined
        }
      />

      <ShuttlesModal
        key={shuttlesModalKey}
        open={shuttlesOpen}
        sessionId={sessionIdNumber}
        selection={usedShuttles}
        addedTypeIds={addedTypeIds}
        onCancel={() => setShuttlesOpen(false)}
        onDone={(selection, added) => {
          setUsedShuttles(selection);
          setAddedTypeIds(added);
          setShuttlesOpen(false);
        }}
      />
    </View>
  );
}
