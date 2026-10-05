import { Button, ButtonIcon, ButtonText } from "@/components/ui/button";
import { HStack } from "@/components/ui/hstack";
import { AddIcon } from "@/components/ui/icon";
import { VStack } from "@/components/ui/vstack";
import { Text } from "react-native";

export type PageHeaderAction = {
  label: string;
  onPress: () => void;
  variant?: "primary" | "negative";
  isDisabled?: boolean;
};

/**
 * Screen-level header: title/subtitle on the left, one primary action
 * pinned top-right. Meant to be rendered above a screen's scrollable
 * content (e.g. above a ScrollView/FlatList), not inside it -- it does
 * not scroll away.
 */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: PageHeaderAction;
}) {
  const isNegative = action?.variant === "negative";

  return (
    <HStack className="items-center justify-between px-4 pt-4 pb-3 bg-surface">
      <VStack className="flex-1 pr-3" space="xs">
        <Text className="text-screen-title font-semibold text-ink">
          {title}
        </Text>
        {subtitle && (
          <Text className="text-body text-muted">
            {subtitle}
          </Text>
        )}
      </VStack>
      {action && (
        <Button
          size="sm"
          action={isNegative ? "negative" : undefined}
          isDisabled={action.isDisabled}
          onPress={action.onPress}
          className={isNegative ? "rounded-lg" : "rounded-lg bg-primary data-[active=true]:opacity-85"}
        >
          {!isNegative && <ButtonIcon as={AddIcon} className="text-surface" />}
          <ButtonText className={isNegative ? undefined : "text-surface font-medium"}>
            {action.label}
          </ButtonText>
        </Button>
      )}
    </HStack>
  );
}
