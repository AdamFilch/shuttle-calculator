import { BottomActionBar } from "@/components/layout/BottomActionBar";
import { BalanceCard } from "@/components/player/BalanceCard";
import { owedCharges, PickableCharge, sumAmounts } from "@/components/player/charges";
import { isSessionToday, plural, shortDateLabel } from "@/components/player/format";
import { PlayerOptionsSheet } from "@/components/player/PlayerOptionsSheet";
import { SessionChargesCard } from "@/components/player/SessionChargesCard";
import { SettleChargesDialog, SettleGroup } from "@/components/player/SettleChargesDialog";
import { ShuttleGlyph } from "@/components/session/match/ShuttleGlyph";
import { useAppToast } from "@/components/shared/AppToast";
import { Avatar } from "@/components/shared/Avatar";
import { EmptyState } from "@/components/shared/EmptyState";
import { designTokens } from "@/components/ui/gluestack-ui-provider/config";
import { Icon, ThreeDotsIcon } from "@/components/ui/icon";
import { DeletePlayerDialog } from "@/components/user/deletePlayerDialog";
import { formatRM } from "@/services/money-display";
import {
  deletePlayer,
  fetchPlayerDeleteBlockers,
  fetchPlayerLedger,
  LedgerSession,
  PlayerDeleteBlockers,
  PlayerLedger,
} from "@/services/player";
import { ChargeKey, payChargesByKeys, paySessionInFull } from "@/services/shuttle-payments";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useFocusEffect, usePreventRemove } from "expo-router/react-navigation";
import { useCallback, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

type Mode = "view" | "pay" | "waive";

type PendingSettle = {
  kind: "sessions" | "picked";
  sessions: LedgerSession[];
  groups: SettleGroup[];
  total: number;
};

function SkeletonBlock({ className }: { className: string }) {
  return <View className={`bg-neutral-tint ${className}`} />;
}

function LoadingSkeleton() {
  return (
    <View className="gap-6 px-4 pt-1" accessible accessibilityLabel="Loading player" testID="player-skeleton">
      <View className="flex-row items-center gap-3.5">
        <SkeletonBlock className="h-14 w-14 rounded-full" />
        <View className="flex-1 gap-2">
          <SkeletonBlock className="h-7 w-3/5 rounded-lg" />
          <SkeletonBlock className="h-4 w-2/5 rounded-lg" />
        </View>
      </View>
      <SkeletonBlock className="h-44 rounded-xl" />
      <View className="gap-2">
        <SkeletonBlock className="h-16 rounded-xl" />
        <SkeletonBlock className="h-16 rounded-xl" />
        <SkeletonBlock className="h-16 rounded-xl" />
      </View>
    </View>
  );
}

function HeaderTextButton({ label, onPress, testID }: { label: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      testID={testID}
      className="h-11 justify-center px-2.5 active:opacity-85"
    >
      <Text className="text-[15px] text-primary">{label}</Text>
    </Pressable>
  );
}

function openCaptionFor(openSessions: LedgerSession[]): string | undefined {
  if (openSessions.length === 0) return;
  const amount = formatRM(openSessions.reduce((sum, session) => sum + (session.estimate?.total ?? 0), 0));
  if (openSessions.length > 1) return `Open sessions add about ${amount} when they close.`;
  const lead = isSessionToday(openSessions[0].date) ? "Tonight's open session" : "This open session";
  return `${lead} adds about ${amount} when it closes.`;
}

function pickedGroups(sessions: LedgerSession[], selected: Set<ChargeKey>): SettleGroup[] {
  const groups: SettleGroup[] = [];
  for (const session of sessions) {
    const picks = owedCharges(session).filter((charge) => selected.has(charge.key));
    if (picks.length === 0) continue;
    const lines = [];
    const court = picks.find((charge) => charge.matchNumber === null);
    if (court) lines.push({ label: "Court share", amount: court.amount });
    const byMatch = new Map<number, PickableCharge[]>();
    for (const charge of picks) {
      if (charge.matchNumber === null) continue;
      byMatch.set(charge.matchNumber, [...(byMatch.get(charge.matchNumber) ?? []), charge]);
    }
    for (const [matchNumber, charges] of [...byMatch.entries()].sort((a, b) => a[0] - b[0])) {
      lines.push({
        label: `Match ${matchNumber + 1} · ${plural(charges.length, "shuttle")}`,
        amount: sumAmounts(charges),
      });
    }
    groups.push({ heading: `${shortDateLabel(session.date)} · ${session.name || "Session"}`, lines });
  }
  return groups;
}

export default function PlayerDetailPage() {
  const { playerId } = useLocalSearchParams();
  const id = Number(playerId);
  const router = useRouter();
  const toast = useAppToast();
  const [ledger, setLedger] = useState<PlayerLedger | null>(null);
  const [blockers, setBlockers] = useState<(PlayerDeleteBlockers & { playerId: number }) | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [mode, setMode] = useState<Mode>("view");
  const [selected, setSelected] = useState<Set<ChargeKey>>(new Set());
  const [pending, setPending] = useState<PendingSettle | null>(null);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const load = useCallback(async () => {
    const [nextLedger, nextBlockers] = await Promise.all([
      fetchPlayerLedger(id),
      fetchPlayerDeleteBlockers(id),
    ]);
    setLedger(nextLedger);
    setBlockers({ playerId: id, ...nextBlockers });
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const exitSelection = useCallback(() => {
    setMode("view");
    setSelected(new Set());
  }, []);

  usePreventRemove(mode !== "view", exitSelection);

  const headerOptions = {
    title: "",
    headerBackButtonDisplayMode: "minimal" as const,
    headerShadowVisible: false,
    headerStyle: { backgroundColor: designTokens.surface },
    headerTintColor: designTokens.primary,
  };

  if (!ledger || ledger.player.player_id !== id) {
    return (
      <View className="flex-1 bg-surface">
        <Stack.Screen options={headerOptions} />
        <LoadingSkeleton />
      </View>
    );
  }

  const { player, totals } = ledger;
  const owingSessions = ledger.sessions.filter((session) => session.state === "owing");
  const openSessions = ledger.sessions.filter((session) => session.state === "open");
  const allPickable = owingSessions.flatMap(owedCharges);
  const picked = allPickable.filter((charge) => selected.has(charge.key));
  const pickedTotal = sumAmounts(picked);
  const allPicked = allPickable.length > 0 && picked.length === allPickable.length;
  const selecting = mode !== "view";
  const visibleSessions = selecting ? owingSessions : ledger.sessions;

  const toggleExpanded = (sessionId: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);
      return next;
    });
  };

  const toggleCharge = (key: ChargeKey) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSession = (session: LedgerSession) => {
    const keys = owedCharges(session).map((charge) => charge.key);
    setSelected((prev) => {
      const next = new Set(prev);
      const allOn = keys.every((key) => next.has(key));
      for (const key of keys) {
        if (allOn) next.delete(key);
        else next.add(key);
      }
      return next;
    });
  };

  const toggleAll = () => {
    setSelected(allPicked ? new Set() : new Set(allPickable.map((charge) => charge.key)));
  };

  const enterSelection = (next: Mode) => {
    setSelected(new Set());
    setMode(next);
  };

  const confirmSessions = (sessions: LedgerSession[]) => {
    setPending({
      kind: "sessions",
      sessions,
      groups: [{
        lines: sessions.map((session) => ({
          label: `${session.name || "Session"} · ${shortDateLabel(session.date)}`,
          amount: session.owed,
        })),
      }],
      total: sumAmounts(sessions.map((session) => ({ amount: session.owed }))),
    });
  };

  const confirmPicked = () => {
    setPending({
      kind: "picked",
      sessions: owingSessions,
      groups: pickedGroups(owingSessions, selected),
      total: pickedTotal,
    });
  };

  const handleSettle = async () => {
    if (!pending) return;
    if (pending.kind === "sessions") {
      for (const session of pending.sessions) {
        await paySessionInFull({ sessionId: session.session_id, player_id: String(id) });
      }
    } else {
      await payChargesByKeys({ playerId: id, keys: [...selected] });
    }
    const paidLabel = `Paid ${formatRM(pending.total)}`;
    setPending(null);
    exitSelection();
    await load();
    toast.show(paidLabel);
  };

  const openDelete = () => {
    setOptionsOpen(false);
    setDeleteOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deletePlayer(player.player_id);
      setDeleteOpen(false);
      router.dismissTo("/player");
    } catch (e: any) {
      setDeleteOpen(false);
      Alert.alert("Cannot Delete Player", e?.message ?? "Something went wrong.");
    }
  };

  const metaLine = ledger.sessionCount === 0
    ? "No sessions yet"
    : `${plural(ledger.sessionCount, "session")} · ${plural(ledger.matchCount, "match", "matches")}`;

  const isPay = mode === "pay";
  const summaryLabel = picked.length === 0
    ? (isPay ? "Tick charges to pay" : "Tick charges to waive")
    : plural(picked.length, "charge") + " picked";

  return (
    <View className="flex-1 bg-surface">
      <Stack.Screen
        options={{
          ...headerOptions,
          headerBackVisible: !selecting,
          headerLeft: selecting
            ? () => <HeaderTextButton label="Cancel" onPress={exitSelection} testID="selection-cancel" />
            : undefined,
          headerRight: selecting
            ? () => (
                <HeaderTextButton
                  label={allPicked ? "Clear all" : "Select all"}
                  onPress={toggleAll}
                  testID="selection-toggle-all"
                />
              )
            : () => (
                <Pressable
                  onPress={() => setOptionsOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Player options"
                  testID="player-options-button"
                  className="h-11 w-11 items-center justify-center rounded-lg active:opacity-85"
                >
                  <Icon as={ThreeDotsIcon} size="xl" className="text-ink" />
                </Pressable>
              ),
        }}
      />
      <ScrollView className="flex-1" contentContainerClassName="gap-6 px-4 pb-6 pt-1" testID="player-scroll">
        {selecting ? (
          <View className="gap-1">
            <Text className="text-screen-title font-semibold text-ink" accessibilityRole="header">
              {isPay ? "Pay individually" : "Waive charges"}
            </Text>
            <Text className="text-body text-muted">
              {isPay
                ? `Tick what ${player.name} is paying now.`
                : `Tick what ${player.name} no longer has to pay.`}
            </Text>
          </View>
        ) : (
          <>
            <View className="flex-row items-center gap-3.5">
              <Avatar name={player.name} colour={player.avatar_colour} size="lg" />
              <View className="flex-1 gap-0.5">
                <Text className="text-screen-title font-semibold text-ink" accessibilityRole="header">
                  {player.name}
                </Text>
                <Text className="text-body text-muted" testID="player-meta">{metaLine}</Text>
              </View>
            </View>

            <BalanceCard
              owed={totals.owed}
              paid={totals.paid}
              sessionsOwing={totals.sessionsOwing}
              closedSessions={totals.closedSessions}
              openCaption={openCaptionFor(openSessions)}
              onPayAll={() => confirmSessions(owingSessions)}
              onPayIndividually={() => enterSelection("pay")}
              onWaive={() => enterSelection("waive")}
            />
          </>
        )}

        <View className="gap-2">
          {selecting ? null : (
            <View className="flex-row flex-wrap items-baseline justify-between gap-x-2">
              <Text className="text-section-label font-medium uppercase text-muted" accessibilityRole="header">
                Sessions
              </Text>
              {ledger.sessions.length > 0 ? (
                <Text className="text-caption text-muted">{owingSessions.length > 0 ? "Owing first" : "Newest first"}</Text>
              ) : null}
            </View>
          )}
          {visibleSessions.length === 0 ? (
            <EmptyState
              icon={<ShuttleGlyph colour={designTokens.clay} size={20} />}
              title="No sessions yet"
              description={`${player.name}'s sessions and charges appear here once they play a match.`}
            />
          ) : (
            visibleSessions.map((session) => (
              <SessionChargesCard
                key={session.session_id}
                session={session}
                expanded={expanded.has(session.session_id)}
                onToggle={() => toggleExpanded(session.session_id)}
                mode={mode}
                selected={selected}
                onToggleCharge={toggleCharge}
                onToggleSession={toggleSession}
                onPaySession={(target) => confirmSessions([target])}
              />
            ))
          )}
        </View>
      </ScrollView>

      {selecting ? (
        <BottomActionBar
          summary={
            <View className="flex-row justify-between gap-2" accessible testID="selection-summary">
              <Text className="text-section-label tracking-normal text-muted">{summaryLabel}</Text>
              {picked.length > 0 ? (
                <Text className="text-section-label font-semibold tracking-normal text-ink" style={{ fontVariant: ["tabular-nums"] }}>
                  {formatRM(pickedTotal)}
                </Text>
              ) : null}
            </View>
          }
          primary={
            isPay
              ? {
                  label: picked.length === 0 ? "Pay" : `Pay ${formatRM(pickedTotal)}`,
                  tone: "sage",
                  disabled: picked.length === 0,
                  onPress: confirmPicked,
                  testID: "selection-confirm",
                }
              : {
                  label: "Waive · coming soon",
                  tone: "clay",
                  disabled: true,
                  onPress: () => {},
                  testID: "selection-confirm",
                }
          }
        />
      ) : null}

      <SettleChargesDialog
        isOpen={pending !== null}
        mode="pay"
        playerName={player.name}
        groups={pending?.groups ?? []}
        total={pending?.total ?? 0}
        remaining={Math.max(0, Math.round((totals.owed - (pending?.total ?? 0)) * 100) / 100)}
        onConfirm={handleSettle}
        onClose={() => setPending(null)}
      />

      <PlayerOptionsSheet
        isOpen={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        playerName={player.name}
        blockers={blockers?.playerId === id ? blockers : null}
        onDelete={openDelete}
      />

      <DeletePlayerDialog
        player={deleteOpen ? player : null}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
      />
    </View>
  );
}
