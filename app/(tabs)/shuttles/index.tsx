import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/shared/Skeleton";
import { StatTile } from "@/components/shared/StatTile";
import { EditShuttleModal } from "@/components/shuttle/editShuttleModal";
import { AddShuttleModal } from "@/components/shuttle/modal";
import { ShuttleStockRow } from "@/components/shuttle/ShuttleStockRow";
import { ShuttlesPerSessionChart } from "@/components/shuttle/ShuttlesPerSessionChart";
import { notifyShuttleStockChanged } from "@/components/shuttle/stockSignal";
import { designTokens } from "@/components/ui/gluestack-ui-provider/config";
import {
  fetchShuttlesPerSession,
  fetchShuttleStock,
  ShuttleStock,
  ShuttleStockType,
} from "@/services/shuttle";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useFocusEffect } from "expo-router/react-navigation";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ShuttlesData = {
  stock: ShuttleStock;
  perSession: { date: string; count: number }[];
};

const feather = (
  <MaterialCommunityIcons name="feather" size={14} color={designTokens.clay} />
);

function shuttlesLeftSubLine({ totals }: ShuttleStock) {
  if (totals.out_count > 0 || totals.low_count > 0) {
    return [
      totals.out_count > 0 ? `${totals.out_count} out` : null,
      totals.low_count > 0 ? `${totals.low_count} low` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  }
  return `Across ${totals.type_count} ${totals.type_count === 1 ? "type" : "types"}`;
}

export default function ShuttlesScreen() {
  const [data, setData] = useState<ShuttlesData | "error">();
  const [refreshing, setRefreshing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<ShuttleStockType | null>(null);

  const reload = useCallback(
    () =>
      Promise.all([fetchShuttleStock(), fetchShuttlesPerSession(8)])
        .then(([stock, perSession]) => setData({ stock, perSession }))
        .catch(() => setData("error"))
        .finally(notifyShuttleStockChanged),
    [],
  );

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    reload().finally(() => setRefreshing(false));
  };

  const isEmpty = data !== undefined && data !== "error" && data.stock.totals.type_count === 0;

  const body = () => {
    if (data === undefined) {
      return (
        <View className="gap-4" accessibilityLabel="Loading">
          <View className="flex-row gap-2">
            <Skeleton className="h-20 flex-1" />
            <Skeleton className="h-20 flex-1" />
          </View>
          <View className="gap-2">
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
            <Skeleton className="h-14" />
          </View>
        </View>
      );
    }
    if (data === "error") {
      return (
        <Text className="text-body text-muted py-2" testID="shuttles-error">
          Couldn&apos;t load. Pull to refresh.
        </Text>
      );
    }
    const { stock, perSession } = data;
    if (isEmpty) {
      return (
        <View className="gap-3">
          <EmptyState
            icon={<MaterialCommunityIcons name="feather" size={28} color={designTokens.clay} />}
            title="No shuttles yet"
            description="Add the shuttles you buy to track how many are left and split their cost fairly."
          />
          <Pressable
            onPress={() => setAddOpen(true)}
            accessibilityRole="button"
            testID="add-first-shuttle"
            className="min-h-[44px] items-center justify-center rounded-lg bg-primary active:opacity-85"
          >
            <Text className="text-body font-medium text-surface">Add your first shuttle</Text>
          </Pressable>
        </View>
      );
    }
    const { totals } = stock;
    const warn = totals.out_count > 0 || totals.low_count > 0;
    return (
      <View className="gap-4">
        <View className="flex-row flex-wrap gap-2">
          <StatTile
            label="Shuttles left"
            value={String(totals.total_remaining)}
            subLine={shuttlesLeftSubLine(stock)}
            subLineTone={warn ? "warn" : "muted"}
            testID="tile-shuttles-left"
          />
          <StatTile
            label="Avg per session"
            icon={feather}
            value={totals.club_avg_per_session === null ? "–" : totals.club_avg_per_session.toFixed(1)}
            subLine={
              totals.club_avg_per_session === null
                ? "After your first session"
                : totals.window_sessions === 1
                  ? "Last session"
                  : `Last ${totals.window_sessions} sessions`
            }
            testID="tile-avg"
          />
        </View>
        <View className="gap-2">
          <Text className="text-section-label font-medium uppercase text-muted" accessibilityRole="header">
            Stock
          </Text>
          <View className="overflow-hidden rounded-xl border border-border-subtle bg-surface-raised" testID="stock-list">
            {stock.types.map((type, index) => {
              const used = type.used_since_last_purchase;
              const total = Math.max(type.remaining, 0) + used;
              return (
                <View key={type.shuttle_id} className={index > 0 ? "border-t border-border-subtle" : ""}>
                  <ShuttleStockRow
                    name={type.name}
                    remaining={type.remaining}
                    runwaySessions={type.runway_sessions}
                    meterFraction={total > 0 ? Math.max(type.remaining, 0) / total : 0}
                    status={type.status}
                    warnAt={
                      type.warn_at !== null && type.warn_unit !== null
                        ? { value: type.warn_at, unit: type.warn_unit }
                        : undefined
                    }
                    onPress={() => setEditing(type)}
                  />
                </View>
              );
            })}
          </View>
        </View>
        <ShuttlesPerSessionChart points={perSession} />
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-surface">
      <PageHeader
        title="Shuttles"
        action={
          data === undefined || isEmpty
            ? undefined
            : { label: "Add shuttle", onPress: () => setAddOpen(true) }
        }
      />
      <ScrollView
        className="flex-1 px-4"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {body()}
        <View className="h-24" />
      </ScrollView>

      <AddShuttleModal
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          reload();
        }}
      />

      <EditShuttleModal
        open={editing !== null}
        shuttle={editing}
        clubAvg={data && data !== "error" ? data.stock.totals.club_avg_per_session : null}
        onClose={() => {
          setEditing(null);
          reload();
        }}
      />
    </SafeAreaView>
  );
}
