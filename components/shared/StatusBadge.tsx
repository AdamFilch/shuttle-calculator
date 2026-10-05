import { formatRM } from "@/services/money-display"
import { Text, View } from "react-native"

export type StatusBadgeProps =
    | { variant: "settled" }
    | { variant: "open" }
    | { variant: "owes", amount: number, format?: "owes" | "due" }

const STYLES = {
    settled: { container: "bg-settled-tint", text: "text-settled" },
    open: { container: "bg-primary-tint", text: "text-primary" },
    owes: { container: "bg-clay-tint", text: "text-clay" },
}

function labelFor(props: StatusBadgeProps): string {
    switch (props.variant) {
        case "settled":
            return "Settled"
        case "open":
            return "Open session"
        case "owes":
            return props.format === "due" ? `${formatRM(props.amount)} due` : `Owes ${formatRM(props.amount)}`
    }
}

export function StatusBadge(props: StatusBadgeProps) {
    const style = STYLES[props.variant]

    return (
        <View className={`self-start rounded-full px-2.5 py-1 ${style.container}`}>
            <Text className={`text-badge font-medium ${style.text}`}>
                {labelFor(props)}
            </Text>
        </View>
    )
}

export function isOwed(amount: number): boolean {
    return Math.round(amount * 100) > 0
}
