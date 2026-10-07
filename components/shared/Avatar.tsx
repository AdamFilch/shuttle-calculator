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

const SIZE_CLASS = {
    md: { container: "h-9 w-9", text: "text-badge" },
    lg: { container: "h-14 w-14", text: "text-[18px] leading-[22px]" },
    xl: { container: "h-[60px] w-[60px]", text: "text-[20px] leading-[24px]" },
}

export function Avatar({
    name,
    colour,
    size = "md",
}: {
    name: string,
    colour: AvatarColour | null,
    size?: keyof typeof SIZE_CLASS
}) {
    const fill = colour ?? "muted"
    const sizing = SIZE_CLASS[size]

    return (
        <View className={`${sizing.container} items-center justify-center rounded-full ${FILL_CLASS[fill]}`}>
            <Text className={`${sizing.text} font-medium ${fill === "sage" ? "text-on-sage" : "text-surface"}`} maxFontSizeMultiplier={1.2}>
                {getInitials(name)}
            </Text>
        </View>
    )
}
