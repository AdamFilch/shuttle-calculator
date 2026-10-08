import { Pressable, Text, View } from "react-native"

const SELECTED_SHADOW = {
    shadowColor: "#262626",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
}

export function SegmentedControl<T extends string>({
    options,
    value,
    onChange,
    accessibilityLabel,
    testID,
}: {
    options: { value: T, label: string }[],
    value: T,
    onChange: (value: T) => void,
    accessibilityLabel: string,
    testID?: string
}) {
    return (
        <View
            accessibilityRole="radiogroup"
            accessibilityLabel={accessibilityLabel}
            className="h-[44px] flex-row rounded-lg border border-border-subtle bg-surface p-0.5"
        >
            {options.map((option) => {
                const active = option.value === value
                return (
                    <Pressable
                        key={option.value}
                        onPress={() => onChange(option.value)}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: active }}
                        testID={testID ? `${testID}-${option.value}` : undefined}
                        className={`flex-1 items-center justify-center rounded-md ${active ? "bg-surface-raised" : ""}`}
                        style={active ? SELECTED_SHADOW : undefined}
                    >
                        <Text className={`text-body font-medium ${active ? "text-ink" : "text-muted"}`}>
                            {option.label}
                        </Text>
                    </Pressable>
                )
            })}
        </View>
    )
}
