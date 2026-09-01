import { SelectPlayerModal } from "@/components/session/match/selectUserModal";
import { Player } from "@/services/player";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";

export function TeamSlot({
  positions,
  selectedPlayers,
  playerList,
  onSelectPlayer,
}: {
  positions: [number, number];
  selectedPlayers: (string | null)[];
  playerList: Player[];
  onSelectPlayer: (position: number, playerId: string) => void;
}) {
  const [openForPosition, setOpenForPosition] = useState<number | null>(null);

  const [firstPos, secondPos] = positions;
  const firstPlayer = selectedPlayers[firstPos];
  const secondPlayer = selectedPlayers[secondPos];

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
    <>
      <View className="flex-row gap-6">
        <Pressable
          onPress={() => openModalFor(firstPos)}
          style={{ flex: 1, height: 120 }}
          className={
            firstPlayer
              ? "items-center justify-center rounded-xl border border-primary-500 bg-primary-50 px-2 py-5"
              : "items-center justify-center rounded-xl border border-outline-100 bg-background-0 px-2 py-5"
          }
        >
          <Text
            numberOfLines={1}
            className={
              firstPlayer
                ? "text-base font-bold text-primary-700"
                : "text-base font-bold text-typography-900"
            }
          >
            {firstPlayer ? nameFor(firstPlayer) : "+"}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => openModalFor(secondPos)}
          style={{ flex: 1, height: 120 }}
          className={
            secondPlayer
              ? "items-center justify-center rounded-xl border border-primary-500 bg-primary-50 px-2 py-5"
              : "items-center justify-center rounded-xl border border-outline-100 bg-background-0 px-2 py-5"
          }
        >
          <Text
            numberOfLines={1}
            className={
              secondPlayer
                ? "text-base font-bold text-primary-700"
                : "text-base font-bold text-typography-900"
            }
          >
            {secondPlayer ? nameFor(secondPlayer) : "+"}
          </Text>
        </Pressable>
      </View>

      <SelectPlayerModal
        players={availablePlayers}
        selectedPlayer={
          openForPosition !== null
            ? selectedPlayers[openForPosition]
            : undefined
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
    </>
  );
}
