import { ActionSheet } from "@/components/shared/ActionSheet"
import { designTokens } from "@/components/ui/gluestack-ui-provider/config"
import { ChevronRightIcon, Icon, TrashIcon } from "@/components/ui/icon"
import { formatRM } from "@/services/money-display"
import { ReactNode } from "react"
import { Pressable, Text, View } from "react-native"
import Svg, { Path, Rect } from "react-native-svg"

export function CourtGlyph({ size = 20 }: { size?: number }) {
    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={designTokens.primary} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
            <Rect x={4} y={3} width={16} height={18} rx={1.5} />
            <Path d="M4 12h16M12 3v6M12 15v6M4 8h16M4 16h16" />
        </Svg>
    )
}

function MenuRow({
    icon,
    title,
    subLine,
    onPress,
    disabled = false,
    tone = "default",
    testID,
}: {
    icon: ReactNode,
    title: string,
    subLine: string,
    onPress: () => void,
    disabled?: boolean,
    tone?: "default" | "destructive",
    testID?: string
}) {
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={`${title}, ${subLine}`}
            accessibilityState={{ disabled }}
            testID={testID}
        >
            {({ pressed }) => (
                <View
                    className={`min-h-14 flex-row items-center gap-3 rounded-xl border border-border-subtle px-3.5 py-3 ${pressed ? "bg-primary-tint" : "bg-surface-raised"} ${disabled ? "opacity-60" : ""}`}
                >
                    <View
                        className={`h-9 w-9 items-center justify-center rounded-lg ${tone === "destructive" ? "bg-error-50" : pressed ? "bg-surface-raised" : "bg-primary-tint"}`}
                    >
                        {icon}
                    </View>
                    <View className="flex-1 gap-0.5">
                        <Text className={`text-card-title font-medium ${tone === "destructive" ? "text-error-600" : "text-ink"}`}>
                            {title}
                        </Text>
                        <Text className="text-body text-muted">{subLine}</Text>
                    </View>
                    {!disabled ? <Icon as={ChevronRightIcon} size="md" className="text-muted" /> : null}
                </View>
            )}
        </Pressable>
    )
}

export function SessionOptionsSheet({
    isOpen,
    onClose,
    courtCount,
    courtTotal,
    canDelete,
    onBookCourts,
    onDelete,
}: {
    isOpen: boolean,
    onClose: () => void,
    courtCount: number,
    courtTotal: number,
    canDelete: boolean,
    onBookCourts: () => void,
    onDelete: () => void
}) {
    const courtsSubLine = courtCount === 0
        ? "No courts booked yet"
        : `${courtCount} ${courtCount === 1 ? "court" : "courts"} booked · ${formatRM(courtTotal)}`

    return (
        <ActionSheet isOpen={isOpen} onClose={onClose} title="Session options" testID="session-options-sheet">
            <MenuRow
                icon={<CourtGlyph />}
                title="Book courts"
                subLine={courtsSubLine}
                onPress={onBookCourts}
                testID="session-options-book-courts"
            />
            <View className="h-px bg-border-subtle" />
            <MenuRow
                icon={<Icon as={TrashIcon} size="md" className="text-error-600" />}
                title="Delete session"
                subLine={canDelete ? "Remove this session and its court bookings" : "Sessions with matches can't be deleted"}
                onPress={onDelete}
                disabled={!canDelete}
                tone="destructive"
                testID="session-options-delete"
            />
            <Pressable
                onPress={onClose}
                accessibilityRole="button"
                className="min-h-11 items-center justify-center rounded-lg border border-border bg-surface-raised active:opacity-85"
            >
                <Text className="text-body font-medium text-ink">Cancel</Text>
            </Pressable>
        </ActionSheet>
    )
}
