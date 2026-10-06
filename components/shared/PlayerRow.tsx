import { AvatarColour } from "@/services/player"
import { ReactNode } from "react"
import { Pressable, Text, useWindowDimensions, View } from "react-native"
import { Avatar } from "./Avatar"
import { isOwed, StatusBadge } from "./StatusBadge"

export function PlayerRow({
    name,
    avatarColour,
    sessionCount,
    owedAmount,
    onPress,
    subLine,
    badge,
    accessibilityLabel,
}: {
    name: string,
    avatarColour: AvatarColour | null,
    sessionCount?: number,
    owedAmount?: number,
    onPress?: () => void,
    subLine?: string,
    badge?: ReactNode,
    accessibilityLabel?: string
}) {
    const defaultSubLine = `${sessionCount ?? 0} ${sessionCount === 1 ? "session" : "sessions"}`
    const defaultBadge = isOwed(owedAmount ?? 0) ? (
        <StatusBadge variant="owes" amount={owedAmount ?? 0} format="owes" />
    ) : (
        <StatusBadge variant="settled" />
    )

    const { fontScale } = useWindowDimensions()
    const stacked = badge !== undefined && fontScale >= 1.5

    return (
        <Pressable
            onPress={onPress}
            disabled={!onPress}
            accessibilityRole={onPress ? "button" : undefined}
            accessibilityLabel={accessibilityLabel}
        >
            {({ pressed }) => stacked ? (
                <View
                    className={`gap-2 rounded-xl border border-border-subtle px-4 py-3 ${pressed ? "bg-primary-tint" : "bg-surface-raised"}`}
                >
                    <View className="flex-row items-center gap-3">
                        <Avatar name={name} colour={avatarColour} />
                        <Text className="flex-1 text-card-title font-medium text-ink">{name}</Text>
                    </View>
                    <Text className="text-body text-muted">{subLine ?? defaultSubLine}</Text>
                    <View>{badge}</View>
                </View>
            ) : (
                <View
                    className={`flex-row items-center rounded-xl border border-border-subtle px-4 py-3 ${pressed ? "bg-primary-tint" : "bg-surface-raised"}`}
                >
                    <Avatar name={name} colour={avatarColour} />
                    <View className="flex-1 ml-3 mr-3">
                        <Text className="text-card-title font-medium text-ink" numberOfLines={1}>
                            {name}
                        </Text>
                        <Text className="text-body text-muted">
                            {subLine ?? defaultSubLine}
                        </Text>
                    </View>
                    {badge ? <View>{badge}</View> : defaultBadge}
                </View>
            )}
        </Pressable>
    )
}
