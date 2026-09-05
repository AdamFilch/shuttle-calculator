import { PageHeader } from "@/components/layout/PageHeader";
import { VStack } from "@/components/ui/vstack";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function InsightsSettings() {
  return (
    <SafeAreaView className="flex-1 bg-background-50">
      <PageHeader title="Insights" />
      <ScrollView className="flex-1 px-4">
        <VStack space="sm" className="pb-8 pt-2">
          <Text>Insights Page</Text>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
