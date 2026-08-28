import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { ShuttleWithInventory } from "@/services/shuttle";
import { Pressable } from "react-native";

function stockStatus(remaining: number): "error" | "warning" | undefined {
  if (remaining <= 1) return "error";
  if (remaining === 2) return "warning";
  return undefined;
}

/**
 * Grid box for a shuttle batch. Long-press opens the edit/settings dialog
 * (rename, edit price/shuttle, purchase history, buy again).
 */
export function ShuttleCard({
  shuttle,
  onLongPress,
}: {
  shuttle: ShuttleWithInventory;
  onLongPress: () => void;
}) {
  const status = stockStatus(shuttle.remaining);
  const statusClassName =
    status === "error"
      ? "border-error-300 bg-error-100"
      : status === "warning"
        ? "border-warning-300 bg-warning-100"
        : "border-outline-100 bg-background-0";
  const pricePerShuttle =
    Number(shuttle.total_price) / Number(shuttle.num_of_shuttles);

  return (
    <Pressable onLongPress={onLongPress} className="w-[48%]">
      {({ pressed }) => (
        <VStack
          space="xs"
          className={`aspect-square items-center justify-center rounded-xl border px-3 py-4 shadow-soft-1 ${statusClassName} ${pressed ? "bg-background-50" : ""}`}
        >
          {/* Add a picture of the box here */}
          <Text size="xl" bold className="text-typography-900">
            {shuttle.name}
          </Text>
          <Text size="sm" className="text-typography-500">
            ${pricePerShuttle.toFixed(2)}/Shuttle
          </Text>
          <Text size="sm" className="text-typography-500">
            {shuttle.remaining} Remaining
          </Text>
        </VStack>
      )}
    </Pressable>
  );
}
