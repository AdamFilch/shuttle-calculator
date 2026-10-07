import { ReactNode } from "react"
import { Pressable, Text, useWindowDimensions, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export type BottomAction = {
    label: string,
    onPress: () => void,
    tone: "primary" | "sage" | "clay" | "destructive",
    icon?: ReactNode,
    disabled?: boolean,
    testID?: string
}

const TONE_CLASS: Record<BottomAction["tone"], { button: string, label: string }> = {
    primary: { button: "bg-primary", label: "text-surface" },
    sage: { button: "bg-sage", label: "text-on-sage" },
    clay: { button: "bg-clay", label: "text-surface" },
    destructive: { button: "bg-error-600", label: "text-surface" },
}

const DISABLED_CLASS = { button: "bg-disabled", label: "text-muted" }

function ActionButton({ action, flex }: { action: BottomAction, flex?: number }) {
    const tone = action.disabled ? DISABLED_CLASS : TONE_CLASS[action.tone]

    return (
        <Pressable
            onPress={action.onPress}
            disabled={action.disabled}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            accessibilityState={{ disabled: !!action.disabled }}
            testID={action.testID}
            style={flex ? { flex } : undefined}
            className={`min-h-11 flex-row items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 active:opacity-85 ${tone.button}`}
        >
            {action.icon}
            <Text className={`text-center text-body font-medium ${tone.label}`} maxFontSizeMultiplier={2}>{action.label}</Text>
        </Pressable>
    )
}

export function BottomActionBar({
    secondary,
    primary,
    summary,
}: {
    secondary?: BottomAction,
    primary: BottomAction,
    summary?: ReactNode
}) {
    const insets = useSafeAreaInsets()
    const { fontScale } = useWindowDimensions()
    const stacked = fontScale >= 1.5

    return (
        <View
            className="gap-2 border-t border-border-subtle bg-surface px-4 pt-3"
            style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
            {summary}
            <View className={`${stacked ? "flex-col-reverse" : "flex-row"} gap-2`}>
                {secondary ? <ActionButton action={secondary} flex={stacked ? undefined : 1} /> : null}
                <ActionButton action={primary} flex={stacked ? undefined : 1.35} />
            </View>
        </View>
    )
}
