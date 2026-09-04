import { HStack } from "@/components/ui/hstack";
import { ChevronDownIcon } from "@/components/ui/icon";
import {
  Select,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicator,
  SelectDragIndicatorWrapper,
  SelectIcon,
  SelectInput,
  SelectItem,
  SelectPortal,
  SelectTrigger,
} from "@/components/ui/select";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import {
  fetchEarliestShuttleUsageDate,
  fetchShuttleUsageTimeSeries,
  ShuttleUsagePoint,
  ShuttleUsageRange,
} from "@/services/shuttle";
import { useFocusEffect } from "expo-router/react-navigation";
import { differenceInCalendarDays } from "date-fns";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { LineChart } from "react-native-gifted-charts";

const CHART_COLOR = "#0C856E";
const AXIS_LABEL_COLOR = "#8C8C8C";

const RANGE_OPTIONS: {
  value: ShuttleUsageRange;
  label: string;
  unlockAfterDays: number;
}[] = [
  { value: "1w", label: "1 Week", unlockAfterDays: 0 },
  { value: "1m", label: "1 Month", unlockAfterDays: 7 },
  { value: "6m", label: "6 Months", unlockAfterDays: 30 },
  { value: "12m", label: "12 Months", unlockAfterDays: 182 },
];

function unlockedRangeOptions(earliestUsageDate: string | null) {
  if (!earliestUsageDate) return [RANGE_OPTIONS[0]];

  const daysOfHistory = differenceInCalendarDays(
    new Date(),
    new Date(earliestUsageDate),
  );

  return RANGE_OPTIONS.filter(
    (option) => daysOfHistory >= option.unlockAfterDays,
  );
}

export function InsightsSection() {
  const [earliestUsageDate, setEarliestUsageDate] = useState<string | null>(
    null,
  );
  const [hasCheckedUsage, setHasCheckedUsage] = useState(false);
  const [selectedRange, setSelectedRange] = useState<ShuttleUsageRange>("1w");
  const [points, setPoints] = useState<ShuttleUsagePoint[]>([]);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchEarliestShuttleUsageDate().then((earliest) => {
        setEarliestUsageDate(earliest);
        setHasCheckedUsage(true);

        const unlocked = unlockedRangeOptions(earliest);
        const defaultRange = unlocked[unlocked.length - 1].value;
        setSelectedRange((prev) =>
          unlocked.some((option) => option.value === prev)
            ? prev
            : defaultRange,
        );
      });
    }, []),
  );

  useEffect(() => {
    if (!hasCheckedUsage) return;

    setLoading(true);
    fetchShuttleUsageTimeSeries(selectedRange).then((res) => {
      setPoints(res);
      setLoading(false);
    });
  }, [selectedRange, hasCheckedUsage]);

  const unlocked = unlockedRangeOptions(earliestUsageDate);
  const hasUsage = hasCheckedUsage && earliestUsageDate !== null;

  return (
    <VStack
      space="sm"
      className="mt-6 mb-4 rounded-xl border border-outline-100 bg-background-0 p-4 shadow-soft-1"
    >
      <HStack className="items-center justify-between">
        <Text size="sm" className="text-typography-500">
          Shuttles Used
        </Text>
        {unlocked.length > 1 ? (
          <Select
            selectedValue={selectedRange}
            onValueChange={(val) => setSelectedRange(val as ShuttleUsageRange)}
          >
            <SelectTrigger variant="outline" size="sm" className="w-36">
              <SelectInput className="flex-1" placeholder="Range" />
              <SelectIcon className="mr-2" as={ChevronDownIcon} />
            </SelectTrigger>
            <SelectPortal>
              <SelectBackdrop />
              <SelectContent>
                <SelectDragIndicatorWrapper>
                  <SelectDragIndicator />
                </SelectDragIndicatorWrapper>
                {unlocked.map((option) => (
                  <SelectItem
                    key={option.value}
                    label={option.label}
                    value={option.value}
                  />
                ))}
              </SelectContent>
            </SelectPortal>
          </Select>
        ) : (
          <Text size="sm" bold className="text-typography-700">
            1 Week
          </Text>
        )}
      </HStack>

      {!hasUsage ? (
        <Text size="sm" className="text-typography-500 py-8 text-center">
          No shuttle usage yet
        </Text>
      ) : (
        <View className="relative">
          {loading && (
            <View className="absolute inset-0 z-10 items-center justify-center bg-background-0/70">
              <ActivityIndicator color={CHART_COLOR} />
            </View>
          )}
          <LineChart
            data={points.map((point) => ({
              value: point.value,
              label: point.label,
            }))}
            color={CHART_COLOR}
            dataPointsColor={CHART_COLOR}
            thickness={2}
            curved
            hideRules
            noOfSections={4}
            initialSpacing={16}
            yAxisTextStyle={{ color: AXIS_LABEL_COLOR }}
            xAxisLabelTextStyle={{ color: AXIS_LABEL_COLOR, fontSize: 10 }}
          />
        </View>
      )}
    </VStack>
  );
}
