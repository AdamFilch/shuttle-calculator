import { CheckIcon, Icon } from "@/components/ui/icon"
import { Toast, useToast } from "@/components/ui/toast"
import { useCallback } from "react"
import { AccessibilityInfo, Text } from "react-native"

export const APP_TOAST_DURATION = 1500

export function useAppToast() {
    const toast = useToast()

    const show = useCallback((message: string) => {
        AccessibilityInfo.announceForAccessibilityWithOptions(message, { queue: true })
        toast.show({
            placement: "bottom",
            duration: APP_TOAST_DURATION,
            render: ({ id }) => (
                <Toast
                    nativeID={`toast-${id}`}
                    testID="app-toast"
                    accessibilityLiveRegion="polite"
                    className="mb-20 flex-row items-center gap-2 self-center rounded-full border-0 bg-ink px-3.5 py-2 shadow-none"
                >
                    <Icon as={CheckIcon} size="sm" className="text-surface" />
                    <Text className="text-section-label font-medium tracking-normal text-surface" style={{ fontVariant: ["tabular-nums"] }}>
                        {message}
                    </Text>
                </Toast>
            ),
        })
    }, [toast])

    return { show }
}
