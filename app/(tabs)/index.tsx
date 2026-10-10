import { HomeSessionCard } from "@/components/home/HomeSessionCard";
import { LowStockAlert } from "@/components/home/LowStockAlert";
import { SetupChecklist } from "@/components/home/SetupChecklist";
import { PageHeader } from "@/components/layout/PageHeader";
import { PlayerRow } from "@/components/shared/PlayerRow";
import { isStaleOpen, SessionCard } from "@/components/shared/SessionCard";
import { Skeleton } from "@/components/shared/Skeleton";
import { StatTile } from "@/components/shared/StatTile";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { AddSessionModal } from "@/components/session/modal";
import { AddShuttleModal } from "@/components/shuttle/modal";
import { designTokens } from "@/components/ui/gluestack-ui-provider/config";
import { AddPlayerModal } from "@/components/user/modal";
import { formatRM } from "@/services/money-display";
import { fetchAllPlayers, fetchTopOwers, TopOwers } from "@/services/player";
import {
  ActivitySummary,
  fetchActivitySummary,
  fetchAllSessions,
  fetchSessionById,
  previewSessionCharges,
  SessionSummary,
} from "@/services/session";
import { fetchAllShuttles, fetchShuttleStock, ShuttleStockType } from "@/services/shuttle";
import { parseSQLTimestamp } from "@/services/time-display";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { endOfDay, format, startOfDay, subDays } from "date-fns";
import { useFocusEffect } from "expo-router/react-navigation";
import { useRouter } from "expo-router";
import { ReactNode, useCallback, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Loaded<T> = T | "error";

type HomeData = {
  sessions: Loaded<SessionSummary[]>;
  owers: Loaded<TopOwers>;
  activity: Loaded<ActivitySummary>;
  estimates: Record<number, number>;
  lowStock: Loaded<ShuttleStockType[]>;
  tonight: number[];
  playerCount: number;
  shuttleTypeCount: number;
};

const settle = <T,>(promise: Promise<T>): Promise<Loaded<T>> =>
  promise.catch(() => "error" as const);

const byNewestFirst = (a: SessionSummary, b: SessionSummary) =>
  new Date(b.date).getTime() - new Date(a.date).getTime() ||
  b.session_id - a.session_id;

const estimateOf = async (sessionId: number) => {
  const preview = await previewSessionCharges(String(sessionId));
  return preview.courtTotal + preview.shuttleTotal;
};

async function loadHome(): Promise<HomeData> {
  const now = new Date();
  const [sessions, owers, activity, players, shuttles, lowStock] = await Promise.all([
    settle(fetchAllSessions().then((rows) => [...rows].sort(byNewestFirst))),
    settle(fetchTopOwers(3)),
    settle(
      fetchActivitySummary(
        startOfDay(subDays(now, 29)).toISOString(),
        endOfDay(now).toISOString(),
      ),
    ),
    settle(fetchAllPlayers()),
    settle(fetchAllShuttles()),
    settle(
      fetchShuttleStock().then((stock) =>
        stock.types.filter((t) => t.alert).slice(0, 2),
      ),
    ),
  ]);

  const open =
    sessions === "error" ? [] : sessions.filter((s) => s.status === "open");
  const estimates: Record<number, number> = {};
  await Promise.all(
    open.map((s) =>
      estimateOf(s.session_id)
        .then((total) => {
          estimates[s.session_id] = total;
        })
        .catch(() => undefined),
    ),
  );

  const current = open[0];
  const tonight =
    current && !isStaleOpen(current)
      ? await fetchSessionById(String(current.session_id))
          .then((detail) =>
            detail.matches.flatMap((m) => m.players.map((p) => p.player_id)),
          )
          .catch(() => [])
      : [];

  return {
    sessions,
    owers,
    activity,
    estimates,
    lowStock,
    tonight,
    playerCount: players === "error" ? 0 : players.length,
    shuttleTypeCount: shuttles === "error" ? 0 : shuttles.length,
  };
}

function SectionHeader({
  title,
  note,
  onSeeAll,
}: {
  title: string;
  note?: string;
  onSeeAll?: () => void;
}) {
  return (
    <View className="min-h-11 flex-row items-center justify-between">
      <Text
        className="text-section-label font-medium uppercase text-muted"
        accessibilityRole="header"
      >
        {title}
      </Text>
      {note ? <Text className="text-caption text-muted">{note}</Text> : null}
      {onSeeAll ? (
        <Pressable
          onPress={onSeeAll}
          accessibilityRole="link"
          accessibilityLabel={`See all ${title.toLowerCase()}`}
          className="min-h-11 justify-center pl-4"
        >
          <Text className="text-body font-medium text-primary">See all</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Section({ children }: { children: ReactNode }) {
  return <View className="mt-6">{children}</View>;
}

function LoadError() {
  return (
    <Text className="text-body text-muted py-2">
      Couldn&apos;t load. Pull to refresh.
    </Text>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const [data, setData] = useState<HomeData>();
  const [refreshing, setRefreshing] = useState(false);
  const [modal, setModal] = useState<"session" | "player" | "shuttle" | null>(
    null,
  );

  const reload = useCallback(() => loadHome().then(setData), []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    reload().finally(() => setRefreshing(false));
  };

  const closeModal = () => {
    setModal(null);
    reload();
  };

  const today = format(new Date(), "EEEE d MMM");
  const sessions = data?.sessions;
  const isWelcome = Array.isArray(sessions) && sessions.length === 0;

  const modals = (
    <>
      <AddSessionModal
        open={modal === "session"}
        onClose={closeModal}
        onCreated={(id) => router.push(`/session/${id}`)}
      />
      <AddPlayerModal open={modal === "player"} onClose={closeModal} />
      <AddShuttleModal open={modal === "shuttle"} onClose={closeModal} />
    </>
  );

  const refresh = (
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  );

  if (!data) {
    return (
      <SafeAreaView className="flex-1 bg-surface">
        <PageHeader title="Home" subtitle={today} />
        <View className="flex-1 gap-6 px-4" accessibilityLabel="Loading">
          <Skeleton className="h-36" />
          <View className="gap-2">
            <View className="flex-row gap-2">
              <Skeleton className="h-20 flex-1" />
              <Skeleton className="h-20 flex-1" />
            </View>
            <View className="flex-row gap-2">
              <Skeleton className="h-20 flex-1" />
              <Skeleton className="h-20 flex-1" />
            </View>
          </View>
          <Skeleton className="h-48" />
        </View>
      </SafeAreaView>
    );
  }

  if (isWelcome) {
    return (
      <SafeAreaView className="flex-1 bg-surface">
        <PageHeader title="Welcome" subtitle={today} />
        <ScrollView className="flex-1 px-4" refreshControl={refresh}>
          <Text className="text-body text-muted">
            Three steps to your first session. Shuttle Calculator splits courts
            across everyone who played, and each shuttle only across the players
            who used it.
          </Text>
          <View className="mt-4">
            <SetupChecklist
              playerCount={data.playerCount}
              shuttleTypeCount={data.shuttleTypeCount}
              onAddPlayers={() => setModal("player")}
              onAddShuttles={() => setModal("shuttle")}
              onStartSession={() => setModal("session")}
            />
          </View>
          <Text className="mt-4 text-body text-muted pb-24">
            {data.playerCount > 0 && data.shuttleTypeCount === 0
              ? "You can skip shuttles and use free ones, but they won't be charged to anyone."
              : "Once you've played, this page shows your open session, who still owes, low stock and recent sessions."}
          </Text>
        </ScrollView>
        {modals}
      </SafeAreaView>
    );
  }

  const sorted = sessions === "error" ? [] : (sessions ?? []);
  const open = sorted.filter((s) => s.status === "open");
  const current = open[0] ?? null;
  const stale = current ? isStaleOpen(current) : false;
  const recent = sorted
    .filter((s) => s.session_id !== current?.session_id)
    .slice(0, current ? 2 : 3);

  const now = new Date();
  const windowStart = startOfDay(subDays(now, 29));
  const windowSessions = sorted.filter((s) => {
    const d = new Date(s.date);
    return d >= windowStart && d <= endOfDay(now);
  });
  const activity = data.activity;
  const showTiles = !current && (activity === "error" || activity.sessions > 0);
  const perSession = (n: number) =>
    activity !== "error" && activity.sessions > 0
      ? Math.round(n / activity.sessions)
      : 0;
  const avgPlayers = windowSessions.length
    ? Math.round(
        windowSessions.reduce((sum, s) => sum + s.player_count, 0) /
          windowSessions.length,
      )
    : 0;

  const owers = data.owers;
  const showOwers = owers === "error" || owers.owers.length > 0;

  const lowStock = data.lowStock;

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <PageHeader title="Home" subtitle={today} />
      <ScrollView className="flex-1 px-4" refreshControl={refresh}>
        {sessions === "error" ? (
          <LoadError />
        ) : (
          <HomeSessionCard
            session={current}
            estimate={current ? data.estimates[current.session_id] : undefined}
            lastSession={sorted[0] ?? null}
            isStale={stale}
            extraOpenCount={Math.max(open.length - 1, 0)}
            onStart={() => setModal("session")}
            onOpen={() =>
              current && router.navigate(`/session/${current.session_id}`)
            }
            onNewMatch={() =>
              current &&
              router.navigate(`/session/${current.session_id}/create-match`)
            }
            onMoreOpen={() => router.navigate("/session")}
          />
        )}

        {lowStock === "error" ? (
          <LoadError />
        ) : lowStock.length > 0 ? (
          <View className="mt-3 gap-2" testID="home-low-stock">
            {lowStock.map((item) => (
              <LowStockAlert
                key={item.shuttle_id}
                name={item.name}
                remaining={item.remaining}
                runwaySessions={item.runway_sessions}
                onPress={() => router.navigate("/shuttles")}
              />
            ))}
          </View>
        ) : null}

        {showTiles ? (
          <Section>
            <SectionHeader
              title="Last 30 days"
              note="Today and the 29 days before"
            />
            {activity === "error" ? (
              <LoadError />
            ) : (
              <View className="gap-2" testID="home-activity">
                <View className="flex-row flex-wrap gap-2">
                  <StatTile
                    label="Sessions"
                    value={String(activity.sessions)}
                    subLine={`${activity.matches} ${activity.matches === 1 ? "match" : "matches"}`}
                  />
                  <StatTile
                    label="Shuttles used"
                    value={String(activity.shuttles_used)}
                    subLine={`${perSession(activity.shuttles_used)} a session`}
                    icon={
                      <MaterialCommunityIcons
                        name="feather"
                        size={14}
                        color={designTokens.clay}
                      />
                    }
                  />
                </View>
                <View className="flex-row flex-wrap gap-2">
                  <StatTile
                    label="Players"
                    value={String(activity.players)}
                    subLine={`${avgPlayers} a session`}
                  />
                  <StatTile
                    label="Charged"
                    value={formatRM(activity.charged)}
                    subLine={
                      activity.still_due > 0
                        ? `${formatRM(activity.still_due)} still due`
                        : "All paid"
                    }
                  />
                </View>
              </View>
            )}
          </Section>
        ) : null}

        {showOwers ? (
          <Section>
            <SectionHeader
              title="Waiting on payment"
              onSeeAll={() => router.navigate("/player")}
            />
            {owers === "error" ? (
              <LoadError />
            ) : (
              <View
                className="overflow-hidden rounded-xl border border-border-subtle bg-surface-raised"
                testID="home-owers"
              >
                {owers.owers.map((ower, index) => {
                  const since = parseSQLTimestamp(ower.oldest_unpaid_date);
                  const sinceShort = format(since, "d MMM");
                  const playing = data.tonight.includes(ower.player_id);
                  const subLine = `${playing ? "Playing tonight · " : ""}${
                    ower.sessions_owed > 1
                      ? `${ower.sessions_owed} sessions · since ${sinceShort}`
                      : `Since ${sinceShort}`
                  }`;
                  return (
                    <View
                      key={ower.player_id}
                      className={
                        index > 0 ? "border-t border-border-subtle" : ""
                      }
                    >
                      <PlayerRow
                        inset
                        name={ower.name}
                        avatarColour={ower.avatar_colour}
                        subLine={subLine}
                        badge={
                          <StatusBadge
                            variant="owes"
                            amount={ower.owed}
                            format="amount"
                          />
                        }
                        accessibilityLabel={`${ower.name} owes ${formatRM(ower.owed)} since ${format(since, "d MMMM")}, ${ower.sessions_owed} ${ower.sessions_owed === 1 ? "session" : "sessions"}${playing ? ", playing tonight" : ""}`}
                        onPress={() =>
                          router.navigate(`/player/${ower.player_id}`)
                        }
                      />
                    </View>
                  );
                })}
                <View
                  className="flex-row items-center justify-between border-t border-border-subtle px-4 py-3"
                  accessible
                  accessibilityLabel={`${owers.owing_count} ${owers.owing_count === 1 ? "player owes" : "players owe"} ${formatRM(owers.total_owed)} in total`}
                >
                  <Text className="text-body text-muted">
                    {owers.owing_count}{" "}
                    {owers.owing_count === 1 ? "player owes" : "players owe"}
                  </Text>
                  <Text
                    className="text-body font-semibold text-ink"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {formatRM(owers.total_owed)}
                  </Text>
                </View>
              </View>
            )}
          </Section>
        ) : null}

        {recent.length > 0 ? (
          <Section>
            <SectionHeader
              title="Recent sessions"
              onSeeAll={() => router.navigate("/session")}
            />
            <View
              className="overflow-hidden rounded-xl border border-border-subtle bg-surface-raised"
              testID="home-recent"
            >
              {recent.map((session, index) => (
                <View
                  key={session.session_id}
                  className={index > 0 ? "border-t border-border-subtle" : ""}
                >
                  <SessionCard
                    variant="compact"
                    name={session.name}
                    date={session.date}
                    status={session.status}
                    playerCount={session.player_count}
                    shuttleCount={session.shuttle_count}
                    matchCount={session.match_count}
                    outstandingAmount={session.outstanding_amount}
                    totalAmount={
                      session.status === "open"
                        ? (data.estimates[session.session_id] ?? 0)
                        : (session.amount_due ?? 0)
                    }
                    isEstimate={session.status === "open"}
                    onPress={() =>
                      router.navigate(`/session/${session.session_id}`)
                    }
                  />
                </View>
              ))}
            </View>
          </Section>
        ) : null}
        <View className="h-24" />
      </ScrollView>
      {modals}
    </SafeAreaView>
  );
}
