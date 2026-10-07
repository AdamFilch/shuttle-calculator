import { ActionSheet } from "@/components/shared/ActionSheet"
import { designTokens } from "@/components/ui/gluestack-ui-provider/config"
import { AddIcon, Icon, RemoveIcon } from "@/components/ui/icon"
import { bookCourt, CourtBooking } from "@/services/court"
import { formatRM } from "@/services/money-display"
import { ReactNode, useState } from "react"
import { Pressable, Text, TextInput, View } from "react-native"

function parsePositive(value: string): number | null {
    const trimmed = value.trim()
    if (!/^\d*\.?\d+$|^\d+\.$/.test(trimmed)) return null
    const parsed = parseFloat(trimmed)
    return parsed > 0 ? parsed : null
}

function Field({ label, error, children }: { label: string, error?: string | null, children: ReactNode }) {
    return (
        <View className="flex-1 gap-1.5">
            <Text className="text-caption text-muted">{label}</Text>
            {children}
            {error ? <Text className="text-caption text-error-600">{error}</Text> : null}
        </View>
    )
}

function CourtsStepper({ value, onChange }: { value: number, onChange: (value: number) => void }) {
    const minusDisabled = value <= 1

    return (
        <View className="h-11 flex-row items-center justify-between">
            <Pressable
                onPress={() => onChange(value - 1)}
                disabled={minusDisabled}
                accessibilityRole="button"
                accessibilityLabel="One fewer court"
                accessibilityState={{ disabled: minusDisabled }}
                className={`h-11 w-11 items-center justify-center rounded-lg border border-border bg-surface-raised ${minusDisabled ? "opacity-40" : "active:opacity-85"}`}
            >
                <Icon as={RemoveIcon} size="md" className="text-ink" />
            </Pressable>
            <Text
                className="text-body font-medium text-ink"
                style={{ fontVariant: ["tabular-nums"] }}
                accessibilityLabel={`${value} ${value === 1 ? "court" : "courts"}`}
            >
                {value}
            </Text>
            <Pressable
                onPress={() => onChange(value + 1)}
                accessibilityRole="button"
                accessibilityLabel="One more court"
                className="h-11 w-11 items-center justify-center rounded-lg bg-primary active:opacity-85"
            >
                <Icon as={AddIcon} size="md" className="text-surface" />
            </Pressable>
        </View>
    )
}

function bookingSubLine(court: CourtBooking) {
    const parts = [`${formatRM(court.price)} × ${court.quantity}`]
    if (court.duration_minutes) parts.push(`${court.duration_minutes} min`)
    return parts.join(" · ")
}

export function BookCourtsSheet({
    isOpen,
    onClose,
    sessionId,
    courts,
    onBooked,
}: {
    isOpen: boolean,
    onClose: () => void,
    sessionId: string,
    courts: CourtBooking[],
    onBooked: () => void
}) {
    const [label, setLabel] = useState("")
    const [price, setPrice] = useState("")
    const [quantity, setQuantity] = useState(1)
    const [hours, setHours] = useState("")
    const [priceTouched, setPriceTouched] = useState(false)
    const [hoursTouched, setHoursTouched] = useState(false)
    const [isSaving, setIsSaving] = useState(false)

    const priceValue = parsePositive(price)
    const hoursValue = hours.trim() === "" ? null : parsePositive(hours)
    const hoursValid = hours.trim() === "" || hoursValue !== null
    const canSave = priceValue !== null && hoursValid && !isSaving
    const bookingTotal = (priceValue ?? 0) * quantity

    const priceError = priceTouched && priceValue === null ? "Enter a price above RM 0" : null
    const hoursError = hoursTouched && !hoursValid ? "Enter hours above 0, or leave it empty" : null

    const reset = () => {
        setLabel("")
        setPrice("")
        setQuantity(1)
        setHours("")
        setPriceTouched(false)
        setHoursTouched(false)
    }

    const handleClose = () => {
        reset()
        onClose()
    }

    async function onClickSave() {
        if (!canSave || priceValue === null) return
        setIsSaving(true)
        try {
            await bookCourt({
                sessionId: parseInt(sessionId),
                label: label.trim() || undefined,
                price: priceValue,
                quantity,
                durationMinutes: hoursValue !== null ? Math.round(hoursValue * 60) : undefined,
            })
            reset()
            onBooked()
        } finally {
            setIsSaving(false)
        }
    }

    const inputClass = "h-11 rounded-lg border bg-surface-raised px-3 text-body text-ink"

    return (
        <ActionSheet
            isOpen={isOpen}
            onClose={handleClose}
            title="Book courts"
            subtitle="Split evenly across everyone who played when you close the session."
            testID="book-courts-sheet"
        >
            {courts.length > 0 ? (
                <View className="gap-2">
                    <Text className="text-section-label font-medium uppercase text-muted">Booked</Text>
                    {courts.map((court, index) => (
                        <View
                            key={court.court_booking_id}
                            accessible
                            accessibilityLabel={`${court.label || `Court booking ${index + 1}`}, ${bookingSubLine(court)}, total ${formatRM(court.price * court.quantity)}`}
                            className="flex-row items-center gap-3 rounded-xl border border-border-subtle bg-surface-raised px-3.5 py-3"
                        >
                            <View className="flex-1 gap-0.5">
                                <Text className="text-card-title font-medium text-ink">
                                    {court.label || `Court booking ${index + 1}`}
                                </Text>
                                <Text className="text-body text-muted" style={{ fontVariant: ["tabular-nums"] }}>
                                    {bookingSubLine(court)}
                                </Text>
                            </View>
                            <Text className="text-body font-semibold text-ink" style={{ fontVariant: ["tabular-nums"] }}>
                                {formatRM(court.price * court.quantity)}
                            </Text>
                        </View>
                    ))}
                </View>
            ) : null}

            <Text className="text-section-label font-medium uppercase text-muted">Add a booking</Text>

            <Field label="Label (optional)">
                <TextInput
                    value={label}
                    onChangeText={setLabel}
                    placeholder="e.g. Court 2"
                    placeholderTextColor={designTokens.muted}
                    accessibilityLabel="Label (optional)"
                    testID="book-courts-label"
                    className={`${inputClass} border-border`}
                />
            </Field>

            <View className="flex-row gap-3">
                <Field label="Price per court" error={priceError}>
                    <View
                        className={`h-11 flex-row items-center rounded-lg border bg-surface-raised px-3 ${priceError ? "border-error-600" : "border-border"}`}
                    >
                        <Text className="mr-1.5 text-body text-muted">RM</Text>
                        <TextInput
                            value={price}
                            onChangeText={setPrice}
                            onBlur={() => setPriceTouched(true)}
                            keyboardType="decimal-pad"
                            placeholder="0"
                            placeholderTextColor={designTokens.muted}
                            accessibilityLabel="Price per court in ringgit"
                            testID="book-courts-price"
                            className="h-11 flex-1 text-body text-ink"
                            style={{ fontVariant: ["tabular-nums"] }}
                        />
                    </View>
                </Field>
                <Field label="Courts">
                    <CourtsStepper value={quantity} onChange={setQuantity} />
                </Field>
            </View>

            <Field label="Duration in hours (optional)" error={hoursError}>
                <TextInput
                    value={hours}
                    onChangeText={setHours}
                    onBlur={() => setHoursTouched(true)}
                    keyboardType="decimal-pad"
                    placeholder="e.g. 1.5"
                    placeholderTextColor={designTokens.muted}
                    accessibilityLabel="Duration in hours, optional"
                    testID="book-courts-duration"
                    className={`${inputClass} ${hoursError ? "border-error-600" : "border-border"}`}
                />
            </Field>

            <View className="h-px overflow-hidden">
                <View className="h-0.5 rounded-sm border border-dashed border-border-dashed" />
            </View>
            <View className="-mt-1 flex-row justify-between">
                <Text className="text-body text-muted">This booking</Text>
                <Text className="text-body font-semibold text-ink" style={{ fontVariant: ["tabular-nums"] }}>
                    {formatRM(bookingTotal)}
                </Text>
            </View>

            <View className="flex-row gap-2">
                <Pressable
                    onPress={handleClose}
                    accessibilityRole="button"
                    className="min-h-11 flex-1 items-center justify-center rounded-lg border border-border bg-surface-raised active:opacity-85"
                >
                    <Text className="text-body font-medium text-ink">Cancel</Text>
                </Pressable>
                <Pressable
                    onPress={onClickSave}
                    disabled={!canSave}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !canSave }}
                    testID="book-courts-save"
                    className={`min-h-11 flex-1 items-center justify-center rounded-lg ${canSave ? "bg-primary active:opacity-85" : "bg-disabled"}`}
                >
                    <Text className={`text-body font-medium ${canSave ? "text-surface" : "text-muted"}`}>Book court</Text>
                </Pressable>
            </View>
        </ActionSheet>
    )
}
