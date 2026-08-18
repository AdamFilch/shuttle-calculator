import { Button, ButtonText } from "@/components/ui/button"
import { Heading } from "@/components/ui/heading"
import { HStack } from "@/components/ui/hstack"
import { Text } from "@/components/ui/text"
import { VStack } from "@/components/ui/vstack"

export type PageHeaderAction = {
    label: string,
    onPress: () => void
}

/**
 * Screen-level header: title/subtitle on the left, one primary action
 * pinned top-right. Meant to be rendered above a screen's scrollable
 * content (e.g. above a ScrollView/FlatList), not inside it -- it does
 * not scroll away.
 */
export function PageHeader({
    title,
    subtitle,
    action
}: {
    title: string,
    subtitle?: string,
    action?: PageHeaderAction
}) {
    return (
        <HStack className="items-start justify-between px-4 pt-4 pb-3 bg-background-0">
            <VStack className="flex-1 pr-3" space="xs">
                <Heading size="xl" className="text-typography-900">
                    {title}
                </Heading>
                {subtitle && (
                    <Text size="sm" className="text-typography-500">
                        {subtitle}
                    </Text>
                )}
            </VStack>
            {action && (
                <Button size="sm" onPress={action.onPress}>
                    <ButtonText>{action.label}</ButtonText>
                </Button>
            )}
        </HStack>
    )
}
