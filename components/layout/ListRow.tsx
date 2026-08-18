import { HStack } from "@/components/ui/hstack"
import { Text } from "@/components/ui/text"
import { VStack } from "@/components/ui/vstack"
import React from "react"
import { Pressable } from "react-native"

/**
 * Clean, modern pressable card row. Replaces the old bordered
 * TouchableOpacity row pattern duplicated across the Sessions/Players/
 * Shuttles lists and match cards.
 */
export function ListRow({
    title,
    subtitle,
    trailing,
    onPress,
    onLongPress,
    selected
}: {
    title: string,
    subtitle?: string,
    trailing?: React.ReactNode,
    onPress?: () => void,
    onLongPress?: () => void,
    selected?: boolean
}) {
    return (
        <Pressable onPress={onPress} onLongPress={onLongPress} disabled={!onPress && !onLongPress}>
            {({ pressed }) => (
                <HStack
                    className={`items-center justify-between rounded-xl border px-4 py-3.5 shadow-soft-1 ${selected ? "border-primary-500 bg-primary-50" : "border-outline-100 bg-background-0"} ${pressed ? "bg-background-50" : ""}`}
                >
                    <VStack className="flex-1 pr-3" space="xs">
                        <Text size="md" bold className="text-typography-900">
                            {title}
                        </Text>
                        {subtitle && (
                            <Text size="sm" className="text-typography-500">
                                {subtitle}
                            </Text>
                        )}
                    </VStack>
                    {trailing && (
                        <VStack className="items-end">
                            {trailing}
                        </VStack>
                    )}
                </HStack>
            )}
        </Pressable>
    )
}
