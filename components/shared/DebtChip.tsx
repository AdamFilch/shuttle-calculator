import { Text } from "@/components/ui/text"
import { View } from "react-native"

/**
 * Small pill/badge showing a formatted dollar amount. Red-tinted when a
 * player owes money (amount > 0), neutral/green when settled (amount <= 0).
 * The one consistent motif used everywhere a dollar amount appears
 * (player rows, player detail, home summary, etc).
 */
export function DebtChip({
    amount
}: {
    amount: number
}) {
    const isOwed = amount > 0
    const formatted = `$${Math.abs(amount).toFixed(2)}`

    return (
        <View
            className={
                isOwed
                    ? "rounded-full bg-error-100 px-3 py-1"
                    : "rounded-full bg-success-100 px-3 py-1"
            }
        >
            <Text
                size="sm"
                bold
                className={isOwed ? "text-error-700" : "text-success-700"}
            >
                {formatted}
            </Text>
        </View>
    )
}
