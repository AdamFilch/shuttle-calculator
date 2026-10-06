import { ReactNode } from "react"
import { Pressable, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

export type BottomAction = {
    label: string,
    onPress: () => void,
    tone: "primary" | "sage" | "destructive",
    icon?: ReactNode,
    testID?: string
}

const TONE_CLASS: Record<BottomAction["tone"], { button: string, label: string }> = {
    primary: { button: "bg-primary", label: "text-surface" },
    sage: { button: "bg-sage", label: "text-on-sage" },
    destructive: { button: "bg-error-600", label: "text-surface" },
}

function ActionButton({ action, flex }: { action: BottomAction, flex: number }) {
    const tone = TONE_CLASS[action.tone]

    return (
        <Pressable
            onPress={action.onPress}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            testID={action.testID}
            style={{ flex }}
            className={`min-h-11 flex-row items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 active:opacity-85 ${tone.button}`}
        >
            {action.icon}
            <Text className={`text-center text-body font-medium ${tone.label}`}>{action.label}</Text>
        </Pressable>
    )
}

export function BottomActionBar({
    secondary,
    primary,
}: {
    secondary?: BottomAction,
    primary: BottomAction
}) {
    const insets = useSafeAreaInsets()

    return (
        <View
            className="flex-row gap-2 border-t border-border-subtle bg-surface px-4 pt-3"
            style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        >
            {secondary ? <ActionButton action={secondary} flex={1} /> : null}
            <ActionButton action={primary} flex={1.35} />
        </View>
    )
}
