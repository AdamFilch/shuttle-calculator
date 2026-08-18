import { Link, Stack } from 'expo-router';

import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <SafeAreaView className="flex-1 items-center justify-center bg-background-0 px-5">
        <VStack space="md" className="items-center">
          <Text size="xl" bold className="text-typography-900">
            This screen does not exist.
          </Text>
          <Link href="/" className="py-4">
            <Text className="text-primary-600" bold>
              Go to home screen!
            </Text>
          </Link>
        </VStack>
      </SafeAreaView>
    </>
  );
}
