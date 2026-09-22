import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import "../global.css";

import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    return null;
  }

  return (
    <GluestackUIProvider mode="light">
      <SafeAreaView className="flex-1 bg-background-light">
        <VStack className="flex-1 items-center justify-center px-8" space="sm">
          <Heading size="xl" className="text-typography-900 text-center">
            Not available on Web
          </Heading>
          <Text size="md" className="text-typography-500 text-center">
            Web support is coming soon — please use the mobile app for now.
          </Text>
        </VStack>
      </SafeAreaView>
      <StatusBar style="auto" />
    </GluestackUIProvider>
  );
}
