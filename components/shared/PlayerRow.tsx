import { AvatarColour } from "@/services/player"
import { Pressable, Text, View } from "react-native"
import { Avatar } from "./Avatar"
import { isOwed, StatusBadge } from "./StatusBadge"

export function PlayerRow({
    name,
    avatarColour,
    sessionCount,
    owedAmount,
    onPress,
}: {
    name: string,
    avatarColour: AvatarColour | null,
    sessionCount: number,
    owedAmount: number,
    onPress?: () => void
}) {
    return (
        <Pressable onPress={onPress} disabled={!onPress}>
            {({ pressed }) => (
                <View
                    className={`flex-row items-center rounded-xl border border-border-subtle px-4 py-3 ${pressed ? "bg-primary-tint" : "bg-surface-raised"}`}
                >
                    <Avatar name={name} colour={avatarColour} />
                    <View className="flex-1 ml-3 mr-3">
                        <Text className="text-card-title font-medium text-ink" numberOfLines={1}>
                            {name}
                        </Text>
                        <Text className="text-body text-muted">
                            {sessionCount} {sessionCount === 1 ? "session" : "sessions"}
                        </Text>
                    </View>
                    {isOwed(owedAmount) ? (
                        <StatusBadge variant="owes" amount={owedAmount} format="owes" />
                    ) : (
                        <StatusBadge variant="settled" />
                    )}
                </View>
            )}
        </Pressable>
    )
}
