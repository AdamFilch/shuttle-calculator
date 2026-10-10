import { SegmentedControl } from "@/components/shared/SegmentedControl"
import { designTokens } from "@/components/ui/gluestack-ui-provider/config"
import { AddIcon, CheckIcon, CloseIcon, Icon } from "@/components/ui/icon"
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalHeader } from "@/components/ui/modal"
import {
    Select,
    SelectBackdrop,
    SelectContent,
    SelectDragIndicator,
    SelectDragIndicatorWrapper,
    SelectItem,
    SelectPortal,
    SelectTrigger,
} from "@/components/ui/select"
import { ShuttleSelection } from "@/services/match"
import {
    fetchAllShuttlesWithInventory,
    fetchSessionShuttleTypes,
    fetchTopShuttleTypes,
    ShuttleTypeOption,
} from "@/services/shuttle"
import { fetchShuttleInstancesBySessionId, ShuttleInstance } from "@/services/shuttle_instances"
import { useEffect, useMemo, useState } from "react"
import { Pressable, Text, View } from "react-native"
import { ShuttleGlyph } from "./ShuttleGlyph"
import { Stepper } from "./Stepper"

type Tab = "new" | "reuse"

type Draft = {
    counts: Record<number, number>,
    free: number,
    reused: number[],
    added: number[],
}

export function countSelectedShuttles(selection: ShuttleSelection[]): number {
    return selection.reduce((total, s) => total + (s.mode === "new" ? s.quantity : 1), 0)
}

function draftFromSelection(selection: ShuttleSelection[], added: number[]): Draft {
    const counts: Record<number, number> = {}
    let free = 0
    const reused: number[] = []
    for (const s of selection) {
        if (s.mode === "new") {
            counts[s.shuttleId] = (counts[s.shuttleId] ?? 0) + s.quantity
        } else if (s.mode === "reused") {
            if (!reused.includes(s.shuttleInstanceId)) reused.push(s.shuttleInstanceId)
        } else {
            free += 1
        }
    }
    return { counts, free, reused, added: [...added] }
}

function pluralShuttles(n: number): string {
    return `${n} ${n === 1 ? "shuttle" : "shuttles"}`
}

export function ShuttlesModal({
    open,
    sessionId,
    selection,
    addedTypeIds,
    onCancel,
    onDone,
}: {
    open: boolean,
    sessionId: number,
    selection: ShuttleSelection[],
    addedTypeIds: number[],
    onCancel: () => void,
    onDone: (selection: ShuttleSelection[], addedTypeIds: number[]) => void
}) {
    const [tab, setTab] = useState<Tab>("new")
    const [draft, setDraft] = useState<Draft>(() => draftFromSelection(selection, addedTypeIds))
    const [topTypes, setTopTypes] = useState<ShuttleTypeOption[]>([])
    const [sessionTypes, setSessionTypes] = useState<ShuttleTypeOption[]>([])
    const [allTypes, setAllTypes] = useState<ShuttleTypeOption[]>([])
    const [instances, setInstances] = useState<ShuttleInstance[]>([])

    useEffect(() => {
        fetchTopShuttleTypes(3).then(setTopTypes)
        fetchSessionShuttleTypes(sessionId).then(setSessionTypes)
        fetchAllShuttlesWithInventory().then((res) =>
            setAllTypes(res.map((s) => ({ shuttle_id: s.shuttle_id, name: s.name, remaining: s.remaining })))
        )
        fetchShuttleInstancesBySessionId(sessionId).then(setInstances)
    }, [sessionId])

    const rows = useMemo(() => {
        const shown = new Set<number>()
        const result: ShuttleTypeOption[] = []
        const push = (option: ShuttleTypeOption | undefined) => {
            if (!option || shown.has(option.shuttle_id)) return
            shown.add(option.shuttle_id)
            result.push(option)
        }
        topTypes.forEach(push)
        sessionTypes.forEach(push)
        const extraIds = [
            ...draft.added,
            ...Object.keys(draft.counts).map(Number).filter((id) => draft.counts[id] > 0),
        ]
        extraIds.forEach((id) => push(allTypes.find((t) => t.shuttle_id === id)))
        return result
    }, [topTypes, sessionTypes, allTypes, draft.added, draft.counts])

    const addableTypes = useMemo(() => {
        const shownIds = new Set(rows.map((r) => r.shuttle_id))
        return allTypes.filter((t) => t.remaining > 0 && !shownIds.has(t.shuttle_id))
    }, [allTypes, rows])

    const setCount = (shuttleId: number, value: number) => {
        setDraft((prev) => ({ ...prev, counts: { ...prev.counts, [shuttleId]: Math.max(0, value) } }))
    }

    const addType = (shuttleId: number) => {
        setDraft((prev) => ({
            ...prev,
            added: prev.added.includes(shuttleId) ? prev.added : [...prev.added, shuttleId],
            counts: { ...prev.counts, [shuttleId]: Math.max(1, prev.counts[shuttleId] ?? 0) },
        }))
    }

    const toggleReused = (instanceId: number) => {
        setDraft((prev) => ({
            ...prev,
            reused: prev.reused.includes(instanceId)
                ? prev.reused.filter((id) => id !== instanceId)
                : [...prev.reused, instanceId],
        }))
    }

    const commit = () => {
        const orderedIds = [
            ...rows.map((r) => r.shuttle_id),
            ...Object.keys(draft.counts).map(Number).filter((id) => !rows.some((r) => r.shuttle_id === id)),
        ]
        const next: ShuttleSelection[] = []
        for (const id of orderedIds) {
            const quantity = draft.counts[id] ?? 0
            if (quantity > 0) next.push({ mode: "new", shuttleId: id, quantity })
        }
        for (let i = 0; i < draft.free; i++) next.push({ mode: "free" })
        for (const id of draft.reused) next.push({ mode: "reused", shuttleInstanceId: id })
        onDone(next, draft.added)
    }

    return (
        <Modal size="md" isOpen={open} onClose={onCancel}>
            <ModalBackdrop className="bg-ink" animate={{ opacity: 0.45 }} />
            <ModalContent className="max-h-[85%] w-[92%] rounded-2xl border-0 bg-surface p-5 shadow-hard-2">
                <ModalHeader className="items-start">
                    <Text className="text-modal-title font-semibold text-ink">Shuttles used</Text>
                    <Pressable
                        onPress={onCancel}
                        accessibilityRole="button"
                        accessibilityLabel="Close"
                        hitSlop={8}
                        testID="shuttles-modal-close"
                        className="p-0.5"
                    >
                        <Icon as={CloseIcon} size="lg" className="text-muted" />
                    </Pressable>
                </ModalHeader>
                <View className="mb-3 mt-1 flex-row items-center gap-1.5">
                    <View className="h-1.5 w-1.5 rounded-full bg-clay" />
                    <Text className="text-[13px] font-medium leading-[18px] text-clay" testID="shuttles-modal-subtitle">
                        {pluralShuttles(sessionTypes.length)} logged for this session
                    </Text>
                </View>
                <View className="mb-3">
                    <SegmentedControl<Tab>
                        options={[
                            { value: "new", label: "New shuttle" },
                            { value: "reuse", label: "Reuse shuttle" },
                        ]}
                        value={tab}
                        onChange={setTab}
                        accessibilityLabel="Shuttle source"
                        testID="shuttles-tab"
                    />
                </View>
                <ModalBody className="mb-0 mt-0">
                    {tab === "new" ? (
                        <View className="gap-2">
                            {rows.map((row, index) => (
                                <Stepper
                                    key={row.shuttle_id}
                                    shuttle={{ name: row.name, colourIndex: index }}
                                    value={draft.counts[row.shuttle_id] ?? 0}
                                    onChange={(value) => setCount(row.shuttle_id, value)}
                                    disabled={row.remaining <= 0}
                                    max={row.remaining}
                                />
                            ))}
                            <Select
                                selectedValue={null}
                                isDisabled={addableTypes.length === 0}
                                onValueChange={(value) => addType(parseInt(value))}
                            >
                                <SelectTrigger
                                    size="xl"
                                    testID="add-different-shuttle"
                                    className="h-auto justify-center gap-2 rounded-xl border-dashed border-border-dashed py-3"
                                >
                                    <Icon as={AddIcon} size="md" className="text-primary" />
                                    <Text className="text-body font-medium text-primary">
                                        Add a different shuttle
                                    </Text>
                                </SelectTrigger>
                                <SelectPortal>
                                    <SelectBackdrop />
                                    <SelectContent>
                                        <SelectDragIndicatorWrapper>
                                            <SelectDragIndicator />
                                        </SelectDragIndicatorWrapper>
                                        {addableTypes.map((type) => (
                                            <SelectItem
                                                key={type.shuttle_id}
                                                label={`${type.name} (${type.remaining} left)`}
                                                value={String(type.shuttle_id)}
                                            />
                                        ))}
                                    </SelectContent>
                                </SelectPortal>
                            </Select>
                            <Stepper
                                shuttle={{ name: "Free shuttle", colourIndex: 3 }}
                                value={draft.free}
                                onChange={(value) => setDraft((prev) => ({ ...prev, free: Math.max(0, value) }))}
                            />
                        </View>
                    ) : instances.length === 0 ? (
                        <Text className="py-2 text-body text-muted" testID="reuse-empty">
                            No shuttles used in this session yet.
                        </Text>
                    ) : (
                        <View className="gap-2">
                            {instances.map((instance) => {
                                const selected = draft.reused.includes(instance.shuttle_instance_id)
                                return (
                                    <Pressable
                                        key={instance.shuttle_instance_id}
                                        onPress={() => toggleReused(instance.shuttle_instance_id)}
                                        accessibilityRole="checkbox"
                                        accessibilityState={{ checked: selected }}
                                        testID={`reuse-${instance.label}`}
                                    >
                                        {({ pressed }) => (
                                            <View
                                                className={`flex-row items-center gap-3 rounded-xl py-3 pl-3.5 pr-3 ${selected ? "border-[1.5px] border-sage" : "border border-border-subtle"} ${pressed ? "bg-primary-tint" : "bg-surface-raised"}`}
                                            >
                                                <ShuttleGlyph colour={instance.shuttle_id === null ? designTokens.muted : designTokens.clay} />
                                                <Text className="flex-1 text-card-title font-medium text-ink" numberOfLines={1}>
                                                    {instance.label}
                                                </Text>
                                                <View
                                                    className={`h-6 w-6 items-center justify-center rounded-md ${selected ? "bg-sage" : "border border-border bg-surface-raised"}`}
                                                >
                                                    {selected && <Icon as={CheckIcon} size="sm" className="text-on-sage" />}
                                                </View>
                                            </View>
                                        )}
                                    </Pressable>
                                )
                            })}
                        </View>
                    )}
                </ModalBody>
                <View className="mt-3 flex-row gap-3">
                    <Pressable
                        onPress={onCancel}
                        accessibilityRole="button"
                        testID="shuttles-cancel"
                        className="items-center rounded-lg border border-border bg-surface-raised py-[11px] active:opacity-85"
                        style={{ flex: 2 }}
                    >
                        <Text className="text-body font-medium text-ink">Cancel</Text>
                    </Pressable>
                    <Pressable
                        onPress={commit}
                        accessibilityRole="button"
                        testID="shuttles-done"
                        className="items-center rounded-lg bg-primary py-[11px] active:opacity-85"
                        style={{ flex: 3 }}
                    >
                        <Text className="text-body font-medium text-surface">Done</Text>
                    </Pressable>
                </View>
            </ModalContent>
        </Modal>
    )
}
