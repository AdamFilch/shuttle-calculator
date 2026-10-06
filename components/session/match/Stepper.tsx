import { designTokens } from "@/components/ui/gluestack-ui-provider/config"
import { AddIcon, Icon, RemoveIcon } from "@/components/ui/icon"
import { Pressable, Text, View } from "react-native"
import { ShuttleGlyph } from "./ShuttleGlyph"

const GLYPH_COLOURS = [
    designTokens.clay,
    designTokens.primary,
    designTokens.settled,
    designTokens.muted,
]

export function glyphColour(colourIndex: number): string {
    return GLYPH_COLOURS[colourIndex % GLYPH_COLOURS.length]
}

export function Stepper({
    shuttle,
    value,
    onChange,
    disabled = false,
}: {
    shuttle: { name: string, colourIndex: number },
    value: number,
    onChange: (value: number) => void,
    disabled?: boolean
}) {
    const minusDisabled = disabled || value <= 0
    const outline = disabled
        ? "border-[1.5px] border-error-500"
        : value > 0
            ? "border-[1.5px] border-sage"
            : "border border-border-subtle"

    return (
        <View
            testID={`stepper-${shuttle.name}`}
            className={`flex-row items-center gap-3 rounded-xl bg-surface-raised py-2.5 pl-3.5 pr-2.5 ${outline}`}
        >
            <ShuttleGlyph colour={glyphColour(shuttle.colourIndex)} />
            <View className="flex-1">
                <Text className="text-card-title font-medium text-ink" numberOfLines={1}>
                    {shuttle.name}
                </Text>
                {disabled && (
                    <Text className="text-caption text-error-600">Out of stock</Text>
                )}
            </View>
            <View className="flex-row items-center gap-0.5 rounded-lg bg-surface p-0.5">
                <Pressable
                    disabled={minusDisabled}
                    onPress={() => onChange(value - 1)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove one ${shuttle.name}`}
                    className={`h-8 w-9 items-center justify-center rounded-md bg-surface-raised ${minusDisabled ? "opacity-40" : "active:opacity-85"}`}
                >
                    <Icon as={RemoveIcon} size="md" className="text-ink" />
                </Pressable>
                <Text className="min-w-[28px] text-center text-card-title font-medium text-ink">
                    {value}
                </Text>
                <Pressable
                    disabled={disabled}
                    onPress={() => onChange(value + 1)}
                    accessibilityRole="button"
                    accessibilityLabel={`Add one ${shuttle.name}`}
                    className={`h-8 w-9 items-center justify-center rounded-md bg-primary ${disabled ? "opacity-40" : "active:opacity-85"}`}
                >
                    <Icon as={AddIcon} size="md" className="text-surface" />
                </Pressable>
            </View>
        </View>
    )
}
