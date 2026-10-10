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
    label,
    value,
    onChange,
    disabled = false,
    min = 0,
    max,
}: {
    shuttle?: { name: string, colourIndex: number },
    label?: string,
    value: number,
    onChange: (value: number) => void,
    disabled?: boolean,
    min?: number,
    max?: number
}) {
    const name = shuttle?.name ?? label ?? ""
    const minusDisabled = disabled || value <= min
    const plusDisabled = disabled || (max !== undefined && value >= max)
    const outline = disabled
        ? "border-[1.5px] border-error-500"
        : shuttle && value > 0
            ? "border-[1.5px] border-sage"
            : "border border-border-subtle"
    const button = shuttle ? "h-8 w-9" : "h-[44px] w-[44px]"

    return (
        <View
            testID={`stepper-${name}`}
            className={`flex-row items-center gap-3 rounded-xl bg-surface-raised py-2.5 pl-3.5 pr-2.5 ${outline}`}
        >
            {shuttle && <ShuttleGlyph colour={glyphColour(shuttle.colourIndex)} />}
            <View className="flex-1">
                <Text className={`text-ink ${shuttle ? "text-card-title font-medium" : "text-body"}`} numberOfLines={1}>
                    {name}
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
                    accessibilityLabel={`Remove one ${name}`}
                    hitSlop={8}
                    className={`${button} items-center justify-center rounded-md bg-surface-raised ${minusDisabled ? "opacity-40" : "active:opacity-85"}`}
                >
                    <Icon as={RemoveIcon} size="md" className="text-ink" />
                </Pressable>
                <Text
                    className="min-w-[28px] text-center text-card-title font-medium text-ink"
                    style={{ fontVariant: ["tabular-nums"] }}
                >
                    {value}
                </Text>
                <Pressable
                    disabled={plusDisabled}
                    onPress={() => onChange(value + 1)}
                    accessibilityRole="button"
                    accessibilityLabel={`Add one ${name}`}
                    hitSlop={8}
                    className={`${button} items-center justify-center rounded-md bg-primary ${plusDisabled ? "opacity-40" : "active:opacity-85"}`}
                >
                    <Icon as={AddIcon} size="md" className="text-surface" />
                </Pressable>
            </View>
        </View>
    )
}
