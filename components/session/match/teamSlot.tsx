import { SelectPlayerModal } from "@/components/session/match/selectUserModal";
import { Player } from "@/services/player";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

export function TeamSlot({
  label,
  positions,
  selectedPlayers,
  playerList,
  onSelectPlayer,
}: {
  label: string;
  positions: [number, number];
  selectedPlayers: (string | null)[];
  playerList: Player[];
  onSelectPlayer: (position: number, playerId: string) => void;
}) {
  const [openForPosition, setOpenForPosition] = useState<number | null>(null);

  const [firstPos, secondPos] = positions;
  const firstPlayer = selectedPlayers[firstPos];
  const secondPlayer = selectedPlayers[secondPos];
  const filledCount = [firstPlayer, secondPlayer].filter(Boolean).length;

  const openModalFor = (position: number) => {
    setOpenForPosition(position);
  };

  const nameFor = (playerId: string | null) =>
    playerId
      ? playerList.find((p) => p.player_id == parseInt(playerId))?.name
      : null;

  const otherPositionsTakenIds = selectedPlayers
    .filter((playerId, idx) => idx !== openForPosition && playerId !== null)
    .map((playerId) => parseInt(playerId));

  const availablePlayers = playerList.filter(
    (p) => !otherPositionsTakenIds.includes(p.player_id),
  );

  return (
    <View className="rounded-xl border border-outline-100 bg-background-0 p-3 gap-2">
      <Text className="text-sm font-bold text-typography-900">{label}</Text>

      {filledCount === 0 && (
        <Pressable
          onPress={() => openModalFor(firstPos)}
          className="items-center justify-center rounded-xl border border-outline-100 bg-background-0 px-2 py-4"
        >
          <Text className="text-base font-bold text-typography-900">
            Add Player
          </Text>
        </Pressable>
      )}

      {filledCount === 1 && (
        <View className="flex-row gap-2">
          <Pressable
            onPress={() =>
              openModalFor(firstPlayer ? firstPos : secondPos)
            }
            style={{ flex: 7 }}
            className="items-center justify-center rounded-xl border border-primary-500 bg-primary-50 px-2 py-4"
          >
            <Text
              numberOfLines={1}
              className="text-base font-bold text-primary-700"
            >
              {nameFor(firstPlayer) ?? nameFor(secondPlayer)}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => openModalFor(firstPlayer ? secondPos : firstPos)}
            style={{ flex: 3 }}
            className="items-center justify-center rounded-xl border border-outline-100 bg-background-0 px-2 py-4"
          >
            <Text className="text-base font-bold text-typography-900">+</Text>
          </Pressable>
        </View>
      )}

      {filledCount === 2 && (
        <View className="flex-row gap-2">
          <Pressable
            onPress={() => openModalFor(firstPos)}
            style={{ flex: 1 }}
            className="items-center justify-center rounded-xl border border-primary-500 bg-primary-50 px-2 py-4"
          >
            <Text
              numberOfLines={1}
              className="text-base font-bold text-primary-700"
            >
              {nameFor(firstPlayer)}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => openModalFor(secondPos)}
            style={{ flex: 1 }}
            className="items-center justify-center rounded-xl border border-primary-500 bg-primary-50 px-2 py-4"
          >
            <Text
              numberOfLines={1}
              className="text-base font-bold text-primary-700"
            >
              {nameFor(secondPlayer)}
            </Text>
          </Pressable>
        </View>
      )}

      <SelectPlayerModal
        players={availablePlayers}
        selectedPlayer={
          openForPosition !== null ? selectedPlayers[openForPosition] : undefined
        }
        open={openForPosition !== null}
        onClose={() => setOpenForPosition(null)}
        onSelect={(playerId) => {
          if (openForPosition !== null) {
            onSelectPlayer(openForPosition, playerId);
          }
          setOpenForPosition(null);
        }}
      />
    </View>
  );
}
