import { PageHeader } from "@/components/layout/PageHeader";
import { Button, ButtonText } from "@/components/ui/button";
import { VStack } from "@/components/ui/vstack";
import { debugDatabase, dropDatabase, setupDatabase } from "@/services/database";
import { seedDatabase } from "@/services/seed";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";


export default function SettingsPage() {
    return (
        <SafeAreaView className="flex-1 bg-background-50">
            <PageHeader title="Settings" />
            <ScrollView className="flex-1 px-4">
                <VStack space="sm" className="pb-8 pt-2">
                    <Button
                        variant="outline"
                        action="secondary"
                        onPress={async () => {
                            await debugDatabase()
                        }}
                    >
                        <ButtonText>Check Tables</ButtonText>
                    </Button>
                    <Button
                        action="negative"
                        onPress={async () => {
                            await dropDatabase()
                            await setupDatabase()
                        }}
                    >
                        <ButtonText>Reset Database</ButtonText>
                    </Button>
                    {__DEV__ && (
                        <Button
                            variant="outline"
                            action="secondary"
                            onPress={async () => {
                                await dropDatabase()
                                await setupDatabase()
                                await seedDatabase()
                            }}
                        >
                            <ButtonText>Reset & Load Sample Data</ButtonText>
                        </Button>
                    )}
                </VStack>
            </ScrollView>
        </SafeAreaView>
    )
}
