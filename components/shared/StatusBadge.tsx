import { formatRM } from "@/services/money-display"
import { format } from "date-fns"
import { Text, View } from "react-native"

export type StatusBadgeProps =
    | { variant: "settled" }
    | { variant: "open" }
    | { variant: "owes", amount: number, format?: "owes" | "due" | "amount" }
    | { variant: "estimate", amount: number }
    | { variant: "waived" }
    | { variant: "stale", since: string }

const STYLES = {
    settled: { container: "bg-settled-tint", text: "text-settled" },
    open: { container: "bg-primary-tint", text: "text-primary" },
    owes: { container: "bg-clay-tint", text: "text-clay" },
    estimate: { container: "bg-clay-tint", text: "text-clay-strong" },
    waived: { container: "bg-neutral-tint", text: "text-muted" },
    stale: { container: "bg-clay-tint", text: "text-clay-strong" },
}

function labelFor(props: StatusBadgeProps): string {
    switch (props.variant) {
        case "settled":
            return "Settled"
        case "open":
            return "Open session"
        case "owes":
            if (props.format === "due") return `${formatRM(props.amount)} due`
            if (props.format === "amount") return formatRM(props.amount)
            return `Owes ${formatRM(props.amount)}`
        case "estimate":
            return `≈ ${formatRM(props.amount)}`
        case "waived":
            return "Waived"
        case "stale":
            return `Still open since ${format(new Date(props.since), "d MMM")}`
    }
}

export function StatusBadge(props: StatusBadgeProps) {
    const style = STYLES[props.variant]

    return (
        <View
            className={`self-start rounded-full px-2.5 py-1 ${style.container}`}
            accessible={props.variant === "estimate" ? true : undefined}
            accessibilityLabel={props.variant === "estimate" ? `about ${formatRM(props.amount)}` : undefined}
        >
            <Text className={`text-badge font-medium ${style.text}`} style={props.variant === "estimate" ? { fontVariant: ["tabular-nums"] } : undefined}>
                {labelFor(props)}
            </Text>
        </View>
    )
}

export function isOwed(amount: number): boolean {
    return Math.round(amount * 100) > 0
}
