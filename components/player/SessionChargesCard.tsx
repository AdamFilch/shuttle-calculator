import { ChargeRow, ChargeRowMode, ChargeRowState } from "@/components/player/ChargeRow"
import { owedCharges } from "@/components/player/charges"
import { isSessionToday, plural } from "@/components/player/format"
import { splitTeams } from "@/components/session/MatchCard"
import { SelectBoxState, SelectBoxVisual } from "@/components/shared/SelectBox"
import { StatusBadge } from "@/components/shared/StatusBadge"
import { ChevronRightIcon, Icon } from "@/components/ui/icon"
import { formatRM } from "@/services/money-display"
import { LedgerMatch, LedgerSession } from "@/services/player"
import { ChargeKey } from "@/services/shuttle-payments"
import { DisplayDateDMonYYYY } from "@/services/time-display"
import { ReactNode } from "react"
import { Pressable, Text, useWindowDimensions, View } from "react-native"

function GroupLabel({ label, children }: { label: string, children?: ReactNode }) {
    return (
        <View className="gap-0.5 border-t border-border-subtle px-3.5 pb-1 pt-2.5">
            <Text className="text-caption font-medium uppercase tracking-[0.48px] text-muted">{label}</Text>
            {children}
        </View>
    )
}

function TeamsLine({ players }: { players: LedgerMatch["players"] }) {
    const [top, bottom] = splitTeams(players)
    const names = (side: LedgerMatch["players"]) => side.map((player) => player.name).join(" & ")

    return (
        <Text className="text-section-label tracking-normal text-ink">
            {names(top)}
            <Text className="text-[11px] font-medium uppercase tracking-[0.66px] text-muted">{"  vs  "}</Text>
            {names(bottom)}
        </Text>
    )
}

function rowState(session: LedgerSession, datePaid: string | null): ChargeRowState {
    if (session.state === "open") return "estimate"
    return datePaid ? "paid" : "owed"
}

export function SessionChargesCard({
    session,
    expanded,
    onToggle,
    mode,
    selected,
    onToggleCharge,
    onToggleSession,
    onPaySession,
}: {
    session: LedgerSession,
    expanded: boolean,
    onToggle: () => void,
    mode: ChargeRowMode,
    selected: Set<ChargeKey>,
    onToggleCharge: (key: ChargeKey) => void,
    onToggleSession: (session: LedgerSession) => void,
    onPaySession: (session: LedgerSession) => void
}) {
    const { fontScale } = useWindowDimensions()
    const badgeBelow = fontScale >= 1.5
    const selecting = mode !== "view"
    const isOpen = session.state === "open"
    const showBody = selecting || expanded
    const title = session.name || (DisplayDateDMonYYYY(session.date) ?? "")
    const dateLabel = isOpen && isSessionToday(session.date) ? "Tonight" : DisplayDateDMonYYYY(session.date)
    const matchesLabel = plural(session.matches.length, "match", "matches")

    const pickable = owedCharges(session)
    const pickedCount = pickable.filter((charge) => selected.has(charge.key)).length
    const sessionChecked: SelectBoxState = pickedCount === 0
        ? false
        : pickedCount === pickable.length ? true : "mixed"

    const subLine = selecting
        ? `${dateLabel} · ${pickedCount} of ${pickable.length} picked`
        : [
            dateLabel,
            matchesLabel,
            isOpen ? "open" : null,
            session.state === "settled" ? `paid ${formatRM(session.paid)}` : null,
        ].filter(Boolean).join(" · ")

    const estimateTotal = session.estimate?.total ?? 0
    const badge = selecting ? (
        <StatusBadge variant="owes" amount={session.owed} format="amount" />
    ) : session.state === "owing" ? (
        <StatusBadge variant="owes" amount={session.owed} />
    ) : isOpen ? (
        <StatusBadge variant="estimate" amount={estimateTotal} />
    ) : (
        <StatusBadge variant="settled" />
    )
    const badgeText = session.state === "owing"
        ? `owes ${formatRM(session.owed)}`
        : isOpen ? `about ${formatRM(estimateTotal)}` : "settled"

    const outline = selecting && pickedCount > 0
        ? (mode === "waive" ? "border-clay" : "border-sage")
        : "border-border-subtle"

    const chargeLabelSuffix = (state: ChargeRowState, amount: number) =>
        state === "estimate" ? `about ${formatRM(amount)}` : state === "paid" ? `paid, ${formatRM(amount)}` : formatRM(amount)

    return (
        <View className={`overflow-hidden rounded-xl border bg-surface-raised ${outline}`} testID={`session-card-${session.session_id}`}>
            <Pressable
                onPress={selecting ? () => onToggleSession(session) : onToggle}
                accessibilityRole={selecting ? "checkbox" : "button"}
                accessibilityLabel={selecting ? `${title}, all charges` : `${title}, ${subLine}, ${badgeText}`}
                accessibilityState={selecting ? { checked: sessionChecked } : { expanded }}
                testID={`session-card-header-${session.session_id}`}
            >
                {({ pressed }) => (
                    <View className={`min-h-16 flex-row items-center gap-2.5 py-3 pr-2.5 ${selecting ? "pl-1" : "pl-3.5"} ${pressed && !selecting ? "bg-primary-tint" : ""}`}>
                        {selecting ? (
                            <View className="-my-2.5 -mr-2">
                                <SelectBoxVisual checked={sessionChecked} tone={mode === "waive" ? "clay" : "sage"} />
                            </View>
                        ) : null}
                        <View className="flex-1 gap-0.5">
                            <Text className="text-card-title font-medium text-ink">{title}</Text>
                            <Text className="text-section-label tracking-normal text-muted" style={{ fontVariant: ["tabular-nums"] }}>
                                {subLine}
                            </Text>
                            {badgeBelow ? <View className="mt-1">{badge}</View> : null}
                        </View>
                        {badgeBelow ? null : badge}
                        {selecting ? null : (
                            <View style={{ transform: [{ rotate: expanded ? "90deg" : "0deg" }] }}>
                                <Icon as={ChevronRightIcon} size="md" className="text-muted" />
                            </View>
                        )}
                    </View>
                )}
            </Pressable>

            {showBody ? (
                <View>
                    {session.court ? (
                        <>
                            <GroupLabel label="Courts" />
                            {(() => {
                                const court = session.court
                                const state = rowState(session, court.datePaid)
                                const amount = state === "estimate"
                                    ? (session.estimate?.courtShare ?? 0)
                                    : state === "paid" ? court.charged : court.owed
                                const sub = `${formatRM(court.courtTotal)} ÷ ${plural(court.playerCount, "player")}`
                                return (
                                    <ChargeRow
                                        kind="court"
                                        title="Court share"
                                        sub={sub}
                                        amount={amount}
                                        state={state}
                                        date={court.datePaid}
                                        mode={mode}
                                        checked={selected.has(court.key)}
                                        onToggle={() => onToggleCharge(court.key)}
                                        accessibilityLabel={`Court share, ${sub}, ${chargeLabelSuffix(state, amount)}`}
                                        testID={`charge-${court.key}`}
                                    />
                                )
                            })()}
                        </>
                    ) : null}

                    {session.matches.map((match) => (
                        <View key={match.match_id}>
                            <GroupLabel label={`Match ${match.match_number + 1}`}>
                                <TeamsLine players={match.players} />
                                {match.freeOnly ? (
                                    <Text className="text-caption text-muted">Free shuttles only</Text>
                                ) : null}
                            </GroupLabel>
                            {match.charges.map((charge, index) => {
                                const state = rowState(session, charge.datePaid)
                                const amount = state === "estimate"
                                    ? (session.estimate?.shuttleShares[charge.shuttle_instance_id] ?? 0)
                                    : state === "paid" ? charge.charged : charge.owed
                                const sub = `${formatRM(charge.unitPrice)} ÷ ${plural(charge.playerCount, "player")}${charge.reused ? " · reused" : ""}`
                                return (
                                    <ChargeRow
                                        key={charge.key}
                                        kind="shuttle"
                                        title={charge.shuttleName}
                                        sub={sub}
                                        amount={amount}
                                        state={state}
                                        date={charge.datePaid}
                                        mode={mode}
                                        checked={selected.has(charge.key)}
                                        onToggle={() => onToggleCharge(charge.key)}
                                        showDivider={index > 0}
                                        accessibilityLabel={`${charge.shuttleName}, match ${match.match_number + 1}, ${sub}, ${chargeLabelSuffix(state, amount)}`}
                                        testID={`charge-${charge.key}`}
                                    />
                                )
                            })}
                        </View>
                    ))}

                    {isOpen ? (
                        <Text className="border-t border-border-subtle px-3.5 py-2.5 text-caption text-muted">
                            Final shares are set when the session closes.
                        </Text>
                    ) : null}
                </View>
            ) : null}

            {!selecting && session.state === "owing" ? (
                <View className="border-t border-border-subtle px-3.5 pb-3 pt-2.5">
                    <Pressable
                        onPress={() => onPaySession(session)}
                        accessibilityRole="button"
                        accessibilityLabel={`Pay session, ${formatRM(session.owed)}`}
                        testID={`pay-session-${session.session_id}`}
                        className="min-h-11 items-center justify-center rounded-lg border-[1.5px] border-sage bg-surface-raised px-3 active:opacity-85"
                    >
                        <Text className="text-body font-medium text-on-sage" style={{ fontVariant: ["tabular-nums"] }}>
                            Pay session · {formatRM(session.owed)}
                        </Text>
                    </Pressable>
                </View>
            ) : null}
        </View>
    )
}
