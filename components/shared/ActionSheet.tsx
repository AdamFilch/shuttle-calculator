import {
    Actionsheet,
    ActionsheetBackdrop,
    ActionsheetContent,
    ActionsheetDragIndicator,
    ActionsheetDragIndicatorWrapper,
} from "@/components/ui/actionsheet"
import { CloseIcon, Icon } from "@/components/ui/icon"
import { ReactNode, useEffect, useState } from "react"
import { Keyboard, Platform, Pressable, ScrollView, Text, View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

function useKeyboardHeight() {
    const [height, setHeight] = useState(0)

    useEffect(() => {
        const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow"
        const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide"
        const show = Keyboard.addListener(showEvent, (e) => setHeight(e.endCoordinates.height))
        const hide = Keyboard.addListener(hideEvent, () => setHeight(0))
        return () => {
            show.remove()
            hide.remove()
        }
    }, [])

    return height
}

export function ActionSheet({
    isOpen,
    onClose,
    title,
    subtitle,
    children,
    testID,
}: {
    isOpen: boolean,
    onClose: () => void,
    title: string,
    subtitle?: string,
    children: ReactNode,
    testID?: string
}) {
    const insets = useSafeAreaInsets()
    const keyboardHeight = useKeyboardHeight()

    return (
        <Actionsheet isOpen={isOpen} onClose={onClose}>
            <ActionsheetBackdrop className="bg-ink" animate={{ opacity: 0.45 }} />
            <ActionsheetContent
                testID={testID}
                className="items-stretch rounded-t-2xl border-0 bg-surface-raised px-5 pt-2 shadow-modal"
                style={{ paddingBottom: Math.max(insets.bottom, 20) + keyboardHeight, maxHeight: "92%" }}
            >
                <ActionsheetDragIndicatorWrapper>
                    <ActionsheetDragIndicator className="h-[5px] w-9 bg-border" />
                </ActionsheetDragIndicatorWrapper>
                <View className="mt-2 flex-row items-center justify-between gap-2">
                    <Text className="flex-1 text-modal-title font-semibold text-ink" accessibilityRole="header">
                        {title}
                    </Text>
                    <Pressable
                        onPress={onClose}
                        accessibilityRole="button"
                        accessibilityLabel="Close"
                        className="-mr-2.5 h-11 w-11 items-center justify-center rounded-lg active:opacity-85"
                    >
                        <Icon as={CloseIcon} size="lg" className="text-ink" />
                    </Pressable>
                </View>
                {subtitle ? (
                    <Text className="text-body text-muted">{subtitle}</Text>
                ) : null}
                <ScrollView
                    className="mt-4"
                    contentContainerClassName="gap-4"
                    keyboardShouldPersistTaps="handled"
                    bounces={false}
                >
                    {children}
                </ScrollView>
            </ActionsheetContent>
        </Actionsheet>
    )
}
