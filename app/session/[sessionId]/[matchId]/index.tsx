import { PageHeader } from "@/components/layout/PageHeader";
import { Court, CourtSide } from "@/components/session/match/Court";
import { MatchResultCard, MatchSide } from "@/components/session/match/MatchResultCard";
import { MatchShuttleRow } from "@/components/session/match/MatchShuttleRow";
import { ShuttleGlyph } from "@/components/session/match/ShuttleGlyph";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/shared/Skeleton";
import { designTokens } from "@/components/ui/gluestack-ui-provider/config";
import { fetchMatchById, MatchFull } from "@/services/match";
import { DisplayDateDMonYYYY, DisplayTimeOfDay, parseSQLTimestamp } from "@/services/time-display";
import { Stack, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "expo-router/react-navigation";
import { Fragment, useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";

const headerOptions = {
    title: "",
    headerBackButtonDisplayMode: "minimal" as const,
    headerShadowVisible: false,
    headerStyle: { backgroundColor: designTokens.surface },
    headerTintColor: designTokens.primary,
};

function decide(topScore: string, bottomScore: string): CourtSide | "level" | null {
    if (topScore === "" || bottomScore === "") return null
    const top = Number(topScore)
    const bottom = Number(bottomScore)
    return top === bottom ? "level" : top > bottom ? "top" : "bottom"
}

function sideOf(match: MatchFull, side: CourtSide): MatchSide {
    const players = match.players.filter((p) => p.position % 2 === (side === "top" ? 0 : 1))
    return { side, players, names: players.map((p) => p.name).join(" & ") }
}

function formatOf(top: number, bottom: number) {
    if (top === 2 && bottom === 2) return "Doubles"
    if (top === 1 && bottom === 1) return "Singles"
    return "2 vs 1"
}

function LoadingSkeleton() {
    return (
        <View className="gap-6 px-4 pt-4" accessible accessibilityLabel="Loading match" testID="match-skeleton">
            <View className="gap-2">
                <Skeleton className="h-8 w-2/5" />
                <Skeleton className="h-4 w-3/5" />
            </View>
            <Skeleton className="h-72" />
            <Skeleton className="h-96" />
            <Skeleton className="h-16" />
        </View>
    )
}

export default function MatchPage() {
    const { matchId } = useLocalSearchParams()
    const id = matchId.toString()
    const [match, setMatch] = useState<MatchFull | null | undefined>(undefined)
    const [winnerSide, setWinnerSide] = useState<CourtSide | null>(null)
    const [topScore, setTopScore] = useState("")
    const [bottomScore, setBottomScore] = useState("")

    useFocusEffect(
        useCallback(() => {
            fetchMatchById(id).then(setMatch)
        }, [id])
    )

    if (!match) {
        return (
            <View className="flex-1 bg-surface">
                <Stack.Screen options={headerOptions} />
                {match === null ? (
                    <View className="px-4 pt-4">
                        <EmptyState title="Match not found" description="It may have been deleted." />
                    </View>
                ) : (
                    <LoadingSkeleton />
                )}
            </View>
        )
    }

    const top = sideOf(match, "top")
    const bottom = sideOf(match, "bottom")
    const decided = decide(topScore, bottomScore)
    const winner = decided === "level" ? null : decided ?? winnerSide
    const shuttleCount = match.shuttles.reduce((sum, s) => sum + s.quantity, 0)
    const date = parseSQLTimestamp(match.date)
    const selectedPlayers = [0, 1, 2, 3].map((position) =>
        match.players.find((p) => p.position === position)?.player_id ?? null
    )

    const toggle = (side: CourtSide) => {
        if (decided) {
            if (side !== winner) {
                setWinnerSide(side)
                setTopScore("")
                setBottomScore("")
            }
            return
        }
        setWinnerSide(winnerSide === side ? null : side)
    }

    const changeScore = (side: CourtSide, value: string) => {
        const nextTop = side === "top" ? value : topScore
        const nextBottom = side === "bottom" ? value : bottomScore
        setTopScore(nextTop)
        setBottomScore(nextBottom)
        const next = decide(nextTop, nextBottom)
        if (next === "top" || next === "bottom") setWinnerSide(next)
    }

    const clear = () => {
        setWinnerSide(null)
        setTopScore("")
        setBottomScore("")
    }

    return (
        <View className="flex-1 bg-surface">
            <Stack.Screen options={headerOptions} />
            <PageHeader
                title={`Match ${match.match_number + 1}`}
                subtitle={`${DisplayDateDMonYYYY(date)} · ${DisplayTimeOfDay(date)} · ${formatOf(top.players.length, bottom.players.length)}`}
            />
            <ScrollView className="flex-1" contentContainerClassName="gap-6 px-4 pb-10 pt-1" keyboardShouldPersistTaps="handled" testID="match-scroll">
                <MatchResultCard
                    top={top}
                    bottom={bottom}
                    winner={winner}
                    level={decided === "level"}
                    topScore={topScore}
                    bottomScore={bottomScore}
                    showClear={winnerSide !== null || topScore !== "" || bottomScore !== ""}
                    onToggle={toggle}
                    onChangeScore={changeScore}
                    onClear={clear}
                />

                <View className="py-3">
                    <Court selectedPlayers={selectedPlayers} players={match.players} readOnly winnerSide={winner} />
                </View>

                <View className="gap-2">
                    <View className="flex-row items-center justify-between">
                        <Text className="text-section-label font-medium uppercase text-muted" accessibilityRole="header">
                            Shuttles used
                        </Text>
                        <View className="flex-row items-center gap-1">
                            <ShuttleGlyph colour={designTokens["clay-strong"]} size={14} />
                            <Text className="text-body font-medium text-clay-strong">
                                {`${shuttleCount} ${shuttleCount === 1 ? "shuttle" : "shuttles"}`}
                            </Text>
                        </View>
                    </View>
                    <View className="rounded-xl border border-border-subtle bg-surface-raised" testID="match-shuttles">
                        {match.shuttles.map((shuttle, i) => (
                            <Fragment key={`${shuttle.shuttle_id}-${shuttle.origin}-${shuttle.from_match_number}`}>
                                {i > 0 ? <View className="mx-4 border-t border-dashed border-border-subtle" /> : null}
                                <MatchShuttleRow shuttle={shuttle} />
                            </Fragment>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </View>
    )
}
