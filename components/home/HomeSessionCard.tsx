import { pluralise } from "@/components/shared/SessionCard"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { designTokens } from "@/components/ui/gluestack-ui-provider/config"
import { formatRM } from "@/services/money-display"
import { DisplayDateDMonYYYY, DisplayStartTime } from "@/services/time-display"
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons"
import { differenceInCalendarDays, format } from "date-fns"
import { Pressable, Text, useWindowDimensions, View } from "react-native"

type CardSession = {
    session_id: number,
    name: string,
    date: string,
    start_time: string | null,
    location: string | null,
    player_count: number,
    match_count: number,
    shuttle_count: number
}

export function relativeDay(date: string): string {
    const days = differenceInCalendarDays(new Date(), new Date(date))
    if (days <= 0) return "today"
    if (days === 1) return "yesterday"
    if (days <= 13) return `${days} days ago`
    return format(new Date(date), "d MMM")
}

function CardButton({ label, onPress, primary, flex }: { label: string, onPress: () => void, primary?: boolean, flex?: number }) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={flex ? { flex } : undefined}
            className={`min-h-12 flex-row items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 active:opacity-85 ${primary ? "bg-primary" : "border border-border bg-surface-raised"}`}
        >
            {primary ? <MaterialCommunityIcons name="plus" size={18} color={designTokens.surface} /> : null}
            <Text className={`text-center text-body font-medium ${primary ? "text-surface" : "text-ink"}`} maxFontSizeMultiplier={2}>
                {label}
            </Text>
        </Pressable>
    )
}

export function HomeSessionCard({
    session,
    estimate,
    lastSession,
    isStale,
    extraOpenCount = 0,
    onStart,
    onOpen,
    onNewMatch,
    onMoreOpen,
}: {
    session: CardSession | null,
    estimate?: number,
    lastSession?: { name: string, date: string } | null,
    isStale: boolean,
    extraOpenCount?: number,
    onStart: () => void,
    onOpen: () => void,
    onNewMatch: () => void,
    onMoreOpen: () => void
}) {
    const { fontScale } = useWindowDimensions()
    const stacked = fontScale >= 1.5

    if (!session) {
        return (
            <View className="gap-3 rounded-xl border border-border-subtle bg-surface-raised p-4" testID="home-session-card">
                <View>
                    <Text className="text-card-title font-semibold text-ink">No session open</Text>
                    {lastSession ? (
                        <Text className="text-body text-muted mt-0.5">
                            Last one: {lastSession.name || DisplayDateDMonYYYY(lastSession.date)}, {relativeDay(lastSession.date)}
                        </Text>
                    ) : null}
                </View>
                <CardButton label="Start session" onPress={onStart} primary />
            </View>
        )
    }

    const title = session.name || DisplayDateDMonYYYY(session.date) || ""
    const startTime = DisplayStartTime(session.start_time)
    const started = isStale
        ? `Started ${format(new Date(session.date), "EEE d MMM")}${startTime ? `, ${startTime}` : ""}`
        : startTime ? `Started ${startTime}` : undefined
    const meta = [started, session.location].filter(Boolean).join(" · ")
    const players = pluralise(session.player_count, "player", "players")
    const matches = pluralise(session.match_count, "match", "matches")
    const shuttles = pluralise(session.shuttle_count, "shuttle", "shuttles")
    const hasMatches = session.match_count > 0
    const label = [
        title,
        isStale ? "still open" : "open session",
        ...(hasMatches ? [players, matches, shuttles] : ["no matches yet"]),
        hasMatches && estimate !== undefined ? `about ${formatRM(estimate)} so far` : null,
    ].filter(Boolean).join(", ")

    const fact = (count: number, word: string) => (
        <Text className="text-body text-muted" style={{ fontVariant: ["tabular-nums"] }}>
            <Text className="font-semibold text-ink">{count}</Text> {word}
        </Text>
    )

    return (
        <View className="gap-3 rounded-xl border border-border-subtle bg-surface-raised p-4" testID="home-session-card">
            <View accessible accessibilityLabel={label} className="gap-2">
                <View className={stacked ? "gap-2" : "flex-row items-start justify-between"}>
                    <View className={stacked ? "" : "flex-1 mr-3"}>
                        <Text className="text-card-title font-semibold text-ink" numberOfLines={2}>{title}</Text>
                        {meta ? <Text className="text-body text-muted mt-0.5">{meta}</Text> : null}
                    </View>
                    {isStale ? <StatusBadge variant="stale" since={session.date} /> : <StatusBadge variant="open" />}
                </View>
                {hasMatches ? (
                    <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
                        {fact(session.player_count, session.player_count === 1 ? "player" : "players")}
                        {fact(session.match_count, session.match_count === 1 ? "match" : "matches")}
                        {fact(session.shuttle_count, session.shuttle_count === 1 ? "shuttle" : "shuttles")}
                    </View>
                ) : (
                    <Text className="text-body text-muted">No matches yet</Text>
                )}
                {hasMatches && estimate !== undefined ? (
                    <View className="flex-row items-center gap-1.5">
                        <StatusBadge variant="estimate" amount={estimate} />
                        <Text className="text-body text-muted">so far</Text>
                    </View>
                ) : null}
                {isStale ? (
                    <Text className="text-body text-clay-strong">Still open. Close it to settle what everyone owes.</Text>
                ) : null}
            </View>
            <View className={`${stacked ? "flex-col-reverse" : "flex-row"} gap-2`}>
                <CardButton label="Open session" onPress={onOpen} flex={stacked ? undefined : 1} />
                <CardButton label="New match" onPress={onNewMatch} primary flex={stacked ? undefined : 1.35} />
            </View>
            {extraOpenCount > 0 ? (
                <Pressable onPress={onMoreOpen} accessibilityRole="link" className="min-h-11 justify-center">
                    <Text className="text-body font-medium text-primary">
                        +{extraOpenCount} more open {extraOpenCount === 1 ? "session" : "sessions"}
                    </Text>
                </Pressable>
            ) : null}
        </View>
    )
}
