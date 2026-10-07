import { Avatar } from "@/components/shared/Avatar"
import { designTokens } from "@/components/ui/gluestack-ui-provider/config"
import { AddIcon, Icon } from "@/components/ui/icon"
import { AvatarColour, Player } from "@/services/player"
import { DimensionValue, Pressable, Text, View } from "react-native"
import Animated, { useReducedMotion } from "react-native-reanimated"
import { TrophyGlyph } from "./TrophyGlyph"

export type SlotPosition = 0 | 1 | 2 | 3

export type CourtSide = "top" | "bottom"

const SIDE_POSITIONS: Record<CourtSide, SlotPosition[]> = {
    top: [0, 2],
    bottom: [1, 3],
}

const SLOT_LABELS: Record<SlotPosition, string> = {
    0: "Top left",
    1: "Bottom left",
    2: "Top right",
    3: "Bottom right",
}

const FILLED_SLOT_CLASS: Record<AvatarColour, string> = {
    primary: "bg-primary/30",
    clay: "bg-clay/30",
    sage: "bg-sage/30",
    muted: "bg-muted/30",
}

function withAlpha(hex: string, alpha: number): string {
    const value = hex.replace("#", "")
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16))
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

const LABEL_SHADOW = {
    textShadowColor: withAlpha(designTokens.ink, 0.35),
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
}

const SLOT_SHADOW = {
    shadowColor: designTokens.ink,
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
}

function VerticalLine({ left }: { left: DimensionValue }) {
    return (
        <View
            pointerEvents="none"
            className="absolute bottom-0 top-0 w-[2px] -ml-px bg-court-line"
            style={{ left }}
        />
    )
}

function HorizontalLine({ top }: { top: DimensionValue }) {
    return (
        <View
            pointerEvents="none"
            className="absolute left-0 right-0 h-[2px] -mt-px bg-court-line"
            style={{ top }}
        />
    )
}

function DashedLine({ top }: { top: DimensionValue }) {
    return (
        <View
            pointerEvents="none"
            className="absolute left-0 right-0 h-[2px] -mt-px flex-row overflow-hidden"
            style={{ top, gap: 4 }}
        >
            {Array.from({ length: 60 }, (_, i) => (
                <View key={i} className="h-[2px] w-[7px] bg-court-line" />
            ))}
        </View>
    )
}

function Net() {
    return (
        <View
            pointerEvents="none"
            className="absolute h-2 -mt-1 justify-center rounded-full bg-ink"
            style={{ top: "50%", left: "1.4%", right: "1.4%" }}
        >
            <View className="absolute -left-1 h-3 w-3 rounded-full bg-ink" />
            <View className="absolute -right-1 h-3 w-3 rounded-full bg-ink" />
            <View className="mx-2.5 h-[2px] flex-row overflow-hidden opacity-85" style={{ gap: 3 }}>
                {Array.from({ length: 120 }, (_, i) => (
                    <View key={i} className="h-[2px] w-[2px] bg-court-line" />
                ))}
            </View>
        </View>
    )
}

function ReadOnlySlot({
    player,
    solo,
    result,
}: {
    player: Player,
    solo: boolean,
    result: "winner" | "loser" | null
}) {
    const reduceMotion = useReducedMotion()
    const colour = designTokens[player.avatar_colour ?? "muted"]
    const won = result === "winner"

    return (
        <Animated.View
            style={[
                SLOT_SHADOW,
                {
                    flex: 1,
                    borderRadius: 8,
                    borderWidth: 3,
                    borderColor: won ? designTokens["court-line"] : "transparent",
                    backgroundColor: withAlpha(colour, won ? 0.5 : 0.3),
                    opacity: result === "loser" ? 0.45 : 1,
                    transitionProperty: ["opacity", "borderColor"],
                    transitionDuration: reduceMotion ? 0 : 200,
                    transitionTimingFunction: "ease-out",
                },
            ]}
        >
            <View className="flex-1 items-center justify-center gap-2 px-1">
                <Avatar name={player.name} colour={player.avatar_colour} size={solo ? "xl" : "md"} />
                <Text
                    className={`${solo ? "text-card-title" : "text-body"} font-semibold text-court-line`}
                    style={LABEL_SHADOW}
                    numberOfLines={1}
                >
                    {player.name}
                </Text>
            </View>
        </Animated.View>
    )
}

function WinnerPill({ side }: { side: CourtSide }) {
    return (
        <View
            pointerEvents="none"
            className="absolute left-0 right-0 items-center"
            style={side === "top" ? { top: -15 } : { bottom: -15 }}
        >
            <View className="flex-row items-center gap-1.5 rounded-full border-[3px] border-court-line bg-ink px-3 py-[5px]">
                <TrophyGlyph colour={designTokens["court-line"]} size={16} />
                <Text className="text-badge font-semibold text-court-line">Winner</Text>
            </View>
        </View>
    )
}

export function CourtSlot({
    position,
    player,
    onPress,
}: {
    position: SlotPosition,
    player: Player | null,
    onPress: () => void
}) {
    if (!player) {
        return (
            <Pressable
                onPress={onPress}
                accessibilityRole="button"
                accessibilityLabel={`${SLOT_LABELS[position]}: add player`}
                testID={`court-slot-${position}`}
                className="flex-1 items-center justify-center gap-0.5 rounded-md border border-dashed border-court-line bg-court-slot-empty active:opacity-85"
            >
                <Icon as={AddIcon} size="lg" className="text-court-line" />
                <Text className="text-body font-medium text-court-line" style={LABEL_SHADOW}>
                    Add player
                </Text>
            </Pressable>
        )
    }

    const colour = player.avatar_colour ?? "muted"

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={`${SLOT_LABELS[position]}: ${player.name}`}
            testID={`court-slot-${position}`}
            className={`flex-1 items-center justify-center gap-2 rounded-md px-1 active:opacity-85 ${FILLED_SLOT_CLASS[colour]}`}
            style={SLOT_SHADOW}
        >
            <Avatar name={player.name} colour={player.avatar_colour} />
            <Text
                className="text-body font-semibold text-court-line"
                style={LABEL_SHADOW}
                numberOfLines={1}
            >
                {player.name}
            </Text>
        </Pressable>
    )
}

export function Court({
    selectedPlayers,
    players,
    onSelectSlot,
    readOnly = false,
    winnerSide = null,
}: {
    selectedPlayers: (number | null)[],
    players: Player[],
    onSelectSlot?: (position: SlotPosition) => void,
    readOnly?: boolean,
    winnerSide?: CourtSide | null
}) {
    const playerAt = (position: SlotPosition): Player | null => {
        const playerId = selectedPlayers[position]
        if (playerId === null || playerId === undefined) return null
        return players.find((p) => p.player_id === playerId) ?? null
    }

    const half = (side: CourtSide) => {
        if (!readOnly) {
            return SIDE_POSITIONS[side].map((position) => (
                <CourtSlot
                    key={position}
                    position={position}
                    player={playerAt(position)}
                    onPress={() => onSelectSlot?.(position)}
                />
            ))
        }
        const filled = SIDE_POSITIONS[side].flatMap((position) => playerAt(position) ?? [])
        const result = winnerSide === null ? null : winnerSide === side ? "winner" : "loser"
        return filled.map((player) => (
            <ReadOnlySlot key={player.player_id} player={player} solo={filled.length === 1} result={result} />
        ))
    }

    const sideLabel = (side: CourtSide) => {
        const names = SIDE_POSITIONS[side].flatMap((position) => playerAt(position)?.name ?? [])
        const suffix = winnerSide === side ? (names.length > 1 ? ", winners" : ", winner") : ""
        return `${side === "top" ? "Top" : "Bottom"}: ${names.join(" and ")}${suffix}.`
    }

    return (
        <View
            className="w-full rounded-xl bg-court"
            style={{ aspectRatio: 806 / 1211 }}
            testID="court"
            accessible={readOnly || undefined}
            accessibilityLabel={readOnly ? `Court. ${sideLabel("top")} ${sideLabel("bottom")}` : undefined}
        >
            <View
                className="absolute border-4 border-court-line"
                style={{ top: "2.3%", bottom: "2.3%", left: "3.5%", right: "3.5%" }}
            >
                <VerticalLine left="7%" />
                <VerticalLine left="50%" />
                <VerticalLine left="93%" />
                <DashedLine top="5.2%" />
                <HorizontalLine top="42.4%" />
                <HorizontalLine top="57.6%" />
                <DashedLine top="94.8%" />
                <View
                    className="absolute flex-row p-0.5"
                    style={{ top: "5.2%", bottom: "57.6%", left: "7%", right: "7%", gap: 5 }}
                >
                    {half("top")}
                </View>
                <View
                    className="absolute flex-row p-0.5"
                    style={{ top: "57.6%", bottom: "5.2%", left: "7%", right: "7%", gap: 5 }}
                >
                    {half("bottom")}
                </View>
            </View>
            <Net />
            {readOnly && winnerSide ? <WinnerPill side={winnerSide} /> : null}
        </View>
    )
}
