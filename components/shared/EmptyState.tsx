import { ReactNode } from "react"
import { Text, View } from "react-native"

export function EmptyState({
    icon,
    title,
    description,
}: {
    icon?: ReactNode,
    title: string,
    description?: string
}) {
    return (
        <View
            accessible
            accessibilityLabel={description ? `${title}. ${description}` : title}
            className="items-center gap-2 rounded-xl border border-dashed border-border-dashed bg-surface-raised px-5 py-6"
        >
            {icon}
            <Text className="text-center text-card-title font-medium text-ink">{title}</Text>
            {description ? (
                <Text className="text-center text-caption text-muted">{description}</Text>
            ) : null}
        </View>
    )
}
