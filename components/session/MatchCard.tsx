import { ShuttleGlyph } from "@/components/session/match/ShuttleGlyph"
import { designTokens } from "@/components/ui/gluestack-ui-provider/config"
import { AvatarColour } from "@/services/player"
import { SessionMatches } from "@/services/session"
import { Pressable, Text, useWindowDimensions, View } from "react-native"

type SessionMatch = SessionMatches["matches"][number]
type MatchPlayer = SessionMatch["players"][number]

const DOT_CLASS: Record<AvatarColour, string> = {
    primary: "bg-primary",
    clay: "bg-clay",
    sage: "bg-sage",
    muted: "bg-muted",
}

function joinNames(players: MatchPlayer[], separator: string) {
    return players.map((player) => player.name).join(separator)
}

function Side({ players }: { players: MatchPlayer[] }) {
    return (
        <View className="flex-row flex-wrap items-center gap-1.5">
            <View className="flex-row">
                {players.map((player, index) => (
                    <View
                        key={player.player_id}
                        className={`h-5 w-5 rounded-full border-2 border-surface-raised ${DOT_CLASS[player.avatar_colour ?? "muted"]} ${index > 0 ? "-ml-1.5" : ""}`}
                    />
                ))}
            </View>
            <Text className="shrink text-body text-ink">{joinNames(players, " & ")}</Text>
        </View>
    )
}

export function splitTeams<T extends { position: number }>(players: T[]): [T[], T[]] {
    return [
        players.filter((player) => player.position === 0 || player.position === 2),
        players.filter((player) => player.position === 1 || player.position === 3),
    ]
}

export function shuttleNote(match: SessionMatch): string | null {
    const parts = match.reused_from.map(
        (reused) => `${reused.count} reused from match ${reused.match_number + 1}`,
    )
    if (match.free_count > 0) parts.push(`${match.free_count} free`)
    return parts.length > 0 ? parts.join(" · ") : null
}

export function MatchCard({
    match,
    startTime,
    onPress,
}: {
    match: SessionMatch,
    startTime?: string,
    onPress: () => void
}) {
    const [top, bottom] = splitTeams(match.players)
    const title = `Match ${match.match_number + 1}`
    const shuttleLabel = match.all_free
        ? "Free"
        : `${match.shuttle_count} ${match.shuttle_count === 1 ? "shuttle" : "shuttles"}`
    const isNeutralChip = match.all_free || match.shuttle_count === 0
    const note = shuttleNote(match)
    const { fontScale } = useWindowDimensions()
    const wrapHeader = fontScale >= 1.5

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={[
                title,
                `${joinNames(top, " and ")} versus ${joinNames(bottom, " and ")}`,
                match.all_free ? "free shuttles" : shuttleLabel,
                note,
            ].filter(Boolean).join(", ")}
            testID={`match-card-${match.match_number + 1}`}
        >
            {({ pressed }) => (
                <View
                    className={`gap-1.5 rounded-xl border border-border-subtle px-3.5 py-3 ${pressed ? "bg-primary-tint" : "bg-surface-raised"}`}
                >
                    <View className={`flex-row items-center justify-between gap-2 ${wrapHeader ? "flex-wrap" : ""}`}>
                        <View className={`flex-row flex-wrap items-baseline gap-x-2 ${wrapHeader ? "" : "flex-1"}`}>
                            <Text className="text-card-title font-medium text-ink">{title}</Text>
                            {startTime ? (
                                <Text className="text-caption text-muted">{startTime}</Text>
                            ) : null}
                        </View>
                        <View
                            className={`shrink-0 flex-row items-center gap-1 rounded-full py-1 pl-2 pr-2.5 ${isNeutralChip ? "bg-neutral-tint" : "bg-clay-tint"}`}
                        >
                            <ShuttleGlyph colour={isNeutralChip ? designTokens.muted : designTokens.clay} size={14} />
                            <Text
                                className={`text-badge font-medium ${isNeutralChip ? "text-muted" : "text-clay-strong"}`}
                                style={{ fontVariant: ["tabular-nums"] }}
                            >
                                {shuttleLabel}
                            </Text>
                        </View>
                    </View>
                    <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1.5">
                        <Side players={top} />
                        <Text className="text-badge font-medium uppercase text-muted">vs</Text>
                        <Side players={bottom} />
                    </View>
                    {note ? <Text className="text-caption text-muted">{note}</Text> : null}
                </View>
            )}
        </Pressable>
    )
}
