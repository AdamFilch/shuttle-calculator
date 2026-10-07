import { BottomActionBar } from "@/components/layout/BottomActionBar";
import { BookCourtsSheet } from "@/components/session/BookCourtsSheet";
import { CloseSessionDialog } from "@/components/session/CloseSessionDialog";
import { DeleteSessionDialog } from "@/components/session/DeleteSessionDialog";
import { ClosedEstimateCard, OpenEstimateCard } from "@/components/session/EstimateCard";
import { MatchCard } from "@/components/session/MatchCard";
import { ShuttleGlyph } from "@/components/session/match/ShuttleGlyph";
import { SessionOptionsSheet } from "@/components/session/SessionOptionsSheet";
import { useAppToast } from "@/components/shared/AppToast";
import { EmptyState } from "@/components/shared/EmptyState";
import { PlayerRow } from "@/components/shared/PlayerRow";
import { StatTile } from "@/components/shared/StatTile";
import { isOwed, StatusBadge } from "@/components/shared/StatusBadge";
import { designTokens } from "@/components/ui/gluestack-ui-provider/config";
import { AddIcon, Icon, LockIcon, ThreeDotsIcon } from "@/components/ui/icon";
import { formatRM } from "@/services/money-display";
import { fetchAllPlayerPaymentsBySession, PlayersShuttlePayments } from "@/services/player";
import {
  closeSession,
  deleteEmptySession,
  fetchSessionById,
  previewSessionCharges,
  SessionChargesPreview,
  SessionMatches,
} from "@/services/session";
import {
  DisplayDateDMonYYYY,
  DisplayStartTime,
  DisplayTimeDDDASHMMDASHYYYY,
  DisplayTimeOfDay,
  parseSQLTimestamp,
} from "@/services/time-display";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect } from "expo-router/react-navigation";
import { ReactNode, useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

type SessionData = {
  session: SessionMatches;
  preview: SessionChargesPreview;
  payments: PlayersShuttlePayments[];
};

function SectionHeader({ label, caption }: { label: string; caption?: string }) {
  return (
    <View className="flex-row flex-wrap items-baseline justify-between gap-x-2">
      <Text className="text-section-label font-medium uppercase text-muted" accessibilityRole="header">
        {label}
      </Text>
      {caption ? <Text className="text-caption text-muted">{caption}</Text> : null}
    </View>
  );
}

function SkeletonBlock({ className }: { className: string }) {
  return <View className={`rounded-xl bg-neutral-tint ${className}`} />;
}

function LoadingSkeleton() {
  return (
    <View
      className="gap-6 px-4 pt-1"
      accessible
      accessibilityLabel="Loading session"
      testID="session-skeleton"
    >
      <View className="gap-2">
        <SkeletonBlock className="h-8 w-3/5" />
        <SkeletonBlock className="h-4 w-4/5" />
      </View>
      <SkeletonBlock className="h-36" />
      <View className="flex-row gap-2">
        <SkeletonBlock className="h-20 flex-1" />
        <SkeletonBlock className="h-20 flex-1" />
        <SkeletonBlock className="h-20 flex-1" />
      </View>
      <SkeletonBlock className="h-16" />
      <SkeletonBlock className="h-16" />
    </View>
  );
}

function OptionsButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Session options"
      testID="session-options-button"
      className="h-11 w-11 items-center justify-center rounded-lg active:opacity-85"
    >
      <Icon as={ThreeDotsIcon} size="xl" className="text-ink" />
    </Pressable>
  );
}

export default function SelectedSessionPage() {
  const router = useRouter();
  const toast = useAppToast();
  const { sessionId } = useLocalSearchParams();
  const id = sessionId.toString();
  const [data, setData] = useState<SessionData | null>(null);
  const [isMissing, setIsMissing] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [bookCourtsOpen, setBookCourtsOpen] = useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const fetchSession = useCallback(async () => {
    const session = await fetchSessionById(id);
    if (!session) {
      setIsMissing(true);
      return;
    }
    const [preview, payments] = await Promise.all([
      previewSessionCharges(id),
      session.status === "closed"
        ? fetchAllPlayerPaymentsBySession(id)
        : Promise.resolve([]),
    ]);
    setData({ session, preview, payments });
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchSession();
    }, [fetchSession]),
  );

  const headerOptions = {
    title: "",
    headerBackButtonDisplayMode: "minimal" as const,
    headerShadowVisible: false,
    headerStyle: { backgroundColor: designTokens.surface },
    headerTintColor: designTokens.primary,
  };

  if (!data) {
    return (
      <View className="flex-1 bg-surface">
        <Stack.Screen options={headerOptions} />
        {isMissing ? (
          <View className="px-4 pt-4">
            <EmptyState title="Session not found" description="It may have been deleted." />
          </View>
        ) : (
          <LoadingSkeleton />
        )}
      </View>
    );
  }

  const { session, preview, payments } = data;
  const isClosed = session.status === "closed";
  const matchCount = session.matches.length;
  const hasMatches = matchCount > 0;

  const sessionTitle =
    session.name === "" || !session.name
      ? (DisplayTimeDDDASHMMDASHYYYY(session.date) ?? "")
      : session.name;
  const metaLine = [
    DisplayDateDMonYYYY(session.date),
    DisplayStartTime(session.start_time),
    session.location,
  ]
    .filter(Boolean)
    .join(" · ");

  const courtCount = session.courts.reduce((sum, court) => sum + court.quantity, 0);
  const courtTotal = preview.courtTotal;
  const instanceCount = session.matches.reduce(
    (sum, match) => sum + match.shuttle_count - match.reused_from.reduce((n, r) => n + r.count, 0),
    0,
  );
  const freeCount = session.matches.reduce((sum, match) => sum + match.free_count, 0);

  const owedByPlayer: Record<number, number> = {};
  for (const payment of payments) owedByPlayer[payment.player_id] = payment.total_owed_amount;
  const stillOwed = Object.values(owedByPlayer).reduce((sum, amount) => sum + amount, 0);
  const paidSoFar = payments.reduce((sum, payment) => sum + payment.total_paid_amount, 0);
  const settledCount = preview.players.filter(
    (player) => !isOwed(owedByPlayer[player.player_id] ?? 0),
  ).length;

  const players = [...preview.players].sort((a, b) => {
    const amountA = isClosed ? (owedByPlayer[a.player_id] ?? 0) : a.total;
    const amountB = isClosed ? (owedByPlayer[b.player_id] ?? 0) : b.total;
    if (Math.round(amountA * 100) !== Math.round(amountB * 100)) return amountB - amountA;
    return a.name.localeCompare(b.name);
  });

  const matches = [...session.matches].sort((a, b) => b.match_number - a.match_number);

  const handleCloseSession = async () => {
    try {
      await closeSession(id);
      setCloseConfirmOpen(false);
      await fetchSession();
    } catch (e: any) {
      setCloseConfirmOpen(false);
      Alert.alert("Cannot Close Session", e?.message ?? "Something went wrong.");
    }
  };

  const handleDeleteSession = async () => {
    await deleteEmptySession(id);
    setDeleteConfirmOpen(false);
    toast.show("Session deleted");
    router.dismissTo("/session");
  };

  const openBookCourts = () => {
    setOptionsOpen(false);
    setBookCourtsOpen(true);
  };

  const openDelete = () => {
    setOptionsOpen(false);
    setDeleteConfirmOpen(true);
  };

  const headerBadge: ReactNode = !isClosed ? (
    <StatusBadge variant="open" />
  ) : isOwed(stillOwed) ? (
    <StatusBadge variant="owes" amount={stillOwed} format="due" />
  ) : (
    <StatusBadge variant="settled" />
  );

  const closedLabel = session.closed_date
    ? DisplayDateDMonYYYY(parseSQLTimestamp(session.closed_date))
    : undefined;

  return (
    <View className="flex-1 bg-surface">
      <Stack.Screen
        options={{
          ...headerOptions,
          headerRight: isClosed
            ? undefined
            : () => <OptionsButton onPress={() => setOptionsOpen(true)} />,
        }}
      />
      <ScrollView className="flex-1" contentContainerClassName="gap-6 px-4 pb-6 pt-1" testID="session-scroll">
        <View className="gap-1.5">
          <Text className="text-screen-title font-semibold text-ink" accessibilityRole="header">
            {sessionTitle}
          </Text>
          {metaLine ? <Text className="text-body text-muted">{metaLine}</Text> : null}
          {headerBadge}
        </View>

        {isClosed ? (
          <ClosedEstimateCard
            stillOwed={stillOwed}
            paidSoFar={paidSoFar}
            amountDue={session.amount_due ?? null}
            settledCount={settledCount}
            playerCount={preview.players.length}
            closedLabel={closedLabel}
          />
        ) : (
          <OpenEstimateCard courtTotal={preview.courtTotal} shuttleTotal={preview.shuttleTotal} />
        )}

        <View className="flex-row flex-wrap gap-2">
          <StatTile
            label="Players"
            value={String(preview.players.length)}
            subLine={`in ${matchCount} ${matchCount === 1 ? "match" : "matches"}`}
            testID="tile-players"
          />
          <StatTile
            label="Shuttles"
            icon={<ShuttleGlyph colour={designTokens.clay} size={14} />}
            value={String(instanceCount)}
            subLine={freeCount > 0 ? `${freeCount} free` : undefined}
            testID="tile-shuttles"
          />
          <StatTile
            label="Courts"
            value={String(courtCount)}
            subLine={formatRM(courtTotal)}
            onPress={isClosed ? undefined : () => setBookCourtsOpen(true)}
            accessibilityLabel={`Courts, ${courtCount} booked, ${formatRM(courtTotal)}${isClosed ? "" : ". Book courts"}`}
            testID="tile-courts"
          />
        </View>

        {players.length > 0 ? (
          <View className="gap-2">
            <SectionHeader label="Players" caption={isClosed ? "Final share" : "Estimated share"} />
            {players.map((player) => {
              const owed = owedByPlayer[player.player_id] ?? 0;
              const subLine = `${player.matches} ${player.matches === 1 ? "match" : "matches"}`;
              const badge = !isClosed ? (
                <StatusBadge variant="estimate" amount={player.total} />
              ) : isOwed(owed) ? (
                <StatusBadge variant="owes" amount={owed} format="owes" />
              ) : (
                <StatusBadge variant="settled" />
              );
              const badgeText = !isClosed
                ? `about ${formatRM(player.total)}`
                : isOwed(owed)
                  ? `owes ${formatRM(owed)}`
                  : "settled";
              return (
                <PlayerRow
                  key={player.player_id}
                  name={player.name}
                  avatarColour={player.avatar_colour}
                  subLine={subLine}
                  badge={badge}
                  accessibilityLabel={`${player.name}, ${subLine}, ${badgeText}`}
                  onPress={() => router.navigate(`/player/${player.player_id}`)}
                />
              );
            })}
          </View>
        ) : null}

        <View className="gap-2">
          <SectionHeader
            label="Matches"
            caption={hasMatches ? `${matchCount} played` : undefined}
          />
          {hasMatches ? (
            matches.map((match) => (
              <MatchCard
                key={match.match_id}
                match={match}
                startTime={
                  isClosed || !match.match_date
                    ? undefined
                    : DisplayTimeOfDay(parseSQLTimestamp(match.match_date))
                }
                onPress={() => router.navigate(`/session/${id}/${match.match_id}`)}
              />
            ))
          ) : (
            <EmptyState
              icon={<ShuttleGlyph colour={designTokens.clay} size={20} />}
              title="No matches yet"
              description="Create your first match to start tracking shuttles."
            />
          )}
        </View>

        {isClosed ? (
          <View
            className="flex-row items-start gap-2.5 rounded-xl border border-border-subtle bg-surface-raised px-3.5 py-3"
            testID="closed-note"
          >
            <Icon as={LockIcon} size="md" className="mt-0.5 text-settled" />
            <Text className="flex-1 text-body text-muted">
              This session is closed, so no new matches or courts can be added. Record payments from each player&apos;s page.
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {!isClosed ? (
        <BottomActionBar
          secondary={
            hasMatches
              ? {
                  label: "Close session",
                  tone: "sage",
                  onPress: () => setCloseConfirmOpen(true),
                  testID: "close-session-button",
                }
              : {
                  label: "Delete session",
                  tone: "destructive",
                  onPress: () => setDeleteConfirmOpen(true),
                  testID: "delete-session-button",
                }
          }
          primary={{
            label: "Create match",
            tone: "primary",
            icon: <Icon as={AddIcon} size="md" className="text-surface" />,
            onPress: () => router.navigate(`/session/${id}/create-match`),
            testID: "create-match-button",
          }}
        />
      ) : null}

      <SessionOptionsSheet
        isOpen={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        courtCount={courtCount}
        courtTotal={courtTotal}
        canDelete={!hasMatches}
        onBookCourts={openBookCourts}
        onDelete={openDelete}
      />

      <BookCourtsSheet
        isOpen={bookCourtsOpen}
        onClose={() => setBookCourtsOpen(false)}
        sessionId={id}
        courts={session.courts}
        onBooked={fetchSession}
      />

      <CloseSessionDialog
        isOpen={closeConfirmOpen}
        onClose={() => setCloseConfirmOpen(false)}
        onConfirm={handleCloseSession}
        players={preview.players}
        shareTotal={preview.shareTotal}
      />

      <DeleteSessionDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteSession}
        title={sessionTitle}
        bookingCount={session.courts.length}
        bookingTotal={courtTotal}
      />
    </View>
  );
}
