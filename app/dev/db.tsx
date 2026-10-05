import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { dropDatabase, setupDatabase } from '@/services/database';
import { seedDatabase } from '@/services/seed';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

type Action = 'reset' | 'seed' | 'fresh'

export default function DevDatabaseScreen() {
  const router = useRouter()
  const { action, scenario } = useLocalSearchParams<{ action?: Action, scenario?: string }>()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!__DEV__) {
      router.replace('/')
      return
    }

    const run = async () => {
      const scenarioName = scenario || 'default'
      try {
        if (action !== 'reset' && action !== 'seed' && action !== 'fresh') {
          throw new Error(`Unknown action "${action}". Use reset, seed or fresh.`)
        }
        if (action === 'reset' || action === 'fresh') {
          await dropDatabase()
          await setupDatabase()
        }
        if (action === 'seed' || action === 'fresh') {
          await seedDatabase(scenarioName)
        }
        console.log(`[dev-db] ${action}${action === 'reset' ? '' : ` ${scenarioName}`} done`)
        router.replace('/')
      } catch (e: any) {
        console.error(`[dev-db] ${action} failed: ${e?.message ?? e}`)
        setError(e?.message ?? String(e))
      }
    }

    run()
  }, [action, scenario, router])

  return (
    <>
      <Stack.Screen options={{ title: 'Dev Database' }} />
      <SafeAreaView className="flex-1 items-center justify-center bg-background-0 px-5">
        <VStack space="md" className="items-center">
          {error ? (
            <Text testID="dev-db-error" className="text-error-600" bold>
              {error}
            </Text>
          ) : (
            <Text testID="dev-db-running" className="text-typography-700">
              Running {action}…
            </Text>
          )}
        </VStack>
      </SafeAreaView>
    </>
  );
}
