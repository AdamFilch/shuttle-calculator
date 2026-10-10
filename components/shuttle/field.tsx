import { AlertCircleIcon, Icon } from "@/components/ui/icon"
import { Input, InputField, InputSlot } from "@/components/ui/input"
import { ComponentProps, ReactNode } from "react"
import { Text, View } from "react-native"

export type ShuttleFieldKey = "name" | "price" | "perTube" | "warn"

export function fieldForError(message: string): ShuttleFieldKey | null {
    if (message === "Name is required" || message === "A shuttle with this name already exists") return "name"
    if (message === "Tube price must be more than 0" || message === "Price must be more than 0") return "price"
    if (message === "Shuttles per tube and tubes must be at least 1") return "perTube"
    if (message === "Warn at must be a whole number of at least 1") return "warn"
    return null
}

export const inputClassName =
    "h-[44px] rounded-lg border-border bg-surface-raised data-[focus=true]:border-2 data-[focus=true]:border-primary data-[invalid=true]:border-2 data-[invalid=true]:border-error-600"

export function FieldError({ message }: { message?: string | null }) {
    if (!message) return null
    return (
        <View className="flex-row items-center gap-1" accessibilityLiveRegion="polite" accessibilityRole="alert">
            <Icon as={AlertCircleIcon} size="xs" className="text-error-600" />
            <Text className="text-caption text-error-600">{message}</Text>
        </View>
    )
}

export function ShuttleField({
    label,
    error,
    prefix,
    children,
    ...inputProps
}: {
    label: string,
    error?: string | null,
    prefix?: string,
    children?: ReactNode
} & ComponentProps<typeof InputField>) {
    return (
        <View className="gap-1">
            <Text className="text-caption text-muted">{label}</Text>
            <Input variant="outline" isInvalid={!!error} className={inputClassName}>
                {prefix ? (
                    <InputSlot className="pl-3">
                        <Text className="text-body text-muted">{prefix}</Text>
                    </InputSlot>
                ) : null}
                <InputField accessibilityLabel={label} className="text-body text-ink" {...inputProps} />
            </Input>
            <FieldError message={error} />
            {children}
        </View>
    )
}
