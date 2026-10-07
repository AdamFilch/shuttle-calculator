import { designTokens } from "@/components/ui/gluestack-ui-provider/config"
import { Player } from "@/services/player"
import { useState } from "react"
import { Pressable, Text, TextInput, useWindowDimensions, View } from "react-native"
import { CourtSide } from "./Court"
import { TrophyGlyph } from "./TrophyGlyph"

export type MatchSide = { side: CourtSide, players: Player[], names: string }

const DOT_CLASS = {
    primary: "bg-primary",
    clay: "bg-clay",
    sage: "bg-sage",
    muted: "bg-muted",
}

function Banner({ winner, level, score }: { winner: MatchSide | null, level: boolean, score: string | null }) {
    if (winner) {
        return (
            <View accessibilityLiveRegion="polite" className="flex-row items-center gap-3 rounded-lg bg-settled-tint p-3">
                <View className="h-10 w-10 items-center justify-center rounded-full bg-sage">
                    <TrophyGlyph colour={designTokens["on-sage"]} size={20} />
                </View>
                <View className="flex-1">
                    <Text className="text-card-title font-semibold text-ink">{`${winner.names} won`}</Text>
                    <Text className="text-body text-settled" style={{ fontVariant: ["tabular-nums"] }}>
                        {score ?? "No score entered"}
                    </Text>
                </View>
            </View>
        )
    }
    return (
        <View accessibilityLiveRegion="polite" className="rounded-lg border border-dashed border-border-dashed p-3">
            <Text className="text-card-title font-medium text-ink">{level ? "Scores are level" : "No result yet"}</Text>
            <Text className="text-caption text-muted">
                {level ? "Change a score, or tap the side that won." : "Tap the side that won, or enter the score."}
            </Text>
        </View>
    )
}

function SideButton({ side, selected, onPress }: { side: MatchSide, selected: boolean, onPress: () => void }) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${side.names}. ${selected ? "Won" : "Tap if they won"}`}
            testID={`winner-${side.side}`}
            className={`min-h-[56px] flex-1 gap-1 rounded-lg px-3 py-2.5 ${selected ? "border-2 border-sage bg-settled-tint" : "m-px border border-border bg-surface-raised"}`}
        >
            <View className="flex-row">
                {side.players.map((player, i) => (
                    <View
                        key={player.player_id}
                        className={`h-[18px] w-[18px] rounded-full border-2 border-surface-raised ${DOT_CLASS[player.avatar_colour ?? "muted"]}`}
                        style={i > 0 ? { marginLeft: -6 } : undefined}
                    />
                ))}
            </View>
            <Text className="text-body font-medium text-ink" numberOfLines={2}>{side.names}</Text>
            <Text className={`text-caption ${selected ? "font-medium text-settled" : "text-muted"}`}>
                {selected ? "Won" : "Tap if they won"}
            </Text>
        </Pressable>
    )
}

function ScoreInput({ side, value, onChange }: { side: MatchSide, value: string, onChange: (value: string) => void }) {
    const [focused, setFocused] = useState(false)
    return (
        <View className="flex-1 gap-1">
            <Text className="text-caption text-muted" numberOfLines={1}>{side.names}</Text>
            <TextInput
                value={value}
                onChangeText={(text) => onChange(text.replace(/\D/g, ""))}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="0"
                placeholderTextColor={designTokens["border-dashed"]}
                accessibilityLabel={`${side.names} score`}
                testID={`score-${side.side}`}
                className={`h-12 rounded-lg bg-surface-raised text-center text-[20px] font-semibold text-ink ${focused ? "border-2 border-primary" : "m-px h-[46px] border border-border"}`}
                style={{ fontVariant: ["tabular-nums"] }}
            />
        </View>
    )
}

export function MatchResultCard({
    top,
    bottom,
    winner,
    level,
    topScore,
    bottomScore,
    showClear,
    onToggle,
    onChangeScore,
    onClear,
}: {
    top: MatchSide,
    bottom: MatchSide,
    winner: CourtSide | null,
    level: boolean,
    topScore: string,
    bottomScore: string,
    showClear: boolean,
    onToggle: (side: CourtSide) => void,
    onChangeScore: (side: CourtSide, value: string) => void,
    onClear: () => void
}) {
    const { fontScale } = useWindowDimensions()
    const winningSide = winner === "top" ? top : winner === "bottom" ? bottom : null
    const bothScores = topScore !== "" && bottomScore !== ""
    const score = winner && bothScores
        ? winner === "top" ? `${topScore}–${bottomScore}` : `${bottomScore}–${topScore}`
        : null

    return (
        <View className="gap-4 rounded-xl border border-border-subtle bg-surface-raised p-4" testID="match-result-card">
            <View className="min-h-[24px] flex-row items-center justify-between">
                <Text className="text-section-label font-medium uppercase text-muted" accessibilityRole="header">
                    Result
                </Text>
                {showClear ? (
                    <Pressable
                        onPress={onClear}
                        accessibilityRole="button"
                        hitSlop={10}
                        testID="clear-result"
                        className="active:opacity-85"
                    >
                        <Text className="text-body font-medium text-primary">Clear</Text>
                    </Pressable>
                ) : null}
            </View>

            <Banner winner={winningSide} level={level} score={score} />

            <View className="gap-2">
                <Text className="text-caption text-muted">Who won?</Text>
                <View className={fontScale > 1.3 ? "gap-2" : "flex-row gap-2"}>
                    <SideButton side={top} selected={winner === "top"} onPress={() => onToggle("top")} />
                    <SideButton side={bottom} selected={winner === "bottom"} onPress={() => onToggle("bottom")} />
                </View>
            </View>

            <View className="gap-2">
                <Text className="text-caption text-muted">Score (optional)</Text>
                <View className="flex-row items-end gap-3">
                    <ScoreInput side={top} value={topScore} onChange={(value) => onChangeScore("top", value)} />
                    <Text className="pb-3 text-body text-muted">–</Text>
                    <ScoreInput side={bottom} value={bottomScore} onChange={(value) => onChangeScore("bottom", value)} />
                </View>
                <Text className="text-caption text-muted">
                    The higher score picks the winner. Results aren&apos;t saved yet.
                </Text>
            </View>
        </View>
    )
}
