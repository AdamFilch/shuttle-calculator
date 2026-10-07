import { AvatarColour } from "@/services/player"
import { Text, View } from "react-native"

const FILL_CLASS: Record<AvatarColour, string> = {
    primary: "bg-primary",
    clay: "bg-clay",
    sage: "bg-sage",
    muted: "bg-muted",
}

export function getInitials(name: string): string {
    return Array.from(name.trim()).slice(0, 2).join("").toUpperCase()
}

export function Avatar({
    name,
    colour,
}: {
    name: string,
    colour: AvatarColour | null
}) {
    const fill = colour ?? "muted"

    return (
        <View className={`h-9 w-9 items-center justify-center rounded-full ${FILL_CLASS[fill]}`}>
            <Text className={`text-badge font-medium ${fill === "sage" ? "text-on-sage" : "text-surface"}`} maxFontSizeMultiplier={1.2}>
                {getInitials(name)}
            </Text>
        </View>
    )
}
