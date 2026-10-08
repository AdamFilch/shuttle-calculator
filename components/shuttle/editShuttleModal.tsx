import { useAppToast } from "@/components/shared/AppToast"
import { SegmentedControl } from "@/components/shared/SegmentedControl"
import {
    addShuttlePurchase,
    fetchShuttlePurchaseHistory,
    isShuttleNameTaken,
    ShuttlePurchase,
    ShuttleStockType,
    updateShuttle,
    WarnUnit
} from "@/services/shuttle"
import { DisplayDateDMonYYYY, parseSQLTimestamp } from "@/services/time-display"
import { useEffect, useState } from "react"
import { Pressable, Text, View } from "react-native"
import { CloseIcon, Icon } from "../ui/icon"
import { Input, InputField } from "../ui/input"
import { Modal, ModalBackdrop, ModalBody, ModalContent, ModalHeader } from "../ui/modal"
import { FieldError, fieldForError, inputClassName, ShuttleField, ShuttleFieldKey } from "./field"

const DUPLICATE = "A shuttle with this name already exists"

function sessions(k: number) {
    return k < 1 ? "less than 1 session" : `${k} ${k === 1 ? "session" : "sessions"}`
}

function warnHint(
    warnAt: string,
    unit: WarnUnit,
    shuttle: ShuttleStockType,
    clubAvg: number | null
): { text: string, low: boolean } {
    if (warnAt.trim() === "") return { text: "Leave empty to warn only when it's out.", low: false }
    const n = Number(warnAt)
    if (!Number.isInteger(n) || n < 1) return { text: "", low: false }
    const r = shuttle.remaining
    if (unit === "shuttles") {
        const low = r <= n
        return { text: `Shows as low at ${n} or fewer left. Now ${r} left${low ? ", so it's low." : "."}`, low }
    }
    const head = `Shows as low when about ${sessions(n)} or fewer are left.`
    if (shuttle.runway_sessions !== null && shuttle.avg_per_session !== null) {
        const k = shuttle.runway_sessions
        const low = r <= 0 || k <= n
        const avg = Math.round(shuttle.avg_per_session)
        return {
            text: `${head} Now about ${sessions(k)}${avg > 0 ? ` (uses ~${avg} a session)` : ""}${low ? ", so it's low." : "."}`,
            low,
        }
    }
    if (clubAvg !== null && clubAvg > 0) {
        const k = r > 0 ? Math.floor(r / clubAvg) : 0
        const low = k <= n
        return {
            text: `${head} Not used in recent sessions, so this uses the club average of ~${Math.round(clubAvg)} a session${low ? `. Now about ${sessions(k)}, so it's low.` : "."}`,
            low,
        }
    }
    return { text: "No sessions with paid shuttles yet, so this can't warn by sessions until there are.", low: false }
}

export function EditShuttleModal({
    open,
    shuttle,
    clubAvg,
    onClose
}: {
    open: boolean,
    shuttle: ShuttleStockType | null,
    clubAvg: number | null,
    onClose: () => void
}) {
    const toast = useAppToast()
    const [name, setName] = useState("")
    const [pricePerShuttle, setPricePerShuttle] = useState("")
    const [warnAt, setWarnAt] = useState("")
    const [warnUnit, setWarnUnit] = useState<WarnUnit>("shuttles")
    const [purchaseHistory, setPurchaseHistory] = useState<ShuttlePurchase[]>([])
    const [buyAgainQty, setBuyAgainQty] = useState("")
    const [nameCheck, setNameCheck] = useState({ name: "", taken: false })
    const [errors, setErrors] = useState<Partial<Record<ShuttleFieldKey, string>>>({})
    const [saving, setSaving] = useState(false)

    const [syncedShuttle, setSyncedShuttle] = useState<ShuttleStockType | null>(null)
    const activeShuttle = open ? shuttle : null
    if (activeShuttle !== syncedShuttle) {
        setSyncedShuttle(activeShuttle)
        if (activeShuttle) {
            setName(activeShuttle.name)
            setPricePerShuttle(activeShuttle.price_per_shuttle.toFixed(2))
            setWarnAt(activeShuttle.warn_at === null ? "" : String(activeShuttle.warn_at))
            setWarnUnit(activeShuttle.warn_unit ?? "shuttles")
            setBuyAgainQty("")
            setErrors({})
        }
    }

    useEffect(() => {
        if (open && shuttle) {
            fetchShuttlePurchaseHistory(shuttle.shuttle_id).then(setPurchaseHistory).catch(() => setPurchaseHistory([]))
        }
    }, [open, shuttle])

    const trimmed = name.trim()
    const shuttleId = shuttle?.shuttle_id
    useEffect(() => {
        let current = true
        if (!trimmed || shuttleId === undefined) {
            return
        }
        isShuttleNameTaken(trimmed, shuttleId).then((taken) => current && setNameCheck({ name: trimmed, taken })).catch(() => undefined)
        return () => {
            current = false
        }
    }, [trimmed, shuttleId])

    const taken = nameCheck.taken && nameCheck.name === trimmed
    const warnNum = Number(warnAt)
    const warnEmpty = warnAt.trim() === ""
    const warnValid = warnEmpty || (Number.isInteger(warnNum) && warnNum >= 1)
    const canSave = trimmed.length > 0 && !taken && Number(pricePerShuttle) > 0 && warnValid && !saving
    const buyQty = Number(buyAgainQty)
    const canBuyAgain = Number.isInteger(buyQty) && buyQty >= 1
    const hint = shuttle ? warnHint(warnAt, warnUnit, shuttle, clubAvg) : null
    const warnError = errors.warn ?? (warnValid ? null : "Warn at must be a whole number of at least 1")

    async function onClickSave() {
        if (!shuttle || !canSave) return
        setErrors({})
        setSaving(true)
        try {
            await updateShuttle({
                shuttle_id: shuttle.shuttle_id,
                name: trimmed,
                price_per_shuttle: Number(pricePerShuttle),
                warn_at: warnEmpty ? null : warnNum,
                warn_unit: warnEmpty ? null : warnUnit
            })
            onClose()
        } catch (e) {
            const message = e instanceof Error ? e.message : ""
            const field = fieldForError(message)
            if (field) setErrors({ [field]: message })
            else toast.show("Couldn't save. Try again.")
        } finally {
            setSaving(false)
        }
    }

    async function onClickBuyAgain() {
        if (!shuttle || !canBuyAgain) return
        try {
            await addShuttlePurchase({ shuttle_id: shuttle.shuttle_id, num_of_shuttles: buyQty })
            setBuyAgainQty("")
            setPurchaseHistory(await fetchShuttlePurchaseHistory(shuttle.shuttle_id))
        } catch {
            toast.show("Couldn't save. Try again.")
        }
    }

    return (
        <Modal isOpen={open} onClose={onClose}>
            <ModalBackdrop className="bg-ink" animate={{ opacity: 0.45 }} />
            <ModalContent className="max-h-[90%] w-[92%] rounded-2xl border-0 bg-surface-raised p-5 shadow-modal">
                <ModalHeader className="items-center">
                    <Text className="flex-1 text-modal-title font-semibold text-ink" numberOfLines={1}>{shuttle?.name}</Text>
                    <Pressable
                        onPress={onClose}
                        accessibilityRole="button"
                        accessibilityLabel="Close"
                        className="-mr-2 h-[44px] w-[44px] items-center justify-center"
                    >
                        <Icon as={CloseIcon} size="lg" className="text-muted" />
                    </Pressable>
                </ModalHeader>
                <ModalBody className="mb-0">
                    <View className="gap-3">
                        <ShuttleField
                            label="Name"
                            value={name}
                            onChangeText={(v) => {
                                setName(v)
                                setErrors((prev) => ({ ...prev, name: undefined }))
                            }}
                            error={taken ? DUPLICATE : errors.name}
                            testID="edit-shuttle-name"
                        />
                        <ShuttleField
                            label="Price per shuttle"
                            prefix="RM"
                            keyboardType="decimal-pad"
                            value={pricePerShuttle}
                            onChangeText={setPricePerShuttle}
                            error={errors.price}
                            testID="edit-shuttle-price"
                        />
                        <View className="gap-1">
                            <Text className="text-caption text-muted">Warn at (optional)</Text>
                            <View className="flex-row gap-2">
                                <Input variant="outline" isInvalid={!!warnError} className={`w-[84px] ${inputClassName}`}>
                                    <InputField
                                        accessibilityLabel="Warn at"
                                        keyboardType="number-pad"
                                        value={warnAt}
                                        onChangeText={(v) => {
                                            setWarnAt(v)
                                            setErrors((prev) => ({ ...prev, warn: undefined }))
                                        }}
                                        className="text-body text-ink"
                                        testID="edit-shuttle-warn"
                                    />
                                </Input>
                                <View className="flex-1">
                                    <SegmentedControl<WarnUnit>
                                        options={[
                                            { value: "shuttles", label: "Shuttles" },
                                            { value: "sessions", label: "Sessions" },
                                        ]}
                                        value={warnUnit}
                                        onChange={setWarnUnit}
                                        accessibilityLabel="Warn at unit"
                                        testID="edit-shuttle-unit"
                                    />
                                </View>
                            </View>
                            <FieldError message={warnError} />
                            {hint?.text ? (
                                <Text
                                    className={`text-caption ${hint.low ? "text-clay-strong" : "text-muted"}`}
                                    testID="edit-shuttle-hint"
                                    accessibilityLiveRegion="polite"
                                >
                                    {hint.text}
                                </Text>
                            ) : null}
                        </View>

                        <View className="h-px bg-border-subtle" />

                        <View className="gap-1">
                            <Text className="text-body font-medium text-ink">Recent purchases</Text>
                            {purchaseHistory.length === 0 ? (
                                <Text className="text-body text-muted">No purchases yet</Text>
                            ) : (
                                purchaseHistory.map((purchase) => (
                                    <Text
                                        key={purchase.shuttle_purchase_id}
                                        className="text-body text-muted"
                                        style={{ fontVariant: ["tabular-nums"] }}
                                    >
                                        {DisplayDateDMonYYYY(purchase.date.includes("T") ? purchase.date : parseSQLTimestamp(purchase.date))} · +{purchase.num_of_shuttles} shuttles
                                    </Text>
                                ))
                            )}
                        </View>

                        <View className="h-px bg-border-subtle" />

                        <View className="gap-1">
                            <Text className="text-caption text-muted">Buy again (shuttles)</Text>
                            <View className="flex-row gap-2">
                                <Input variant="outline" className={`flex-1 ${inputClassName}`}>
                                    <InputField
                                        accessibilityLabel="Buy again (shuttles)"
                                        keyboardType="number-pad"
                                        value={buyAgainQty}
                                        onChangeText={setBuyAgainQty}
                                        className="text-body text-ink"
                                        testID="edit-shuttle-buy-qty"
                                    />
                                </Input>
                                <Pressable
                                    onPress={onClickBuyAgain}
                                    disabled={!canBuyAgain}
                                    accessibilityRole="button"
                                    accessibilityState={{ disabled: !canBuyAgain }}
                                    testID="edit-shuttle-add-stock"
                                    className={`min-h-[44px] items-center justify-center rounded-lg border px-4 ${canBuyAgain ? "border-primary active:opacity-85" : "border-border opacity-50"}`}
                                >
                                    <Text className="text-body font-medium text-primary">Add to stock</Text>
                                </Pressable>
                            </View>
                        </View>
                    </View>
                </ModalBody>
                <View className="mt-4 flex-row gap-3">
                    <Pressable
                        onPress={onClose}
                        accessibilityRole="button"
                        className="min-h-[44px] flex-1 items-center justify-center rounded-lg border border-border bg-surface-raised active:opacity-85"
                    >
                        <Text className="text-body font-medium text-ink">Cancel</Text>
                    </Pressable>
                    <Pressable
                        onPress={onClickSave}
                        disabled={!canSave}
                        accessibilityRole="button"
                        accessibilityState={{ disabled: !canSave }}
                        testID="edit-shuttle-save"
                        className={`min-h-[44px] flex-1 items-center justify-center rounded-lg ${canSave ? "bg-primary active:opacity-85" : "bg-disabled"}`}
                    >
                        <Text className={`text-body font-medium ${canSave ? "text-surface" : "text-muted"}`}>Save</Text>
                    </Pressable>
                </View>
            </ModalContent>
        </Modal>
    )
}
