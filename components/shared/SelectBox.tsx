import { CheckIcon, Icon, RemoveIcon } from "@/components/ui/icon"
import { Pressable, View } from "react-native"

export type SelectBoxState = boolean | "mixed"

const TONE_CLASS = {
    sage: { box: "border-sage bg-sage", icon: "text-on-sage" },
    clay: { box: "border-clay bg-clay", icon: "text-surface" },
}

export function SelectBoxVisual({
    checked,
    tone,
    disabled = false,
}: {
    checked: SelectBoxState,
    tone: "sage" | "clay",
    disabled?: boolean
}) {
    const isOn = checked !== false
    const style = TONE_CLASS[tone]
    const boxClass = disabled
        ? "border-disabled bg-disabled"
        : isOn
            ? style.box
            : "border-border bg-surface-raised"

    return (
        <View className="h-11 w-11 items-center justify-center" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View className={`h-6 w-6 items-center justify-center rounded-md border-[1.5px] ${boxClass}`}>
                {!disabled && isOn ? (
                    <Icon as={checked === "mixed" ? RemoveIcon : CheckIcon} size="sm" className={style.icon} />
                ) : null}
            </View>
        </View>
    )
}

export function SelectBox({
    checked,
    tone,
    disabled = false,
    onPress,
    accessibilityLabel,
    testID,
}: {
    checked: SelectBoxState,
    tone: "sage" | "clay",
    disabled?: boolean,
    onPress: () => void,
    accessibilityLabel: string,
    testID?: string
}) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="checkbox"
            accessibilityLabel={accessibilityLabel}
            accessibilityState={{ checked, disabled }}
            testID={testID}
        >
            <SelectBoxVisual checked={checked} tone={tone} disabled={disabled} />
        </Pressable>
    )
}
