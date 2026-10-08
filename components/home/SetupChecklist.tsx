import { designTokens } from "@/components/ui/gluestack-ui-provider/config"
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons"
import { Pressable, Text, View } from "react-native"

export function SetupChecklist({
    playerCount,
    shuttleTypeCount,
    onAddPlayers,
    onAddShuttles,
    onStartSession,
}: {
    playerCount: number,
    shuttleTypeCount: number,
    onAddPlayers: () => void,
    onAddShuttles: () => void,
    onStartSession: () => void
}) {
    const steps = [
        {
            title: "Add your players",
            sub: "Everyone who plays at your club",
            doneSub: `${playerCount} ${playerCount === 1 ? "player" : "players"} added`,
            done: playerCount > 0,
            onPress: onAddPlayers,
        },
        {
            title: "Add the shuttles you buy",
            sub: "Name, tube price and how many in a tube",
            doneSub: `${shuttleTypeCount} shuttle ${shuttleTypeCount === 1 ? "type" : "types"} added`,
            done: shuttleTypeCount > 0,
            onPress: onAddShuttles,
        },
        {
            title: "Start your first session",
            sub: "Book courts and record matches as you play",
            doneSub: "",
            done: false,
            onPress: onStartSession,
        },
    ]
    const next = steps.findIndex((step) => !step.done)

    return (
        <View className="overflow-hidden rounded-xl border border-border-subtle bg-surface-raised">
            {steps.map((step, index) => (
                <Pressable
                    key={step.title}
                    onPress={step.onPress}
                    accessibilityRole="button"
                    accessibilityLabel={`Step ${index + 1} of 3, ${step.title}, ${step.done ? "done" : "not done"}`}
                    testID={`setup-step-${index + 1}`}
                >
                    {({ pressed }) => (
                        <View className={`min-h-14 flex-row items-center gap-3 px-4 py-3 ${index > 0 ? "border-t border-border-subtle" : ""} ${pressed ? "bg-primary-tint" : ""}`}>
                            {step.done ? (
                                <View className="h-7 w-7 items-center justify-center rounded-full bg-settled-tint">
                                    <MaterialCommunityIcons name="check" size={16} color={designTokens.settled} />
                                </View>
                            ) : (
                                <View className={`h-7 w-7 items-center justify-center rounded-full ${index === next ? "bg-primary" : "border border-border"}`}>
                                    <Text className={`text-badge font-semibold ${index === next ? "text-surface" : "text-muted"}`}>{index + 1}</Text>
                                </View>
                            )}
                            <View className="flex-1">
                                <Text className="text-card-title font-medium text-ink">{step.title}</Text>
                                <Text className="text-body text-muted">{step.done ? step.doneSub : step.sub}</Text>
                            </View>
                            <MaterialCommunityIcons name="chevron-right" size={20} color={designTokens.muted} />
                        </View>
                    )}
                </Pressable>
            ))}
        </View>
    )
}
